"""Treino e validação do classificador PDAC × não-PDAC com biomarcadores urinários.

Protocolo (pensado para métricas honestas, não infladas):
1. Separação estratificada 75/25 (desenvolvimento/teste) por diagnóstico e estádio.
   O teste é usado uma única vez, no final.
2. No desenvolvimento: busca de hiperparâmetros com validação cruzada (VC) 5×3 repetida
   para cada família de modelo, mais um ensemble de votação suave dos 3 melhores.
3. O melhor AUROC médio na VC vence; ele é calibrado (sigmoide) e os limiares
   operacionais são escolhidos nas previsões fora-da-dobra do desenvolvimento.
4. Avaliação única no teste: AUROC (IC 95% bootstrap), AUPRC, Brier, calibração,
   sensibilidade/especificidade nos limiares e por estádio.
5. Robustez: validação por coorte (Cohort1 -> Cohort2), ablação sem idade e linhas de base
   (LYVE1 isolado, regressão logística simples tipo PancRISK, CA19-9 >= 37 U/mL).
6. O modelo publicado é reajustado com todas as amostras; os limiares são recalculados
   nas previsões fora-da-dobra de todas as amostras.

Nunca entram como variável (vazamento de rótulo): centro de coleta e coorte (quase
determinam o diagnóstico neste estudo), estádio e diagnóstico benigno (derivados do
rótulo) e a *ausência* de CA19-9/REG1A (faltam mais em controles do que em PDAC).

Uso: python -m pancreas.treino_biomarcadores [--rapido]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import (
    ExtraTreesClassifier,
    HistGradientBoostingClassifier,
    RandomForestClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.model_selection import (
    GridSearchCV,
    RandomizedSearchCV,
    RepeatedStratifiedKFold,
    StratifiedKFold,
    cross_val_predict,
    cross_validate,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures, SplineTransformer, StandardScaler
from sklearn.svm import SVC

from . import metricas as M
from .config import MODELOS, RELATORIOS, SEMENTE, garantir_pastas
from .dados import carregar_debernardi
from .features import FEATURES_PAINEL, FEATURES_PAINEL_CA199, EngenhariaBiomarcadores

NOMES = {
    "regressao_logistica": "Regressão logística",
    "rl_splines": "Regressão logística com splines",
    "rl_interacoes": "Regressão logística com interações",
    "svm_rbf": "SVM (kernel RBF)",
    "random_forest": "Random Forest",
    "extra_trees": "Extra Trees",
    "gradient_boosting": "Gradient Boosting (histograma)",
    "ensemble": "Ensemble (votação suave dos 3 melhores)",
}

PONTOS_OPERACIONAIS = {
    "triagem": "sensibilidade >= 90% (descartar com mais segurança)",
    "equilibrio": "índice de Youden máximo",
    "confirmacao": "especificidade >= 95% (priorizar investigação)",
}

ESCORES = {"auroc": "roc_auc", "brier": "neg_brier_score", "auprc": "average_precision"}


def candidatos(rapido: bool) -> dict[str, tuple[Pipeline, dict, int | None]]:
    """Famílias de modelo: (pipeline, espaço de busca, n_iter — None = grade completa)."""
    n_iter = 6 if rapido else 25
    arvores = {
        "eng__razoes_creatinina": [True, False],
        "modelo__max_depth": [None, 3, 5, 8],
        "modelo__min_samples_leaf": [1, 3, 5, 10],
        "modelo__max_features": ["sqrt", 0.5, 1.0],
    }
    return {
        "regressao_logistica": (
            Pipeline([("eng", EngenhariaBiomarcadores()), ("escala", StandardScaler()),
                      ("modelo", LogisticRegression(max_iter=5000))]),
            {"modelo__C": [0.01, 0.03, 0.1, 0.3, 1, 3, 10]},
            None,
        ),
        "rl_splines": (
            Pipeline([("eng", EngenhariaBiomarcadores()), ("escala", StandardScaler()),
                      ("splines", SplineTransformer(degree=3)),
                      ("modelo", LogisticRegression(max_iter=5000))]),
            {"splines__n_knots": [3, 4, 5], "modelo__C": [0.01, 0.03, 0.1, 0.3, 1]},
            None,
        ),
        "rl_interacoes": (
            Pipeline([("eng", EngenhariaBiomarcadores()), ("escala", StandardScaler()),
                      ("poli", PolynomialFeatures(degree=2, include_bias=False)),
                      ("escala2", StandardScaler()),
                      ("modelo", LogisticRegression(max_iter=5000))]),
            {"modelo__C": [0.003, 0.01, 0.03, 0.1, 0.3, 1]},
            None,
        ),
        "svm_rbf": (
            # SVC não produz probabilidades nativas: a calibração sigmoide interna as fornece
            # (necessárias para Brier e para a votação suave do ensemble).
            Pipeline([("eng", EngenhariaBiomarcadores()), ("escala", StandardScaler()),
                      ("modelo", CalibratedClassifierCV(SVC(), method="sigmoid", ensemble=False))]),
            {"modelo__estimator__C": [0.1, 0.3, 1, 3, 10],
             "modelo__estimator__gamma": ["scale", 0.03, 0.1, 0.3]},
            None,
        ),
        "random_forest": (
            Pipeline([("eng", EngenhariaBiomarcadores()),
                      ("modelo", RandomForestClassifier(n_estimators=400, random_state=SEMENTE))]),
            arvores,
            n_iter,
        ),
        "extra_trees": (
            Pipeline([("eng", EngenhariaBiomarcadores()),
                      ("modelo", ExtraTreesClassifier(n_estimators=400, random_state=SEMENTE))]),
            arvores,
            n_iter,
        ),
        "gradient_boosting": (
            Pipeline([("eng", EngenhariaBiomarcadores()),
                      ("modelo", HistGradientBoostingClassifier(random_state=SEMENTE, early_stopping=False))]),
            {
                "eng__razoes_creatinina": [True, False],
                "modelo__learning_rate": [0.02, 0.05, 0.1],
                "modelo__max_iter": [100, 200, 400],
                "modelo__max_leaf_nodes": [4, 8, 16],
                "modelo__min_samples_leaf": [10, 20, 40],
                "modelo__l2_regularization": [0.0, 1.0, 10.0],
            },
            n_iter,
        ),
    }


def _validacao_cruzada(rapido: bool) -> RepeatedStratifiedKFold:
    return RepeatedStratifiedKFold(n_splits=5, n_repeats=1 if rapido else 3, random_state=SEMENTE)


def _resumo_busca(busca) -> dict:
    resultados = busca.cv_results_
    melhor = busca.best_index_
    return {
        "auroc_vc": float(resultados["mean_test_auroc"][melhor]),
        "auroc_vc_dp": float(resultados["std_test_auroc"][melhor]),
        "brier_vc": float(-resultados["mean_test_brier"][melhor]),
        "auprc_vc": float(resultados["mean_test_auprc"][melhor]),
        "hiperparametros": {k: (v if isinstance(v, (int, float, str, bool)) or v is None else str(v))
                            for k, v in busca.best_params_.items()},
    }


def selecionar_modelo(X, y, rapido: bool, log) -> tuple[str, object, dict]:
    """Busca de hiperparâmetros por família + ensemble; devolve o vencedor pela VC."""
    cv = _validacao_cruzada(rapido)
    tabela, ajustados = {}, {}
    for nome, (pipeline, espaco, n_iter) in candidatos(rapido).items():
        inicio = time.time()
        if n_iter is None:
            busca = GridSearchCV(pipeline, espaco, scoring=ESCORES, refit="auroc", cv=cv, n_jobs=-1)
        else:
            busca = RandomizedSearchCV(pipeline, espaco, n_iter=n_iter, scoring=ESCORES, refit="auroc",
                                       cv=cv, n_jobs=-1, random_state=SEMENTE)
        busca.fit(X, y)
        tabela[nome] = _resumo_busca(busca)
        ajustados[nome] = busca.best_estimator_
        log(f"  {NOMES[nome]:<42} AUROC VC = {tabela[nome]['auroc_vc']:.3f} "
            f"± {tabela[nome]['auroc_vc_dp']:.3f}  ({time.time() - inicio:.0f}s)")

    top3 = sorted(tabela, key=lambda n: tabela[n]["auroc_vc"], reverse=True)[:3]
    ensemble = VotingClassifier([(n, clone(ajustados[n])) for n in top3], voting="soft")
    resultado = cross_validate(ensemble, X, y, scoring=ESCORES, cv=cv, n_jobs=-1)
    tabela["ensemble"] = {
        "auroc_vc": float(resultado["test_auroc"].mean()),
        "auroc_vc_dp": float(resultado["test_auroc"].std()),
        "brier_vc": float(-resultado["test_brier"].mean()),
        "auprc_vc": float(resultado["test_auprc"].mean()),
        "hiperparametros": {"componentes": top3},
    }
    ajustados["ensemble"] = ensemble
    log(f"  {NOMES['ensemble']:<42} AUROC VC = {tabela['ensemble']['auroc_vc']:.3f} "
        f"± {tabela['ensemble']['auroc_vc_dp']:.3f}")

    vencedor = max(tabela, key=lambda n: tabela[n]["auroc_vc"])
    return vencedor, clone(ajustados[vencedor]), tabela


def calibrado(estimador) -> CalibratedClassifierCV:
    """Calibração sigmoide com o modelo-base ajustado em 100% dos dados (ensemble=False).

    Na VC do desenvolvimento, ensemble=False preservou o AUROC do modelo-base e deu o
    melhor Brier; ensemble=True treinava 5 cópias com 80% dos dados e perdia discriminação.
    """
    return CalibratedClassifierCV(
        estimator=clone(estimador), method="sigmoid", ensemble=False,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=SEMENTE),
    )


def previsoes_fora_da_dobra(estimador, X, y, repeticoes: int = 3) -> np.ndarray:
    """Média das probabilidades fora-da-dobra em várias partições (menos variância)."""
    previsoes = [
        cross_val_predict(estimador, X, y, method="predict_proba", n_jobs=-1,
                          cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=SEMENTE + r))[:, 1]
        for r in range(repeticoes)
    ]
    return np.mean(previsoes, axis=0)


def escolher_limiares(y, p) -> dict[str, float]:
    return {
        "triagem": M.limiar_para_sensibilidade(y, p, 0.90),
        "equilibrio": M.limiar_youden(y, p),
        "confirmacao": M.limiar_para_especificidade(y, p, 0.95),
    }


def _subgrupos(df: pd.DataFrame, p: np.ndarray, limiares: dict[str, float]) -> dict:
    """AUROC contra cada grupo de comparação e sensibilidade por estádio."""
    p = pd.Series(p, index=df.index)
    saida = {}
    comparacoes = {
        "pdac_vs_controles": df["diagnostico"].isin([1, 3]),
        "pdac_vs_benignos": df["diagnostico"].isin([2, 3]),
        "pdac_I_II_vs_nao_pdac": (df["diagnostico"] != 3) | (df["estadio_grupo"] == "I-II"),
        "pdac_vs_pancreatite": (df["diagnostico"] == 3)
                               | df["diagnostico_benigno"].fillna("").str.contains("Pancreatitis"),
    }
    for nome, mascara in comparacoes.items():
        y = df.loc[mascara, "pdac"]
        if y.nunique() == 2:
            saida[nome] = {"auroc": float(roc_auc_score(y, p[mascara])), "n": int(mascara.sum()),
                           "n_pdac": int(y.sum())}
    sensibilidade = {}
    for grupo in ("I-II", "III-IV"):
        mascara = (df["pdac"] == 1) & (df["estadio_grupo"] == grupo)
        sensibilidade[grupo] = {
            nome: {"sensibilidade": float((p[mascara] >= limiar).mean()), "n": int(mascara.sum())}
            for nome, limiar in limiares.items()
        }
    saida["sensibilidade_por_estadio"] = sensibilidade
    return saida


def _referencias(df: pd.DataFrame, features: list[str]) -> dict:
    """Percentis por grupo diagnóstico, usados para explicar cada previsão."""
    grupos = {"controle": 1, "benigno": 2, "pdac": 3}
    return {
        f: {
            "faixa_treino": [float(df[f].min()), float(df[f].max())],
            "mediana_nao_pdac": float(df.loc[df["pdac"] == 0, f].median()),
            "percentis": {
                g: {str(q): float(df.loc[df["diagnostico"] == cod, f].quantile(q / 100))
                    for q in (5, 25, 50, 75, 95)}
                for g, cod in grupos.items()
            },
        }
        for f in features
    }


def executar_protocolo(df: pd.DataFrame, features: list[str], nome: str, rapido: bool, log) -> dict:
    log(f"\n=== Modelo '{nome}': {len(df)} amostras, {int(df['pdac'].sum())} PDAC, variáveis {features}")
    estratos = df["diagnostico"].astype(str) + "_" + df["estadio_grupo"].fillna("na")
    dev, teste = train_test_split(df, test_size=0.25, stratify=estratos, random_state=SEMENTE)
    X_dev, y_dev = dev[features], dev["pdac"].to_numpy()
    X_teste, y_teste = teste[features], teste["pdac"].to_numpy()

    log("Seleção de modelo (VC 5×3 no conjunto de desenvolvimento):")
    vencedor, melhor, tabela = selecionar_modelo(X_dev, y_dev, rapido, log)
    log(f"Vencedor: {NOMES[vencedor]}")

    final_dev = calibrado(melhor)
    oof_dev = previsoes_fora_da_dobra(final_dev, X_dev, y_dev, repeticoes=1 if rapido else 3)
    limiares_dev = escolher_limiares(y_dev, oof_dev)
    final_dev.fit(X_dev, y_dev)
    p_teste = final_dev.predict_proba(X_teste)[:, 1]

    n_boot = 300 if rapido else 2000
    avaliacao_teste = {
        **M.resumo_discriminacao(y_teste, p_teste, n_boot=n_boot),
        "limiares_escolhidos_no_desenvolvimento": limiares_dev,
        "pontos_operacionais": {k: M.metricas_no_limiar(y_teste, p_teste, v) for k, v in limiares_dev.items()},
        "subgrupos": _subgrupos(teste, p_teste, limiares_dev),
    }
    log(f"Teste (n={len(teste)}): AUROC {avaliacao_teste['auroc']['auc']:.3f} "
        f"[{avaliacao_teste['auroc']['ic95'][0]:.3f}–{avaliacao_teste['auroc']['ic95'][1]:.3f}], "
        f"Brier {avaliacao_teste['brier']:.3f}")

    # Linhas de base no mesmo teste.
    simples = Pipeline([("eng", EngenhariaBiomarcadores()), ("escala", StandardScaler()),
                        ("modelo", LogisticRegression(C=1.0, max_iter=5000))]).fit(X_dev, y_dev)
    p_simples = simples.predict_proba(X_teste)[:, 1]
    linhas_de_base = {
        "lyve1_isolado": {"auroc": M.auc_com_ic(y_teste, teste["lyve1"], n_boot=n_boot)},
        "regressao_logistica_simples_tipo_pancrisk": {"auroc": M.auc_com_ic(y_teste, p_simples, n_boot=n_boot)},
    }
    com_ca = teste["ca19_9"].notna()
    if com_ca.sum() > 10 and teste.loc[com_ca, "pdac"].nunique() == 2:
        linhas_de_base["ca19_9_maior_igual_37"] = M.metricas_no_limiar(
            teste.loc[com_ca, "pdac"], teste.loc[com_ca, "ca19_9"], 37.0)
        linhas_de_base["ca19_9_continuo"] = {
            "auroc": M.auc_com_ic(teste.loc[com_ca, "pdac"], teste.loc[com_ca, "ca19_9"], n_boot=n_boot)}

    # Ablação: mesmo modelo sem idade (confundidor: PDAC é mais velho no estudo).
    sem_idade = [f for f in features if f != "idade"]
    ablacao = {}
    if sem_idade != features:
        estimador_sem_idade = calibrado(melhor).fit(X_dev[sem_idade], y_dev)
        ablacao["sem_idade"] = {
            "auroc_teste": M.auc_com_ic(y_teste, estimador_sem_idade.predict_proba(X_teste[sem_idade])[:, 1],
                                        n_boot=n_boot)}

    # Validação por coorte: treina na Cohort1 e testa na Cohort2 (amostras novas do artigo).
    coorte1, coorte2 = df[df["coorte"] == "Cohort1"], df[df["coorte"] == "Cohort2"]
    validacao_coorte = {}
    if coorte2["pdac"].nunique() == 2 and coorte1["pdac"].nunique() == 2:
        estimador_c1 = calibrado(melhor)
        oof_c1 = previsoes_fora_da_dobra(estimador_c1, coorte1[features], coorte1["pdac"].to_numpy(), repeticoes=1)
        limiares_c1 = escolher_limiares(coorte1["pdac"].to_numpy(), oof_c1)
        estimador_c1.fit(coorte1[features], coorte1["pdac"])
        p_c2 = estimador_c1.predict_proba(coorte2[features])[:, 1]
        validacao_coorte = {
            **M.resumo_discriminacao(coorte2["pdac"].to_numpy(), p_c2, n_boot=n_boot),
            "pontos_operacionais": {k: M.metricas_no_limiar(coorte2["pdac"].to_numpy(), p_c2, v)
                                    for k, v in limiares_c1.items()},
        }
        log(f"Validação por coorte (Cohort1 -> Cohort2, n={len(coorte2)}): "
            f"AUROC {validacao_coorte['auroc']['auc']:.3f}")

    # Modelo publicado: todas as amostras; limiares nas previsões fora-da-dobra de todas.
    X_todos, y_todos = df[features], df["pdac"].to_numpy()
    publicado = calibrado(melhor)
    oof_todos = previsoes_fora_da_dobra(publicado, X_todos, y_todos, repeticoes=1 if rapido else 3)
    limiares_publicados = escolher_limiares(y_todos, oof_todos)
    publicado.fit(X_todos, y_todos)

    metricas = {
        "modelo": nome,
        "features": features,
        "familia_vencedora": vencedor,
        "familia_vencedora_nome": NOMES[vencedor],
        "selecao_vc_desenvolvimento": tabela,
        "n_desenvolvimento": int(len(dev)),
        "n_teste": int(len(teste)),
        "teste": avaliacao_teste,
        "linhas_de_base_teste": linhas_de_base,
        "ablacao": ablacao,
        "validacao_por_coorte": validacao_coorte,
        "fora_da_dobra_todas_amostras": {
            **M.resumo_discriminacao(y_todos, oof_todos, n_boot=n_boot),
            "subgrupos": _subgrupos(df, oof_todos, limiares_publicados),
        },
        "limiares_publicados": limiares_publicados,
    }
    artefato = {
        "modelo": publicado,
        "features": features,
        "limiares": limiares_publicados,
        "pontos_operacionais": PONTOS_OPERACIONAIS,
        "referencias": _referencias(df, features),
        "resumo_metricas": {
            "familia": NOMES[vencedor],
            "auroc_teste": avaliacao_teste["auroc"],
            "auroc_coorte2": validacao_coorte.get("auroc"),
            "pontos_operacionais_teste": {
                k: {c: v[c] for c in ("limiar", "sensibilidade", "especificidade")}
                for k, v in avaliacao_teste["pontos_operacionais"].items()
            },
        },
        "treinado_em": date.today().isoformat(),
        "versao_sklearn": sklearn.__version__,
        "n_amostras": int(len(df)),
        # Necessária para reajustar a probabilidade a outras prevalências (Bayes).
        "prevalencia_treino": float(df["pdac"].mean()),
        "dataset": "Debernardi et al., PLOS Med 2020;17(12):e1003489 (S1 Table)",
    }
    graficos = {"y_teste": y_teste, "p_teste": p_teste, "p_simples": p_simples,
                "lyve1_teste": teste["lyve1"].to_numpy(), "oof_todos": oof_todos, "df": df,
                "tabela": tabela}
    return {"metricas": metricas, "artefato": artefato, "graficos": graficos}


def _figuras(resultados: dict) -> None:
    pasta = RELATORIOS / "figuras"
    pasta.mkdir(parents=True, exist_ok=True)
    cores = {"controle": "#4C78A8", "benigno": "#F58518", "pdac": "#E45756"}

    fig, eixo = plt.subplots(figsize=(6, 6))
    for nome, r in resultados.items():
        g = r["graficos"]
        fpr, tpr, _ = roc_curve(g["y_teste"], g["p_teste"])
        eixo.plot(fpr, tpr, lw=2, label=f"{nome} — AUROC {roc_auc_score(g['y_teste'], g['p_teste']):.3f}")
    g = resultados["painel_urinario"]["graficos"]
    for rotulo, valores, estilo in (("RL simples (tipo PancRISK)", g["p_simples"], "--"),
                                    ("LYVE1 isolado", g["lyve1_teste"], ":")):
        fpr, tpr, _ = roc_curve(g["y_teste"], valores)
        eixo.plot(fpr, tpr, estilo, lw=1.5, label=f"{rotulo} — AUROC {roc_auc_score(g['y_teste'], valores):.3f}")
    eixo.plot([0, 1], [0, 1], color="grey", lw=0.8)
    eixo.set(xlabel="1 − especificidade", ylabel="Sensibilidade", title="Curvas ROC no conjunto de teste")
    eixo.legend(loc="lower right", fontsize=8)
    fig.tight_layout()
    fig.savefig(pasta / "roc_teste.png", dpi=150)
    plt.close(fig)

    fig, eixo = plt.subplots(figsize=(6, 6))
    for nome, r in resultados.items():
        g = r["graficos"]
        observado, previsto = calibration_curve(g["y_teste"], g["p_teste"], n_bins=5, strategy="quantile")
        eixo.plot(previsto, observado, "o-", label=nome)
    eixo.plot([0, 1], [0, 1], color="grey", lw=0.8)
    eixo.set(xlabel="Probabilidade prevista", ylabel="Fração observada de PDAC", title="Calibração no teste")
    eixo.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(pasta / "calibracao_teste.png", dpi=150)
    plt.close(fig)

    for nome, r in resultados.items():
        g = r["graficos"]
        df, oof = g["df"], g["oof_todos"]
        limiares = r["metricas"]["limiares_publicados"]
        fig, eixo = plt.subplots(figsize=(7, 4))
        for grupo, codigo in (("controle", 1), ("benigno", 2), ("pdac", 3)):
            eixo.hist(oof[df["diagnostico"].to_numpy() == codigo], bins=25, range=(0, 1), alpha=0.55,
                      color=cores[grupo], label=grupo)
        for ponto, limiar in limiares.items():
            eixo.axvline(limiar, color="black", ls="--", lw=0.8)
            eixo.text(limiar, eixo.get_ylim()[1] * 0.92, f" {ponto}", fontsize=7, rotation=90, va="top")
        eixo.set(xlabel="Probabilidade de PDAC (fora-da-dobra)", ylabel="Amostras",
                 title=f"Distribuição das previsões — {nome}")
        eixo.legend()
        fig.tight_layout()
        fig.savefig(pasta / f"distribuicao_{nome}.png", dpi=150)
        plt.close(fig)

        tabela = g["tabela"]
        ordem = sorted(tabela, key=lambda n: tabela[n]["auroc_vc"])
        fig, eixo = plt.subplots(figsize=(7, 4))
        eixo.barh([NOMES[n] for n in ordem], [tabela[n]["auroc_vc"] for n in ordem],
                  xerr=[tabela[n]["auroc_vc_dp"] for n in ordem], color="#72B7B2")
        eixo.set_xlim(min(tabela[n]["auroc_vc"] for n in ordem) - 0.08, 1.0)
        eixo.set(xlabel="AUROC médio (VC 5×3)", title=f"Comparação de modelos — {nome}")
        fig.tight_layout()
        fig.savefig(pasta / f"comparacao_modelos_{nome}.png", dpi=150)
        plt.close(fig)


def _pct(valor: float) -> str:
    return f"{100 * valor:.1f}%"


def _relatorio_markdown(resultados: dict) -> str:
    linhas = [
        "# Relatório de métricas — biomarcadores urinários para PDAC",
        "",
        f"Gerado em {date.today().isoformat()} por `python -m pancreas.treino_biomarcadores`.",
        "Dados: Debernardi et al., PLOS Medicine 2020 (S1 Table, 590 amostras de urina: "
        "183 controles, 208 doenças hepatobiliares benignas, 199 PDAC).",
        "",
        "Tarefa: PDAC × não-PDAC (controles + benignos). O teste (25%) foi separado antes de qualquer "
        "ajuste e usado uma única vez. Limiares escolhidos nas previsões fora-da-dobra do desenvolvimento.",
        "",
    ]
    for nome, r in resultados.items():
        m = r["metricas"]
        t = m["teste"]
        linhas += [
            f"## Modelo `{nome}`",
            "",
            f"- Variáveis: {', '.join(m['features'])}",
            f"- Família vencedora na validação cruzada: **{m['familia_vencedora_nome']}** (calibrada por sigmoide)",
            f"- Desenvolvimento: {m['n_desenvolvimento']} amostras · Teste: {m['n_teste']} amostras "
            f"({t['n_pdac']} PDAC)",
            "",
            "### Seleção de modelo (VC 5×3 no desenvolvimento)",
            "",
            "| Modelo | AUROC (média ± dp) | Brier | AUPRC |",
            "|---|---|---|---|",
        ]
        for fam, v in sorted(m["selecao_vc_desenvolvimento"].items(), key=lambda kv: -kv[1]["auroc_vc"]):
            marca = " **(vencedor)**" if fam == m["familia_vencedora"] else ""
            linhas.append(f"| {NOMES[fam]}{marca} | {v['auroc_vc']:.3f} ± {v['auroc_vc_dp']:.3f} | "
                          f"{v['brier_vc']:.3f} | {v['auprc_vc']:.3f} |")
        a = t["auroc"]
        linhas += [
            "",
            "### Desempenho no teste (avaliação única)",
            "",
            f"- **AUROC {a['auc']:.3f}** (IC 95% {a['ic95'][0]:.3f}–{a['ic95'][1]:.3f})",
            f"- AUPRC {t['auprc']:.3f} · Brier {t['brier']:.3f} · inclinação de calibração "
            f"{t['inclinacao']:.2f} · calibração-no-geral {t['calibracao_no_geral']:+.3f}",
            "",
            "| Ponto operacional | Limiar | Sensibilidade (IC 95%) | Especificidade (IC 95%) | "
            "VPP se prevalência 3% | VPN se prevalência 3% |",
            "|---|---|---|---|---|---|",
        ]
        for ponto, v in t["pontos_operacionais"].items():
            vp = v["vpp_vpn_por_prevalencia"]["sintomaticos_atencao_primaria"]
            linhas.append(
                f"| {ponto} ({PONTOS_OPERACIONAIS[ponto]}) | {v['limiar']:.3f} | {_pct(v['sensibilidade'])} "
                f"({_pct(v['sensibilidade_ic95'][0])}–{_pct(v['sensibilidade_ic95'][1])}) | "
                f"{_pct(v['especificidade'])} ({_pct(v['especificidade_ic95'][0])}–"
                f"{_pct(v['especificidade_ic95'][1])}) | {_pct(vp['vpp'])} | {_pct(vp['vpn'])} |")
        sub = t["subgrupos"]
        linhas += ["", "Subgrupos no teste (AUROC):", ""]
        for chave, rotulo in (("pdac_vs_controles", "PDAC × controles saudáveis"),
                              ("pdac_vs_benignos", "PDAC × doenças benignas"),
                              ("pdac_I_II_vs_nao_pdac", "PDAC estádio I–II × não-PDAC"),
                              ("pdac_vs_pancreatite", "PDAC × pancreatite")):
            if chave in sub:
                linhas.append(f"- {rotulo}: {sub[chave]['auroc']:.3f} (n={sub[chave]['n']})")
        sens = sub["sensibilidade_por_estadio"]
        linhas.append(
            "- Sensibilidade no limiar de triagem: estádio I–II "
            f"{_pct(sens['I-II']['triagem']['sensibilidade'])} (n={sens['I-II']['triagem']['n']}), "
            f"estádio III–IV {_pct(sens['III-IV']['triagem']['sensibilidade'])} "
            f"(n={sens['III-IV']['triagem']['n']})")
        lb = m["linhas_de_base_teste"]
        linhas += ["", "### Comparação com linhas de base (mesmo teste)", ""]
        linhas.append(f"- LYVE1 isolado: AUROC {lb['lyve1_isolado']['auroc']['auc']:.3f}")
        linhas.append("- Regressão logística simples (tipo PancRISK, sem ajuste): AUROC "
                      f"{lb['regressao_logistica_simples_tipo_pancrisk']['auroc']['auc']:.3f}")
        if "ca19_9_maior_igual_37" in lb:
            ca = lb["ca19_9_maior_igual_37"]
            linhas.append(f"- CA19-9 plasmático ≥ 37 U/mL (amostras com CA19-9): sensibilidade "
                          f"{_pct(ca['sensibilidade'])}, especificidade {_pct(ca['especificidade'])}; "
                          f"AUROC contínuo {lb['ca19_9_continuo']['auroc']['auc']:.3f}")
        if m["ablacao"]:
            linhas.append(f"- Ablação sem idade: AUROC {m['ablacao']['sem_idade']['auroc_teste']['auc']:.3f} "
                          "(quanto do desempenho vem só dos biomarcadores)")
        vc = m["validacao_por_coorte"]
        if vc:
            linhas += ["", "### Validação por coorte (treino Cohort1 → teste Cohort2)", "",
                       f"- AUROC {vc['auroc']['auc']:.3f} (IC 95% {vc['auroc']['ic95'][0]:.3f}–"
                       f"{vc['auroc']['ic95'][1]:.3f}), n={vc['n']} ({vc['n_pdac']} PDAC)"]
            for ponto, v in vc["pontos_operacionais"].items():
                linhas.append(f"- {ponto}: sensibilidade {_pct(v['sensibilidade'])}, "
                              f"especificidade {_pct(v['especificidade'])}")
        linhas += ["", "Limiares do modelo publicado (todas as amostras): "
                   + ", ".join(f"{k} = {v:.3f}" for k, v in m["limiares_publicados"].items()), ""]
    linhas += [
        "## Limitações",
        "",
        "- Estudo caso-controle com prevalência de PDAC artificialmente alta (34%): o VPP real em "
        "populações de baixa prevalência é muito menor (ver colunas de VPP a 3%).",
        "- Amostras de centros europeus; LYVE1/REG1B/TFF1 urinários são ensaios ELISA de pesquisa, "
        "sem padronização clínica. Valores de outros kits não são intercambiáveis.",
        "- Controles vieram de um único centro (BPTB): parte do sinal pode refletir diferenças "
        "pré-analíticas entre centros. Por isso o centro nunca entra no modelo e reportamos a "
        "validação por coorte.",
        "- Validação externa prospectiva em população brasileira é necessária antes de uso clínico.",
        "",
        "Figuras em `reports/figuras/`.",
    ]
    return "\n".join(linhas)


def _serializavel(obj):
    if isinstance(obj, dict):
        return {str(k): _serializavel(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serializavel(v) for v in obj]
    if isinstance(obj, (np.floating, np.integer)):
        return obj.item()
    return obj


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--rapido", action="store_true", help="busca menor, para testes")
    args = parser.parse_args()

    garantir_pastas()
    inicio = time.time()
    df = carregar_debernardi()
    resultados = {
        "painel_urinario": executar_protocolo(df, FEATURES_PAINEL, "painel_urinario", args.rapido, print),
        "painel_urinario_ca19_9": executar_protocolo(df[df["ca19_9"].notna()].reset_index(drop=True),
                                                     FEATURES_PAINEL_CA199, "painel_urinario_ca19_9",
                                                     args.rapido, print),
    }
    for nome, r in resultados.items():
        joblib.dump(r["artefato"], MODELOS / f"biomarcadores_{nome}.joblib", compress=3)
    (RELATORIOS / "metricas_biomarcadores.json").write_text(
        json.dumps(_serializavel({n: r["metricas"] for n, r in resultados.items()}), ensure_ascii=False, indent=2),
        encoding="utf-8")
    (RELATORIOS / "relatorio_metricas_biomarcadores.md").write_text(_relatorio_markdown(resultados), encoding="utf-8")
    _figuras(resultados)
    print(f"\nConcluído em {time.time() - inicio:.0f}s. Modelos em {MODELOS}, relatório em {RELATORIOS}.")


if __name__ == "__main__":
    main()

"""Modelo de prognóstico (sobrevida global) pós-ressecção com TCGA-PAAD.

População: 184 pacientes do TCGA PanCancer Atlas, quase todos operados (estádio I–II).
Excluímos histologias que não são adenocarcinoma ductal/NOS (neuroendócrino 8246/3,
coloide 8480/3, indiferenciado 8020/3), que têm prognóstico diferente.

Comparamos um Cox clínico (idade, T, N, grau) com um Cox clínico + genômico (KRAS, TP53,
CDKN2A, SMAD4), com penalização escolhida por validação cruzada repetida (C-index).

Uso: python -m pancreas.treino_prognostico
"""

from __future__ import annotations

import json
import sys
from datetime import date

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from lifelines import CoxPHFitter, KaplanMeierFitter
from lifelines.statistics import multivariate_logrank_test
from lifelines.utils import concordance_index
from sklearn.model_selection import RepeatedKFold

from .config import MODELOS, RELATORIOS, SEMENTE, garantir_pastas
from .dados import TCGA_PASTA, baixar_tcga_clinico, baixar_tcga_genomica

HISTOLOGIAS_INCLUIDAS = {"8500/3", "8140/3", "8255/3"}
FEATURES_CLINICAS = ["idade_decadas", "t3_t4", "n1", "grau_3_4"]
FEATURES_GENOMICAS = ["kras_mutado", "tp53_mutado", "cdkn2a_alterado", "smad4_alterado"]
PENALIDADES = [0.01, 0.1, 0.3, 1.0, 2.0, 5.0]


def montar_tabela() -> pd.DataFrame:
    pacientes, amostras = baixar_tcga_clinico()
    baixar_tcga_genomica()
    genomica = json.loads((TCGA_PASTA / "genomica.json").read_text(encoding="utf-8"))
    mutacoes = pd.DataFrame(genomica["mutacoes"])
    cna = pd.DataFrame(genomica["cna"])
    sequenciadas = set(genomica["listas"]["sequenced"])

    df = pacientes.merge(amostras[["patientId", "sampleId", "GRADE"]], on="patientId", how="left")
    df = df[df["ICD_O_3_HISTOLOGY"].isin(HISTOLOGIAS_INCLUIDAS)].copy()
    df["tempo_meses"] = pd.to_numeric(df["OS_MONTHS"], errors="coerce")
    df["obito"] = df["OS_STATUS"].astype(str).str.startswith("1").astype(int)
    df["idade"] = pd.to_numeric(df["AGE"], errors="coerce")
    df["idade_decadas"] = df["idade"] / 10
    df["t3_t4"] = df["PATH_T_STAGE"].map({"T1": 0, "T2": 0, "T3": 1, "T4": 1})
    df["n1"] = df["PATH_N_STAGE"].map({"N0": 0, "N1": 1, "N1B": 1})
    df["grau_3_4"] = df["GRADE"].map({"G1": 0, "G2": 0, "G3": 1, "G4": 1})

    def alterados(gene: str, incluir_cna: bool) -> set[str]:
        ids = set(mutacoes.loc[mutacoes["gene"] == gene, "sampleId"])
        if incluir_cna and not cna.empty:
            ids |= set(cna.loc[(cna["gene"] == gene) & (cna["alteration"] == -2), "sampleId"])
        return ids

    df = df[df["sampleId"].isin(sequenciadas)].copy()
    for coluna, gene, incluir_cna in (("kras_mutado", "KRAS", False), ("tp53_mutado", "TP53", False),
                                      ("cdkn2a_alterado", "CDKN2A", True), ("smad4_alterado", "SMAD4", True)):
        df[coluna] = df["sampleId"].isin(alterados(gene, incluir_cna)).astype(int)

    colunas = ["patientId", "tempo_meses", "obito", "idade"] + FEATURES_CLINICAS + FEATURES_GENOMICAS
    df = df[colunas].dropna()
    return df[df["tempo_meses"] > 0].reset_index(drop=True)


def cindex_vc(df: pd.DataFrame, features: list[str], penalidade: float, repeticoes: int = 10) -> tuple[float, float]:
    escores = []
    for treino, teste in RepeatedKFold(n_splits=5, n_repeats=repeticoes, random_state=SEMENTE).split(df):
        cox = CoxPHFitter(penalizer=penalidade).fit(
            df.iloc[treino][features + ["tempo_meses", "obito"]], "tempo_meses", "obito")
        risco = cox.predict_partial_hazard(df.iloc[teste][features])
        escores.append(concordance_index(df.iloc[teste]["tempo_meses"], -risco, df.iloc[teste]["obito"]))
    return float(np.mean(escores)), float(np.std(escores))


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    garantir_pastas()
    df = montar_tabela()
    print(f"TCGA-PAAD analisável: {len(df)} pacientes, {int(df['obito'].sum())} óbitos")

    comparacao = {}
    for nome, features in (("clinico", FEATURES_CLINICAS), ("clinico_genomico", FEATURES_CLINICAS + FEATURES_GENOMICAS)):
        resultados = {pen: cindex_vc(df, features, pen) for pen in PENALIDADES}
        melhor = max(resultados, key=lambda p: resultados[p][0])
        comparacao[nome] = {"features": features, "penalidade": melhor,
                            "cindex_vc": resultados[melhor][0], "cindex_vc_dp": resultados[melhor][1],
                            "por_penalidade": {str(p): r[0] for p, r in resultados.items()}}
        print(f"  Cox {nome:<17} C-index VC = {resultados[melhor][0]:.3f} ± {resultados[melhor][1]:.3f} "
              f"(penalidade {melhor})")

    escolhido = max(comparacao, key=lambda n: comparacao[n]["cindex_vc"])
    features = comparacao[escolhido]["features"]
    cox = CoxPHFitter(penalizer=comparacao[escolhido]["penalidade"]).fit(
        df[features + ["tempo_meses", "obito"]], "tempo_meses", "obito")

    # Grupos de risco pelos tercis do preditor linear (cortes guardados para novos pacientes).
    preditor = np.log(cox.predict_partial_hazard(df[features]).to_numpy())
    cortes = np.quantile(preditor, [1 / 3, 2 / 3]).tolist()
    nomes_grupos = ["baixo", "intermediario", "alto"]

    # As curvas e o log-rank usam grupos atribuídos fora-da-dobra (o paciente nunca é
    # classificado por um modelo que o viu), para não superestimar a separação.
    grupo = np.empty(len(df), dtype=int)
    for treino, teste in RepeatedKFold(n_splits=5, n_repeats=1, random_state=SEMENTE).split(df):
        cox_dobra = CoxPHFitter(penalizer=comparacao[escolhido]["penalidade"]).fit(
            df.iloc[treino][features + ["tempo_meses", "obito"]], "tempo_meses", "obito")
        lp_treino = np.log(cox_dobra.predict_partial_hazard(df.iloc[treino][features]).to_numpy())
        lp_teste = np.log(cox_dobra.predict_partial_hazard(df.iloc[teste][features]).to_numpy())
        grupo[teste] = np.digitize(lp_teste, np.quantile(lp_treino, [1 / 3, 2 / 3]))
    teste_logrank = multivariate_logrank_test(df["tempo_meses"], grupo, df["obito"])

    km_por_grupo = {}
    fig, eixo = plt.subplots(figsize=(7, 5))
    for indice, nome in enumerate(nomes_grupos):
        mascara = grupo == indice
        km = KaplanMeierFitter().fit(df.loc[mascara, "tempo_meses"], df.loc[mascara, "obito"], label=nome)
        km.plot_survival_function(ax=eixo, ci_show=False)
        mediana = km.median_survival_time_
        km_por_grupo[nome] = {
            "n": int(mascara.sum()),
            "mediana_meses": None if np.isinf(mediana) else float(mediana),
            "sobrevida_12m": float(km.survival_function_at_times(12).iloc[0]),
            "sobrevida_24m": float(km.survival_function_at_times(24).iloc[0]),
        }
    eixo.set(xlabel="Meses", ylabel="Sobrevida global",
             title=f"TCGA-PAAD — grupos de risco fora-da-dobra (log-rank p = {teste_logrank.p_value:.1e})")
    fig.tight_layout()
    (RELATORIOS / "figuras").mkdir(parents=True, exist_ok=True)
    fig.savefig(RELATORIOS / "figuras" / "km_prognostico_tcga.png", dpi=150)
    plt.close(fig)

    # A penalização forte melhora a ordenação (C-index), mas encolhe os coeficientes; para
    # interpretar o efeito de cada variável usamos um Cox praticamente sem penalização.
    resumo = CoxPHFitter(penalizer=0.01).fit(
        df[features + ["tempo_meses", "obito"]], "tempo_meses", "obito").summary
    hazard_ratios = {
        f: {"hr": float(resumo.loc[f, "exp(coef)"]),
            "ic95": [float(resumo.loc[f, "exp(coef) lower 95%"]), float(resumo.loc[f, "exp(coef) upper 95%"])],
            "p": float(resumo.loc[f, "p"])}
        for f in features
    }
    metricas = {
        "populacao": "TCGA-PAAD PanCancer Atlas, adenocarcinoma ductal/NOS, majoritariamente ressecado (estádio I–II)",
        "n": int(len(df)),
        "obitos": int(df["obito"].sum()),
        "comparacao_modelos": comparacao,
        "modelo_escolhido": escolhido,
        "cindex_aparente": float(cox.concordance_index_),
        "hazard_ratios": hazard_ratios,
        "grupos_risco": km_por_grupo,
        "logrank_p": float(teste_logrank.p_value),
    }
    artefato = {
        "modelo": cox,
        "features": features,
        "cortes_grupo_risco": cortes,
        "medias": {f: float(df[f].mean()) for f in features},
        "grupos": km_por_grupo,
        "hazard_ratios": hazard_ratios,
        "cindex_vc": comparacao[escolhido]["cindex_vc"],
        "treinado_em": date.today().isoformat(),
        "n": int(len(df)),
    }
    joblib.dump(artefato, MODELOS / "prognostico_tcga.joblib")
    (RELATORIOS / "metricas_prognostico.json").write_text(json.dumps(metricas, ensure_ascii=False, indent=2),
                                                         encoding="utf-8")
    print(f"Escolhido: {escolhido}. Log-rank entre grupos p = {teste_logrank.p_value:.2e}")
    for nome, g in km_por_grupo.items():
        print(f"  risco {nome:<13} n={g['n']:>3}  mediana={g['mediana_meses']}  SG 24m={g['sobrevida_24m']:.2f}")


if __name__ == "__main__":
    main()

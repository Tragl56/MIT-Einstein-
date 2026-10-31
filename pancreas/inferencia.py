"""Inferência dos modelos treinados, com explicação de cada previsão."""

from __future__ import annotations

import json
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from .config import AVISO_CLINICO, MODELOS, RELATORIOS
from .features import UNIDADES
from .metricas import PREVALENCIAS_REFERENCIA

# Faixas plausíveis na unidade do modelo (fora delas a entrada é recusada).
LIMITES = {
    "idade": (18, 100),
    "creatinina": (0.01, 10.0),
    "lyve1": (0.0, 100.0),
    "reg1b": (0.0, 5000.0),
    "tff1": (0.0, 50000.0),
    "ca19_9": (0.0, 200000.0),
}

# Fatores para converter creatinina urinária para mg/mL (unidade do dataset).
CONVERSAO_CREATININA = {"mg/ml": 1.0, "mg/dl": 0.01, "mmol/l": 0.11312, "umol/l": 0.00011312,
                        "µmol/l": 0.00011312}

NOMES_VARIAVEIS = {
    "idade": "Idade", "creatinina": "Creatinina urinária", "lyve1": "LYVE1 urinário",
    "reg1b": "REG1B urinário", "tff1": "TFF1 urinário", "ca19_9": "CA19-9 plasmático",
}


class ModeloIndisponivel(RuntimeError):
    pass


@lru_cache
def carregar_biomarcadores(nome: str) -> dict:
    caminho = MODELOS / f"biomarcadores_{nome}.joblib"
    if not caminho.exists():
        raise ModeloIndisponivel("Modelo não treinado. Rode: python -m pancreas.treino_biomarcadores")
    return joblib.load(caminho)


@lru_cache
def carregar_prognostico() -> dict:
    caminho = MODELOS / "prognostico_tcga.joblib"
    if not caminho.exists():
        raise ModeloIndisponivel("Modelo não treinado. Rode: python -m pancreas.treino_prognostico")
    return joblib.load(caminho)


def converter_creatinina(valor: float, unidade: str) -> float:
    chave = unidade.strip().lower().replace(" ", "")
    if chave not in CONVERSAO_CREATININA:
        raise ValueError(f"Unidade de creatinina não suportada: {unidade}. Use mg/dL, mg/mL, mmol/L ou µmol/L.")
    return valor * CONVERSAO_CREATININA[chave]


def ajustar_prevalencia(p: float, prevalencia_treino: float, prevalencia_alvo: float) -> float:
    """Reescala a probabilidade para outra prevalência pela razão de chances (Bayes)."""
    p = min(max(p, 1e-6), 1 - 1e-6)
    chances = p / (1 - p)
    fator = (prevalencia_alvo / (1 - prevalencia_alvo)) / (prevalencia_treino / (1 - prevalencia_treino))
    return float(chances * fator / (1 + chances * fator))


def avaliar_biomarcadores(
    idade: float,
    creatinina: float,
    lyve1: float,
    reg1b: float,
    tff1: float,
    ca19_9: float | None = None,
    unidade_creatinina: str = "mg/mL",
) -> dict:
    """Probabilidade de PDAC pelo painel urinário (e CA19-9 plasmático, se informado)."""
    entrada = {
        "idade": float(idade),
        "creatinina": converter_creatinina(float(creatinina), unidade_creatinina),
        "lyve1": float(lyve1),
        "reg1b": float(reg1b),
        "tff1": float(tff1),
    }
    nome = "painel_urinario"
    if ca19_9 is not None:
        entrada["ca19_9"] = float(ca19_9)
        nome = "painel_urinario_ca19_9"
    for variavel, valor in entrada.items():
        minimo, maximo = LIMITES[variavel]
        if not (minimo <= valor <= maximo) or np.isnan(valor):
            raise ValueError(f"{NOMES_VARIAVEIS[variavel]} = {valor:g} {UNIDADES[variavel]} fora da faixa "
                             f"aceita ({minimo:g}–{maximo:g}). Confira o valor e a unidade.")

    artefato = carregar_biomarcadores(nome)
    X = pd.DataFrame([entrada])[artefato["features"]]
    modelo = artefato["modelo"]
    p = float(modelo.predict_proba(X)[0, 1])
    limiares = artefato["limiares"]
    referencias = artefato["referencias"]

    # Efeito de cada variável: quanto a probabilidade cairia se ela tivesse o valor
    # mediano das amostras não-PDAC (explicação contrafactual, vale para qualquer modelo).
    contribuicoes, alertas = [], []
    for variavel in artefato["features"]:
        alterado = X.copy()
        alterado[variavel] = referencias[variavel]["mediana_nao_pdac"]
        efeito = p - float(modelo.predict_proba(alterado)[0, 1])
        percentis = referencias[variavel]["percentis"]
        contribuicoes.append({
            "variavel": NOMES_VARIAVEIS[variavel],
            "valor": round(entrada[variavel], 4),
            "unidade": UNIDADES[variavel],
            "efeito_na_probabilidade": round(efeito, 3),
            "mediana_controles": round(percentis["controle"]["50"], 3),
            "mediana_benignos": round(percentis["benigno"]["50"], 3),
            "mediana_pdac": round(percentis["pdac"]["50"], 3),
        })
        baixo, alto = referencias[variavel]["faixa_treino"]
        if not baixo <= entrada[variavel] <= alto:
            alertas.append(f"{NOMES_VARIAVEIS[variavel]} fora da faixa vista no treino ({baixo:g}–{alto:g} "
                           f"{UNIDADES[variavel]}): o modelo está extrapolando, interprete com cautela.")
    contribuicoes.sort(key=lambda c: abs(c["efeito_na_probabilidade"]), reverse=True)

    triagem, confirmacao = sorted((limiares["triagem"], limiares["confirmacao"]))
    if p >= confirmacao:
        faixa = "alta"
        interpretacao = ("Acima do limiar de alta especificidade: perfil de biomarcadores semelhante ao de PDAC. "
                         "Priorizar investigação por imagem (TC com protocolo pancreático).")
    elif p >= triagem:
        faixa = "intermediaria"
        interpretacao = ("Entre os limiares de triagem e de confirmação: resultado indeterminado; correlacionar "
                         "com clínica e considerar imagem.")
    else:
        faixa = "baixa"
        interpretacao = ("Abaixo do limiar de triagem (alta sensibilidade): perfil semelhante ao de não-PDAC. "
                         "Não exclui câncer se houver sinais de alarme — a clínica prevalece.")

    desempenho = artefato["resumo_metricas"]["pontos_operacionais_teste"]
    prevalencia_treino = artefato["prevalencia_treino"]
    return {
        "modelo": nome,
        "familia_do_modelo": artefato["resumo_metricas"]["familia"],
        "probabilidade_pdac_no_estudo": round(p, 3),
        "prevalencia_no_estudo": round(prevalencia_treino, 3),
        "faixa": faixa,
        "interpretacao": interpretacao,
        "pontos_operacionais": {
            ponto: {
                "limiar": round(limiar, 3),
                "resultado": "positivo" if p >= limiar else "negativo",
                "criterio": artefato["pontos_operacionais"][ponto],
                "sensibilidade_no_teste": round(desempenho[ponto]["sensibilidade"], 3),
                "especificidade_no_teste": round(desempenho[ponto]["especificidade"], 3),
            }
            for ponto, limiar in limiares.items()
        },
        "probabilidade_ajustada_por_prevalencia": {
            nome_prev: {"prevalencia": prev, "probabilidade": round(ajustar_prevalencia(p, prevalencia_treino, prev), 3)}
            for nome_prev, prev in PREVALENCIAS_REFERENCIA.items()
        },
        "contribuicoes": contribuicoes,
        "alertas": alertas,
        "desempenho_validado": {
            "auroc_teste": artefato["resumo_metricas"]["auroc_teste"],
            "auroc_validacao_coorte2": artefato["resumo_metricas"]["auroc_coorte2"],
        },
        "nota_sobre_probabilidade": (
            f"Probabilidade calibrada num estudo caso-controle com {prevalencia_treino:.0%} de PDAC. Na prática a "
            "prevalência é menor, então use a versão ajustada por prevalência ou os pontos operacionais."),
        "limitacoes": [
            "LYVE1, REG1B e TFF1 urinários são ensaios ELISA de pesquisa; valores de kits diferentes não são "
            "intercambiáveis com os do estudo.",
            "Treinado com amostras do Reino Unido e Espanha; falta validação em população brasileira.",
        ],
        "aviso": AVISO_CLINICO,
    }


def estimar_prognostico(
    idade: float,
    estadio_t: str,
    estadio_n: str,
    grau: str,
    kras_mutado: bool | None = None,
    tp53_mutado: bool | None = None,
    cdkn2a_alterado: bool | None = None,
    smad4_alterado: bool | None = None,
) -> dict:
    """Grupo de risco de sobrevida global após ressecção (modelo de Cox no TCGA-PAAD)."""
    artefato = carregar_prognostico()
    t = estadio_t.strip().upper()
    n = estadio_n.strip().upper()
    g = grau.strip().upper()
    if t not in {"T1", "T2", "T3", "T4"} or n not in {"N0", "N1", "N2"} or g not in {"G1", "G2", "G3", "G4"}:
        raise ValueError("Use estadio_t em T1–T4, estadio_n em N0/N1/N2 e grau em G1–G4.")

    valores = {
        "idade_decadas": float(idade) / 10,
        "t3_t4": int(t in {"T3", "T4"}),
        "n1": int(n in {"N1", "N2"}),
        "grau_3_4": int(g in {"G3", "G4"}),
    }
    imputados = []
    for chave, informado in (("kras_mutado", kras_mutado), ("tp53_mutado", tp53_mutado),
                             ("cdkn2a_alterado", cdkn2a_alterado), ("smad4_alterado", smad4_alterado)):
        if chave not in artefato["features"]:
            continue
        if informado is None:
            valores[chave] = artefato["medias"][chave]
            imputados.append(chave)
        else:
            valores[chave] = int(bool(informado))

    X = pd.DataFrame([valores])[artefato["features"]]
    cox = artefato["modelo"]
    preditor = float(np.log(cox.predict_partial_hazard(X).iloc[0]))
    grupo = ["baixo", "intermediario", "alto"][int(np.digitize(preditor, artefato["cortes_grupo_risco"]))]
    sobrevida = cox.predict_survival_function(X, times=[12, 24]).iloc[:, 0]

    alertas = []
    if t == "T4" or n == "N2":
        alertas.append("T4/N2 são raros no TCGA-PAAD (estadiamento AJCC 7ª ed., quase só estádio I–II): "
                       "a estimativa é pouco confiável para doença avançada.")
    if imputados:
        alertas.append(f"Genômica não informada ({', '.join(imputados)}): usada a frequência média do TCGA.")

    return {
        "grupo_de_risco": grupo,
        "sobrevida_global_estimada": {"12_meses": round(float(sobrevida.loc[12]), 2),
                                      "24_meses": round(float(sobrevida.loc[24]), 2)},
        "referencia_do_grupo_no_tcga": artefato["grupos"][grupo],
        "hazard_ratios_do_modelo": artefato["hazard_ratios"],
        "c_index_validacao_cruzada": round(artefato["cindex_vc"], 3),
        "alertas": alertas,
        "limitacoes": [
            "População do TCGA: pacientes operados (sobretudo estádio II) tratados antes da era mFOLFIRINOX "
            "adjuvante; a sobrevida absoluta atual tende a ser maior.",
            "Discriminação modesta (C-index ~0,59): use como estratificação relativa, não como previsão individual.",
            "Sem margem cirúrgica (R0/R1), CA19-9 pós-operatório ou tratamento recebido, que pesam muito no prognóstico.",
        ],
        "aviso": AVISO_CLINICO,
    }


def resumo_metricas() -> dict:
    """Resumo das métricas de validação para o agente e a interface."""
    saida = {}
    caminho = RELATORIOS / "metricas_biomarcadores.json"
    if caminho.exists():
        for nome, m in json.loads(caminho.read_text(encoding="utf-8")).items():
            teste = m["teste"]
            saida[nome] = {
                "variaveis": m["features"],
                "familia_vencedora": m["familia_vencedora_nome"],
                "auroc_vc_desenvolvimento": round(m["selecao_vc_desenvolvimento"][m["familia_vencedora"]]["auroc_vc"], 3),
                "teste": {
                    "n": teste["n"], "n_pdac": teste["n_pdac"],
                    "auroc": teste["auroc"], "auprc": round(teste["auprc"], 3), "brier": round(teste["brier"], 3),
                    "pontos_operacionais": {
                        k: {"limiar": round(v["limiar"], 3), "sensibilidade": round(v["sensibilidade"], 3),
                            "especificidade": round(v["especificidade"], 3)}
                        for k, v in teste["pontos_operacionais"].items()
                    },
                    "subgrupos_auroc": {k: round(v["auroc"], 3) for k, v in teste["subgrupos"].items() if "auroc" in v},
                },
                "validacao_coorte2_auroc": m["validacao_por_coorte"].get("auroc"),
                "linhas_de_base_auroc": {k: round(v["auroc"]["auc"], 3) for k, v in m["linhas_de_base_teste"].items()
                                         if "auroc" in v},
            }
    caminho = RELATORIOS / "metricas_prognostico.json"
    if caminho.exists():
        m = json.loads(caminho.read_text(encoding="utf-8"))
        saida["prognostico_tcga"] = {
            "n": m["n"], "obitos": m["obitos"], "modelo": m["modelo_escolhido"],
            "c_index_vc": round(m["comparacao_modelos"][m["modelo_escolhido"]]["cindex_vc"], 3),
            "logrank_p_grupos_fora_da_dobra": m["logrank_p"],
            "grupos_risco": m["grupos_risco"],
        }
    return saida

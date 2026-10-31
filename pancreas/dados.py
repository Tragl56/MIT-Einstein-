"""Download e carga dos datasets abertos usados pelos modelos.

- Debernardi et al. 2020 (PLOS Medicine, CC-BY): painel de biomarcadores urinários,
  planilha oficial "S1 Table" do artigo (mesmos dados do Kaggle "Urinary Biomarkers
  for Pancreatic Cancer").
- TCGA-PAAD (PanCancer Atlas) pela API pública do cBioPortal: dados clínicos,
  mutações e alterações de número de cópias (CNA) de genes-chave.

Uso: python -m pancreas.dados
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import pandas as pd
import requests

from .config import DADOS_BRUTOS

CABECALHOS = {"User-Agent": "Mozilla/5.0 (compatible; pancreas-identificador/1.0)"}

# --------------------------------------------------------------------------------------
# Debernardi et al. 2020 — biomarcadores urinários
# --------------------------------------------------------------------------------------

DEBERNARDI_URL = (
    "https://journals.plos.org/plosmedicine/article/file"
    "?type=supplementary&id=10.1371/journal.pmed.1003489.s009"
)
DEBERNARDI_ARQUIVO = DADOS_BRUTOS / "debernardi_2020" / "debernardi2020_S1_Table.xlsx"
DEBERNARDI_SHA256 = "ff06f003587b57bb3502ce4278050e8ddff970d1ec0c2620ddc6c6a29f8b66af"

COLUNAS_DEBERNARDI = {
    "Sample ID": "amostra",
    "Patient's Cohort": "coorte",
    "Sample Origin": "centro",
    "Age": "idade",
    "Sex": "sexo",
    "Diagnosis (1=Control, 2=Benign, 3=PDAC)": "diagnostico",
    "Stage": "estadio",
    "Benign Samples Diagnosis": "diagnostico_benigno",
    "Plasma CA19-9 U/ml": "ca19_9",
    "Creatinine mg/ml": "creatinina",
    "LYVE1 ng/ml": "lyve1",
    "REG1B ng/ml": "reg1b",
    "TFF1 ng/ml": "tff1",
    "REG1A ng/ml": "reg1a",
}

_GRUPO_ESTADIO = {
    "I": "I-II", "IA": "I-II", "IB": "I-II", "II": "I-II", "IIA": "I-II", "IIB": "I-II",
    "III": "III-IV", "IV": "III-IV",
}


def _sha256(caminho: Path) -> str:
    return hashlib.sha256(caminho.read_bytes()).hexdigest()


def baixar_debernardi(forcar: bool = False) -> Path:
    """Baixa a S1 Table oficial do PLOS Medicine e confere o SHA-256."""
    if DEBERNARDI_ARQUIVO.exists() and not forcar:
        return DEBERNARDI_ARQUIVO
    DEBERNARDI_ARQUIVO.parent.mkdir(parents=True, exist_ok=True)
    resposta = requests.get(DEBERNARDI_URL, headers=CABECALHOS, timeout=120)
    resposta.raise_for_status()
    if not resposta.content.startswith(b"PK"):
        raise RuntimeError("O PLOS não devolveu uma planilha .xlsx; tente de novo mais tarde.")
    temporario = DEBERNARDI_ARQUIVO.with_suffix(".tmp")
    temporario.write_bytes(resposta.content)
    digest = _sha256(temporario)
    if digest != DEBERNARDI_SHA256:
        temporario.unlink()
        raise RuntimeError(
            f"SHA-256 inesperado ({digest}). O arquivo publicado mudou: confira o conteúdo "
            "antes de atualizar DEBERNARDI_SHA256 e retreinar."
        )
    temporario.replace(DEBERNARDI_ARQUIVO)
    return DEBERNARDI_ARQUIVO


def carregar_debernardi() -> pd.DataFrame:
    """Devolve as 590 amostras com nomes de coluna padronizados em português.

    diagnostico: 1 = controle saudável, 2 = doença hepatobiliar benigna, 3 = PDAC.
    """
    df = pd.read_excel(baixar_debernardi()).rename(columns=COLUNAS_DEBERNARDI)
    df = df[df["diagnostico"].isin([1, 2, 3])].copy()  # descarta as notas de rodapé
    df["diagnostico"] = df["diagnostico"].astype(int)
    df["pdac"] = (df["diagnostico"] == 3).astype(int)
    df["sexo_masculino"] = (df["sexo"].str.upper() == "M").astype(int)
    df["estadio_grupo"] = df["estadio"].map(_GRUPO_ESTADIO)
    return df.reset_index(drop=True)


# --------------------------------------------------------------------------------------
# TCGA-PAAD via cBioPortal
# --------------------------------------------------------------------------------------

CBIO_API = "https://www.cbioportal.org/api"
TCGA_ESTUDO = "paad_tcga_pan_can_atlas_2018"
TCGA_PASTA = DADOS_BRUTOS / "tcga_paad"

GENES_CHAVE = [
    "KRAS", "TP53", "CDKN2A", "SMAD4", "ARID1A", "RNF43", "KDM6A", "TGFBR2", "GNAS",
    "BRCA1", "BRCA2", "PALB2", "ATM", "STK11", "MLH1", "MSH2", "MSH6", "PMS2",
    "BRAF", "ERBB2", "PIK3CA", "MAP2K4", "MYC", "NRG1", "NTRK1", "NTRK2", "NTRK3",
    "ALK", "ROS1", "RET",
]


def cbioportal(metodo: str, caminho: str, **kwargs):
    """Chamada à API pública do cBioPortal com novas tentativas em falhas transitórias."""
    for tentativa in range(4):
        try:
            resposta = requests.request(
                metodo,
                f"{CBIO_API}{caminho}",
                headers={"Accept": "application/json", **CABECALHOS},
                timeout=120,
                **kwargs,
            )
            resposta.raise_for_status()
            return resposta.json()
        except (requests.ConnectionError, requests.Timeout, requests.HTTPError) as erro:
            status = getattr(getattr(erro, "response", None), "status_code", None)
            definitivo = status is not None and status < 500 and status != 429
            if definitivo or tentativa == 3:
                raise
            time.sleep(3 * 2**tentativa)


def _pivotar(registros: list[dict], indice: list[str]) -> pd.DataFrame:
    longo = pd.DataFrame(registros)
    return (
        longo.pivot_table(index=indice, columns="clinicalAttributeId", values="value", aggfunc="first")
        .reset_index()
        .rename_axis(columns=None)
    )


def baixar_tcga_clinico(forcar: bool = False) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Dados clínicos por paciente e por amostra do TCGA-PAAD (PanCancer Atlas)."""
    destino_pacientes = TCGA_PASTA / "clinico_pacientes.csv"
    destino_amostras = TCGA_PASTA / "clinico_amostras.csv"
    if destino_pacientes.exists() and destino_amostras.exists() and not forcar:
        return pd.read_csv(destino_pacientes), pd.read_csv(destino_amostras)

    TCGA_PASTA.mkdir(parents=True, exist_ok=True)
    parametros = {"projection": "SUMMARY", "pageSize": 100000}
    pacientes = _pivotar(
        cbioportal("GET", f"/studies/{TCGA_ESTUDO}/clinical-data",
                   params={"clinicalDataType": "PATIENT", **parametros}),
        ["patientId"],
    )
    amostras = _pivotar(
        cbioportal("GET", f"/studies/{TCGA_ESTUDO}/clinical-data",
                   params={"clinicalDataType": "SAMPLE", **parametros}),
        ["patientId", "sampleId"],
    )
    pacientes.to_csv(destino_pacientes, index=False)
    amostras.to_csv(destino_amostras, index=False)
    return pacientes, amostras


def mapear_genes(simbolos: list[str]) -> dict[str, int]:
    """Símbolo HUGO -> Entrez Gene ID (genes inexistentes são omitidos)."""
    genes = cbioportal("POST", "/genes/fetch", params={"geneIdType": "HUGO_GENE_SYMBOL"},
                       json=[s.upper() for s in simbolos])
    return {g["hugoGeneSymbol"]: g["entrezGeneId"] for g in genes}


def buscar_alteracoes(simbolos: list[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Mutações somáticas e CNA profundas (deleção homozigótica/amplificação) dos genes."""
    entrez = mapear_genes(simbolos)
    if not entrez:
        return pd.DataFrame(), pd.DataFrame()
    simbolo_por_id = {v: k for k, v in entrez.items()}
    corpo = {"sampleListId": f"{TCGA_ESTUDO}_all", "entrezGeneIds": list(entrez.values())}

    mutacoes = pd.DataFrame(cbioportal(
        "POST", f"/molecular-profiles/{TCGA_ESTUDO}_mutations/mutations/fetch",
        params={"projection": "SUMMARY"}, json=corpo,
    ))
    cna = pd.DataFrame(cbioportal(
        "POST", f"/molecular-profiles/{TCGA_ESTUDO}_gistic/discrete-copy-number/fetch",
        params={"projection": "SUMMARY", "discreteCopyNumberEventType": "HOMDEL_AND_AMP"}, json=corpo,
    ))
    for tabela in (mutacoes, cna):
        if not tabela.empty:
            tabela["gene"] = tabela["entrezGeneId"].map(simbolo_por_id)
    colunas_mut = ["patientId", "sampleId", "gene", "proteinChange", "mutationType", "variantType"]
    colunas_cna = ["patientId", "sampleId", "gene", "alteration"]
    mutacoes = mutacoes[[c for c in colunas_mut if c in mutacoes.columns]] if not mutacoes.empty else mutacoes
    cna = cna[[c for c in colunas_cna if c in cna.columns]] if not cna.empty else cna
    return mutacoes, cna


def listas_de_amostras() -> dict[str, list[str]]:
    """Amostras perfiladas (denominadores das frequências de alteração)."""
    listas = {}
    for sufixo in ("all", "sequenced", "cna", "cnaseq"):
        dados = cbioportal("GET", f"/sample-lists/{TCGA_ESTUDO}_{sufixo}")
        listas[sufixo] = dados.get("sampleIds", [])
    return listas


def baixar_tcga_genomica(forcar: bool = False) -> None:
    """Cache local das alterações dos genes-chave (permite uso offline no evento)."""
    destino = TCGA_PASTA / "genomica.json"
    if destino.exists() and not forcar:
        return
    TCGA_PASTA.mkdir(parents=True, exist_ok=True)
    mutacoes, cna = buscar_alteracoes(GENES_CHAVE)
    pacote = {
        "estudo": TCGA_ESTUDO,
        "baixado_em": time.strftime("%Y-%m-%d"),
        "genes": GENES_CHAVE,
        "listas": listas_de_amostras(),
        "mutacoes": mutacoes.to_dict(orient="records"),
        "cna": cna.to_dict(orient="records"),
    }
    destino.write_text(json.dumps(pacote, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    caminho = baixar_debernardi()
    df = carregar_debernardi()
    print(f"Debernardi 2020: {len(df)} amostras em {caminho}")
    pacientes, amostras = baixar_tcga_clinico()
    print(f"TCGA-PAAD clínico: {len(pacientes)} pacientes, {len(amostras)} amostras")
    baixar_tcga_genomica()
    print(f"TCGA-PAAD genômica: cache em {TCGA_PASTA / 'genomica.json'}")


if __name__ == "__main__":
    main()

"""Frequência de alterações genéticas no TCGA-PAAD (cache local ou API do cBioPortal)."""

from __future__ import annotations

import json
from functools import lru_cache

import pandas as pd

from .dados import TCGA_ESTUDO, TCGA_PASTA, baixar_tcga_genomica, buscar_alteracoes, mapear_genes

NOTAS_GENES = {
    "KRAS": "Mutado em ~90% dos PDAC (G12D > G12V > G12R). KRAS selvagem: pesquisar fusões NRG1, NTRK, ALK, "
            "ROS1, RET e BRAF. G12C é raro (~1–2%) e tem inibidores específicos. No TCGA a frequência parece "
            "menor porque parte das amostras tem baixa celularidade tumoral.",
    "TP53": "Alterado em ~70% dos PDAC; associado a agressividade; sem terapia-alvo aprovada.",
    "CDKN2A": "Inativado em ~90% (mutação, deleção homozigótica ou metilação). Variante germinativa (síndrome "
              "FAMMM: melanoma + pâncreas) indica vigilância a partir de ~40 anos.",
    "SMAD4": "Perdido em ~50% dos PDAC; associado a padrão de disseminação metastática.",
    "BRCA1": "Deficiência de recombinação homóloga: sensibilidade a platina; olaparibe de manutenção se germinativo.",
    "BRCA2": "Deficiência de recombinação homóloga: sensibilidade a platina; olaparibe de manutenção se "
             "germinativo (estudo POLO). Familiares: aconselhamento genético.",
    "PALB2": "Recombinação homóloga: sensibilidade a platina. Variante germinativa aumenta o risco familiar.",
    "ATM": "Variante germinativa aumenta o risco de PDAC; possível benefício de platina (evidência menor).",
    "MLH1": "Reparo de mal pareamento (Lynch). dMMR/MSI-H (~1% dos PDAC): candidato a imunoterapia.",
    "MSH2": "Reparo de mal pareamento (Lynch). dMMR/MSI-H: candidato a imunoterapia.",
    "MSH6": "Reparo de mal pareamento (Lynch). dMMR/MSI-H: candidato a imunoterapia.",
    "PMS2": "Reparo de mal pareamento. dMMR/MSI-H: candidato a imunoterapia.",
    "NTRK1": "Fusões raras (<1%), sobretudo em KRAS selvagem: larotrectinibe/entrectinibe (agnósticos de tumor).",
    "NTRK2": "Fusões raras: inibidores de TRK (agnósticos de tumor).",
    "NTRK3": "Fusões raras: inibidores de TRK (agnósticos de tumor).",
    "NRG1": "Fusões raras, enriquecidas em KRAS selvagem: zenocutuzumabe (aprovado pela FDA em 2024).",
    "ALK": "Fusões raras em KRAS selvagem: inibidores de ALK.",
    "ROS1": "Fusões raras em KRAS selvagem: inibidores de ROS1.",
    "RET": "Fusões raras em KRAS selvagem: selpercatinibe (agnóstico de tumor).",
    "BRAF": "V600E ou fusões em KRAS selvagem; V600E: dabrafenibe + trametinibe (agnóstico de tumor).",
    "ERBB2": "Amplificação rara; HER2 IHQ 3+ pode ter opção agnóstica (trastuzumabe deruxtecana).",
    "STK11": "Variante germinativa: síndrome de Peutz-Jeghers, vigilância pancreática a partir de ~40 anos.",
    "GNAS": "Típico de IPMN; sugere carcinoma originado de IPMN.",
    "RNF43": "Frequente em IPMN e em parte dos PDAC; sem terapia-alvo aprovada.",
    "ARID1A": "Remodelação de cromatina; sem terapia-alvo aprovada.",
    "KDM6A": "Regulador epigenético; associado ao subtipo escamoso/basal.",
    "MYC": "Amplificação associada a doença agressiva.",
    "PIK3CA": "Raro em PDAC; inibidores em estudo.",
    "TGFBR2": "Via TGF-β; supressor tumoral sem terapia-alvo.",
    "MAP2K4": "Supressor tumoral; sem terapia-alvo.",
}


@lru_cache
def _cache() -> dict:
    baixar_tcga_genomica()
    return json.loads((TCGA_PASTA / "genomica.json").read_text(encoding="utf-8"))


def frequencia_alteracoes(gene: str) -> dict:
    """Mutações e CNA profundas do gene no TCGA-PAAD, com denominadores perfilados."""
    gene = gene.strip().upper()
    cache = _cache()
    if gene in cache["genes"]:
        mutacoes = pd.DataFrame(cache["mutacoes"])
        cna = pd.DataFrame(cache["cna"])
        origem = f"cache local ({cache['baixado_em']})"
    else:
        if gene not in mapear_genes([gene]):
            raise ValueError(f"Gene '{gene}' não encontrado (use o símbolo HUGO, ex.: KRAS, BRCA2).")
        mutacoes, cna = buscar_alteracoes([gene])
        origem = "API do cBioPortal (consulta ao vivo)"

    listas = cache["listas"]
    sequenciadas, com_cna, ambas = set(listas["sequenced"]), set(listas["cna"]), set(listas["cnaseq"])
    do_gene = mutacoes[mutacoes["gene"] == gene] if not mutacoes.empty else mutacoes
    cna_gene = cna[cna["gene"] == gene] if not cna.empty else cna

    mutadas = set(do_gene["sampleId"]) & sequenciadas if not do_gene.empty else set()
    delecoes = set(cna_gene.loc[cna_gene["alteration"] == -2, "sampleId"]) & com_cna if not cna_gene.empty else set()
    amplificacoes = set(cna_gene.loc[cna_gene["alteration"] == 2, "sampleId"]) & com_cna if not cna_gene.empty else set()
    alteradas = (mutadas | delecoes | amplificacoes) & ambas

    def pct(parte: int, total: int) -> float:
        return round(100 * parte / total, 1) if total else 0.0

    variantes = (do_gene["proteinChange"].value_counts().head(8).to_dict() if not do_gene.empty else {})
    tipos = (do_gene["mutationType"].value_counts().to_dict() if not do_gene.empty else {})
    return {
        "gene": gene,
        "estudo": f"TCGA-PAAD PanCancer Atlas ({TCGA_ESTUDO})",
        "origem_dos_dados": origem,
        "mutacao": {"amostras": len(mutadas), "perfiladas": len(sequenciadas), "percentual": pct(len(mutadas), len(sequenciadas))},
        "delecao_homozigotica": {"amostras": len(delecoes), "perfiladas": len(com_cna),
                                 "percentual": pct(len(delecoes), len(com_cna))},
        "amplificacao": {"amostras": len(amplificacoes), "perfiladas": len(com_cna),
                         "percentual": pct(len(amplificacoes), len(com_cna))},
        "qualquer_alteracao": {"amostras": len(alteradas), "perfiladas": len(ambas),
                               "percentual": pct(len(alteradas), len(ambas))},
        "variantes_mais_frequentes": variantes,
        "tipos_de_mutacao": tipos,
        "nota_clinica": NOTAS_GENES.get(gene, "Sem nota clínica curada para este gene."),
        "limitacoes": "Fusões (NRG1, NTRK etc.) e metilação não estão incluídas; parte das amostras do TCGA tem "
                      "baixa pureza tumoral, o que subestima frequências.",
    }

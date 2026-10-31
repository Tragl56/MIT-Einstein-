"""Modo guiado do agente local: extração, verificação e relatório (sem precisar do Ollama)."""

import pytest

from pancreas.agente import CASOS_EXEMPLO
from pancreas.agente_local import (
    AgenteLocal,
    detectar_achados,
    detectar_familia,
    detectar_genes,
    detectar_patologia,
    detectar_valores,
)
from pancreas.config import AVISO_CLINICO, MODELOS
from pancreas.teste_agente import numeros_sem_origem

CASO_1, CASO_2, CASO_3 = CASOS_EXEMPLO


def test_achados_respeitam_negacao():
    achados = detectar_achados(CASO_1)
    assert {"ictericia", "perda_peso_nao_intencional", "diabetes_inicio_recente"} <= set(achados)
    assert "dor_abdominal_ou_dorsal" not in achados  # "icterícia indolor"
    assert "ictericia" not in detectar_achados("Mulher de 70 anos, nega icterícia, dor epigástrica")
    assert "tabagismo_atual" not in detectar_achados("Homem de 60 anos, ex-fumante")
    assert "diabetes_inicio_recente" not in detectar_achados("Diabetes diagnosticado há 10 anos")


def test_valores_e_unidades():
    valores = detectar_valores(CASO_1)
    assert valores["idade"] == 68 and valores["ca19_9"] == 410 and valores["lyve1"] == 6.1
    assert valores["creatinina"] == 80 and valores["unidade_creatinina"] == "mg/dL"
    assert detectar_valores("Dor há 3 anos, paciente de 71 anos")["idade"] == 71
    # O "1" de LYVE1 não pode virar valor de CA19-9.
    sem_ca = detectar_valores("CA19-9 não dosado, LYVE1 6,1 ng/mL")
    assert "ca19_9" not in sem_ca and sem_ca["lyve1"] == 6.1


def test_patologia_genes_e_familia():
    assert detectar_patologia(CASO_3) == {"operado": True, "t": "T3", "n": "N1", "grau": "G3"}
    assert "grau" not in detectar_patologia("KRAS G12D")
    genes, germinativo = detectar_genes(CASO_3)
    assert genes == {"KRAS": True, "TP53": True} and germinativo is None
    assert detectar_genes("Tumor com KRAS selvagem.")[0] == {"KRAS": False}
    assert detectar_genes(CASO_2)[1] == "BRCA2"
    familia = detectar_familia(CASO_2)
    assert (familia["primeiro_grau"], familia["mesmo_lado"]) == (1, 2)


def test_valores_do_llama_sem_origem_no_texto_sao_descartados(monkeypatch):
    agente = AgenteLocal("qualquer")
    monkeypatch.setattr(agente, "_extrair_com_llama", lambda texto: {
        "idade": 70, "ca19_9": 500, "creatinina": None, "lyve1": None, "reg1b": None, "tff1": None,
        "achados": [{"campo": "dor_abdominal_ou_dorsal", "trecho": "icterícia"}],
        "parentes_primeiro_grau": 0, "parentes_mesmo_lado": 0, "variante_germinativa": "BRCA1", "operado": False})
    extraido = agente.extrair("Homem de 70 anos com icterícia.")
    assert "ca19_9" not in extraido["valores"]
    assert "dor_abdominal_ou_dorsal" not in extraido["achados"]
    assert extraido["germinativo"] is None
    assert len(extraido["descartados"]) == 3


@pytest.mark.skipif(not (MODELOS / "biomarcadores_painel_urinario.joblib").exists(), reason="modelos não treinados")
def test_relatorio_do_caso_1_sem_llama_e_rastreavel(monkeypatch):
    agente = AgenteLocal("qualquer")
    monkeypatch.setattr(agente, "_extrair_com_llama", lambda texto: None)
    resposta = agente.perguntar(CASO_1)
    assert "Prioridade: URGENTE" in resposta.texto and "**ALTA**" in resposta.texto
    assert "Dor abdominal" not in resposta.texto and "Esteatorreia" not in resposta.texto
    assert "sem CA19-9" in resposta.texto  # icterícia: mostra também o painel sem CA19-9
    fontes = [CASO_1, AVISO_CLINICO, *(u["saida"] for u in resposta.ferramentas_usadas)]
    assert numeros_sem_origem(resposta.texto, fontes) == []
    continuacao = agente.perguntar("Se o painel urinário tivesse vindo normal e o CA19-9 fosse 20 U/mL, mudaria?")
    assert "URGENTE → URGENTE (sem mudança)" in continuacao.texto


def test_numero_do_nome_do_exame_nao_vale_como_valor(monkeypatch):
    agente = AgenteLocal("qualquer")
    monkeypatch.setattr(agente, "_extrair_com_llama", lambda texto: {
        "idade": None, "ca19_9": 19, "creatinina": None, "lyve1": 1, "reg1b": None, "tff1": None, "achados": [],
        "parentes_primeiro_grau": 0, "parentes_mesmo_lado": 0, "variante_germinativa": None, "operado": False})
    extraido = agente.extrair("O que é o CA19-9 e o LYVE1?")
    assert "ca19_9" not in extraido["valores"] and "lyve1" not in extraido["valores"]
    assert "CA19-9" in agente.perguntar("O que é o CA19-9 e quando devo pedir?").texto


def test_numeros_sem_origem():
    assert numeros_sem_origem("AUROC 0,89 e 75%", ["0.888", "0.751"]) == []
    assert numeros_sem_origem("frequência de 10,7%", ["0.011"]) == ["10,7"]

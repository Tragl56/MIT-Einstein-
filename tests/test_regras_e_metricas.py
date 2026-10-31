import numpy as np
import pandas as pd
import pytest

from pancreas import metricas as M
from pancreas.conhecimento import avaliar_sinais_e_fatores, referencia
from pancreas.features import EngenhariaBiomarcadores
from pancreas.inferencia import ajustar_prevalencia, converter_creatinina
from pancreas.privacidade import anonimizar


def test_engenharia_cria_logs_e_razoes():
    X = pd.DataFrame({"idade": [60.0], "creatinina": [1.0], "lyve1": [2.0], "reg1b": [10.0], "tff1": [100.0]})
    saida = EngenhariaBiomarcadores(razoes_creatinina=True).fit(X).transform(X)
    assert "idade" in saida.columns and "log_lyve1" in saida.columns
    assert saida.loc[0, "log_lyve1_por_creatinina"] == pytest.approx(saida.loc[0, "log_lyve1"] - saida.loc[0, "log_creatinina"])


def test_limiares_respeitam_alvos():
    gerador = np.random.default_rng(0)
    y = np.r_[np.ones(200), np.zeros(400)]
    p = np.r_[gerador.beta(5, 2, 200), gerador.beta(2, 5, 400)]
    limiar = M.limiar_para_sensibilidade(y, p, 0.90)
    assert np.mean(p[y == 1] >= limiar) >= 0.90
    limiar = M.limiar_para_especificidade(y, p, 0.95)
    assert np.mean(p[y == 0] < limiar) >= 0.95


def test_wilson_e_valores_preditivos():
    baixo, alto = M.wilson(45, 50)
    assert baixo < 0.9 < alto
    vp = M.valores_preditivos(0.9, 0.9, 0.01)
    assert vp["vpp"] == pytest.approx(0.009 / (0.009 + 0.099))


def test_ajuste_de_prevalencia_preserva_mesma_prevalencia():
    assert ajustar_prevalencia(0.4, 0.34, 0.34) == pytest.approx(0.4)
    assert ajustar_prevalencia(0.4, 0.34, 0.03) < 0.1


def test_conversao_creatinina():
    assert converter_creatinina(85, "mg/dL") == pytest.approx(0.85)
    assert converter_creatinina(0.85, "mg/mL") == pytest.approx(0.85)
    with pytest.raises(ValueError):
        converter_creatinina(1, "g/L")


def test_ictericia_apos_40_e_urgente():
    r = avaliar_sinais_e_fatores(idade=67, ictericia=True)
    assert r["nivel_prioridade"] == "urgente"


def test_nice_60_anos_perda_de_peso_com_acompanhante():
    assert avaliar_sinais_e_fatores(idade=65, perda_peso_nao_intencional=True,
                                    dor_abdominal_ou_dorsal=True)["nivel_prioridade"] == "urgente"
    assert avaliar_sinais_e_fatores(idade=65, perda_peso_nao_intencional=True)["nivel_prioridade"] == "orientacao"


def test_brca2_exige_parente_de_primeiro_grau():
    sem_parente = avaliar_sinais_e_fatores(idade=55, variante_germinativa="BRCA2")
    assert sem_parente["nivel_prioridade"] == "orientacao"
    assert sem_parente["criterios_alto_risco"][0]["elegivel_vigilancia"] is False
    com_parente = avaliar_sinais_e_fatores(idade=55, variante_germinativa="brca2",
                                           parentes_primeiro_grau_com_cancer_pancreas=1)
    assert com_parente["nivel_prioridade"] == "vigilancia_especializada"


def test_cdkn2a_antes_da_idade_de_inicio():
    r = avaliar_sinais_e_fatores(idade=35, variante_germinativa="CDKN2A")
    assert r["nivel_prioridade"] == "orientacao"
    assert r["criterios_alto_risco"][0]["elegivel_vigilancia"] is False


def test_cisto_fukuoka():
    preocupante = avaliar_sinais_e_fatores(idade=70, cisto_pancreatico=True, cisto_tamanho_mm=32)
    assert preocupante["nivel_prioridade"] == "investigar"
    estigma = avaliar_sinais_e_fatores(idade=70, cisto_pancreatico=True, ducto_pancreatico_principal_mm=11)
    assert estigma["nivel_prioridade"] == "urgente"


def test_orientacoes_do_caso_urgente():
    o = avaliar_sinais_e_fatores(idade=67, ictericia=True, esteatorreia=True)["orientacoes"]
    assert o["titulo"] == "URGENTE"
    assert o["exames_sugeridos"][0].startswith("TC de abdome com protocolo pancreático")
    assert any("Elastase fecal" in e for e in o["exames_sugeridos"])
    assert "Lei 13.896/2019" in o["direitos_sus"]
    assert "Classificação: URGENTE" in o["nota_para_prontuario"] and "Idade: 67 anos" in o["nota_para_prontuario"]
    assert not any("amarelados" in p for p in o["perguntas_que_faltam"])  # icterícia já informada


def test_orientacoes_sem_criterio_trazem_rede_de_seguranca():
    o = avaliar_sinais_e_fatores(idade=45, dor_abdominal_ou_dorsal=True)["orientacoes"]
    assert o["titulo"] == "SEM CRITÉRIO AGORA" and o["direitos_sus"] is None
    assert "2 a 4 semanas" in o["prazo"]
    assert any("emergência" in sinal for sinal in o["sinais_de_retorno"])
    assert any("amarelados" in p for p in o["perguntas_que_faltam"])
    assert not any("Dor no abdome" in p for p in o["perguntas_que_faltam"])


def test_orientacoes_de_vigilancia():
    o = avaliar_sinais_e_fatores(idade=55, variante_germinativa="BRCA2",
                                 parentes_primeiro_grau_com_cancer_pancreas=1)["orientacoes"]
    assert o["titulo"] == "VIGILÂNCIA ESPECIALIZADA"
    assert any("programa de vigilância" in e for e in o["exames_sugeridos"])
    assert not any("Pai, mãe" in p for p in o["perguntas_que_faltam"])


def test_referencia_desconhecida():
    assert "AJCC" in referencia("estadiamento_ajcc")
    with pytest.raises(KeyError):
        referencia("inexistente")


@pytest.mark.parametrize("texto,esperado", [
    ("Paciente: João da Silva, CPF 123.456.789-09", "Paciente [NOME], CPF [CPF]"),
    ("Sra. Maria relata dor epigástrica", "Sra. [NOME] relata dor epigástrica"),
    ("contato (11) 98765-4321 ou ana@hospital.org", "contato [TELEFONE] ou [EMAIL]"),
    ("prontuário 445566, nascido em 12/03/1955", "prontuário [REGISTRO], nascido em [DATA]"),
])
def test_anonimiza_identificadores(texto, esperado):
    assert anonimizar(texto)[0] == esperado


def test_nao_altera_texto_clinico():
    texto = "Homem de 67 anos, CA19-9 450 U/mL, LYVE1 5,6 ng/mL, paciente com icterícia, pT3 pN1 G2"
    assert anonimizar(texto) == (texto, 0)

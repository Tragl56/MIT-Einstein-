"""Testes que dependem dos modelos treinados (pulados se ainda não existirem)."""

import json

import pytest

from pancreas import cli, inferencia
from pancreas.config import MODELOS

pytestmark = pytest.mark.skipif(
    not (MODELOS / "biomarcadores_painel_urinario.joblib").exists()
    or not (MODELOS / "prognostico_tcga.joblib").exists(),
    reason="rode python -m pancreas.treino_biomarcadores e python -m pancreas.treino_prognostico",
)

# Medianas reais dos grupos no dataset de Debernardi 2020 (creatinina em mg/mL).
CONTROLE = dict(idade=57, creatinina=0.713, lyve1=0.146, reg1b=17.6, tff1=59.8)
PDAC = dict(idade=67, creatinina=0.724, lyve1=5.62, reg1b=123.1, tff1=722.5)


def test_pdac_tipico_tem_probabilidade_maior_que_controle():
    controle = inferencia.avaliar_biomarcadores(**CONTROLE, unidade_creatinina="mg/mL")
    pdac = inferencia.avaliar_biomarcadores(**PDAC, unidade_creatinina="mg/mL")
    assert pdac["probabilidade_pdac_no_estudo"] > controle["probabilidade_pdac_no_estudo"]
    assert controle["faixa"] == "baixa"
    assert pdac["faixa"] in {"intermediaria", "alta"}
    assert pdac["contribuicoes"][0]["efeito_na_probabilidade"] > 0


def test_mg_dl_equivale_a_mg_ml():
    a = inferencia.avaliar_biomarcadores(**PDAC, unidade_creatinina="mg/mL")
    b = inferencia.avaliar_biomarcadores(**{**PDAC, "creatinina": 72.4}, unidade_creatinina="mg/dL")
    assert a["probabilidade_pdac_no_estudo"] == pytest.approx(b["probabilidade_pdac_no_estudo"])


def test_ca19_9_usa_o_outro_modelo():
    r = inferencia.avaliar_biomarcadores(**PDAC, ca19_9=427.5, unidade_creatinina="mg/mL")
    assert r["modelo"] == "painel_urinario_ca19_9"


def test_entrada_fora_da_faixa_e_recusada():
    with pytest.raises(ValueError):
        inferencia.avaliar_biomarcadores(**{**PDAC, "creatinina": 72.4}, unidade_creatinina="mg/mL")


def test_prognostico_ordena_risco():
    favoravel = inferencia.estimar_prognostico(idade=50, estadio_t="T1", estadio_n="N0", grau="G1",
                                               kras_mutado=False, tp53_mutado=False,
                                               cdkn2a_alterado=False, smad4_alterado=False)
    desfavoravel = inferencia.estimar_prognostico(idade=80, estadio_t="T3", estadio_n="N1", grau="G3",
                                                  kras_mutado=True, tp53_mutado=True,
                                                  cdkn2a_alterado=True, smad4_alterado=True)
    assert favoravel["sobrevida_global_estimada"]["24_meses"] > desfavoravel["sobrevida_global_estimada"]["24_meses"]
    assert desfavoravel["grupo_de_risco"] == "alto"


def test_cli_biomarcadores(capsys):
    codigo = cli.main(["biomarcadores", "--idade", "67", "--creatinina", "72.4", "--lyve1", "5.62",
                       "--reg1b", "123.1", "--tff1", "722.5"])
    assert codigo == 0
    assert "probabilidade_pdac_no_estudo" in json.loads(capsys.readouterr().out)


def test_ferramentas_do_agente_sem_api():
    from pancreas.agente import FERRAMENTAS, montar_prompt_sistema

    nomes = {f.to_dict()["name"] for f in FERRAMENTAS}
    assert "avaliar_biomarcadores_urinarios" in nomes
    prompt = montar_prompt_sistema()
    assert "Formato do relatório" in prompt and "Painel urinário" in prompt
    erro = json.loads(FERRAMENTAS[0].call({"idade": 67, "creatinina_urinaria": 72.4, "unidade_creatinina": "furlongs",
                                           "lyve1_ng_ml": 5, "reg1b_ng_ml": 100, "tff1_ng_ml": 700}))
    assert "erro" in erro

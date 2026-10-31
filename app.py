"""Interface do evento: triagem clínica, biomarcadores, prognóstico/genômica, agente de IA e métricas.

Rodar:  streamlit run app.py
As abas de modelos funcionam offline; só a aba do agente precisa de ANTHROPIC_API_KEY e internet.
"""

from __future__ import annotations

import json
import os

import anthropic
import pandas as pd
import requests
import streamlit as st

from pancreas import conhecimento, genomica, inferencia
from pancreas.agente import CASOS_EXEMPLO, AgenteConsulta
from pancreas.agente_local import AgenteLocal, modelos_disponiveis
from pancreas.config import AVISO_CLINICO, RELATORIOS
from pancreas.privacidade import anonimizar

st.set_page_config(page_title="Identificador de Câncer de Pâncreas", page_icon="🩺", layout="wide")

CAIXA_PRIORIDADE = {
    "urgente": st.error, "investigar": st.warning, "vigilancia_especializada": st.info, "orientacao": st.success,
}
CONDUTA_RESUMIDA = {
    "urgente": "Investigar já e encaminhar pela via de suspeita de câncer.",
    "investigar": "Pedir exame de imagem do pâncreas com prioridade.",
    "vigilancia_especializada": "Encaminhar a programa de vigilância para alto risco.",
    "orientacao": "Sem indicação de investigar o pâncreas agora: tratar a causa provável e combinar retorno.",
}
# rótulo curto -> (campo das regras, explicação mostrada ao passar o mouse)
SINTOMAS = {
    "Icterícia": ("ictericia", "Pele ou olhos amarelados, urina escura ou fezes claras."),
    "Perda de peso": ("perda_peso_nao_intencional", "Perda de peso não intencional, sem explicação."),
    "Dor abdominal/dorsal": ("dor_abdominal_ou_dorsal", "Dor no abdome superior ou nas costas."),
    "Náusea, vômito, diarreia": ("sintomas_gastrointestinais", "Náusea, vômitos, diarreia ou constipação novos."),
    "Diabetes recente": ("diabetes_inicio_recente", "Diabetes que começou há 3 anos ou menos."),
    "Fezes gordurosas": ("esteatorreia", "Esteatorreia: fezes gordurosas, que boiam."),
    "Massa palpável": ("massa_abdominal_palpavel", "Massa abdominal palpável ao exame."),
    "Pancreatite sem causa": ("pancreatite_aguda_sem_causa", "Pancreatite aguda sem causa aparente."),
}
HISTORICO = {
    "Fumante": ("tabagismo_atual", "Tabagismo atual."),
    "Pancreatite crônica": ("pancreatite_cronica", None),
    "Pancreatite hereditária": ("pancreatite_hereditaria", "Ex.: mutação em PRSS1."),
    "Cisto no pâncreas": ("cisto_pancreatico", "Cisto ou IPMN visto em exame de imagem."),
}
GENES_GERMINATIVOS = ["Nenhuma conhecida", "BRCA2", "BRCA1", "PALB2", "ATM", "CDKN2A", "STK11", "MLH1", "MSH2",
                      "MSH6", "EPCAM", "Outro gene"]

# Medianas reais de cada grupo no dataset de Debernardi 2020 (creatinina em mg/dL).
EXEMPLOS_BIOMARCADORES = {
    "Preencher manualmente": None,
    "Perfil típico de controle saudável": dict(idade=57, creatinina=71.3, lyve1=0.15, reg1b=17.6, tff1=59.8, ca19_9=None),
    "Perfil típico de doença benigna (ex.: pancreatite)": dict(idade=54, creatinina=74.6, lyve1=1.21, reg1b=20.2,
                                                               tff1=210.2, ca19_9=17.0),
    "Perfil típico de PDAC": dict(idade=67, creatinina=72.4, lyve1=5.62, reg1b=123.1, tff1=722.5, ca19_9=427.5),
}


def _texto_para_o_paciente(orientacoes: dict) -> str:
    linhas = ["ORIENTAÇÕES DA CONSULTA — AVALIAÇÃO DO PÂNCREAS", "", orientacoes["explicacao_ao_paciente"], "",
              f"Próximos passos: {orientacoes['prazo']}", "",
              "Procure atendimento antes do retorno (ou a emergência) se tiver:"]
    linhas += [f"- {sinal}" for sinal in orientacoes["sinais_de_retorno"]]
    linhas += ["", "Estas são orientações gerais. Siga sempre as instruções do seu médico."]
    return "\n".join(linhas)


def aba_modo_consulta() -> None:
    st.subheader("Estou com receio de câncer de pâncreas. E agora?")
    st.caption("Marque o que o paciente tem: a orientação aparece na hora, segue diretrizes (NICE NG12, CAPS 2020, "
               "Fukuoka 2017) e nada sai deste computador.")
    entrada, saida = st.columns([1, 1], gap="large")
    with entrada:
        idade = st.number_input("Idade do paciente", 18, 100, 60, key="mc_idade")
        # Caixas em duas colunas: todas as opções ficam visíveis (pills cortavam as opções numa linha só).
        st.markdown("**Sintomas e sinais**")
        colunas = st.columns(2)
        marcados = {campo for i, (rotulo, (campo, ajuda)) in enumerate(SINTOMAS.items())
                    if colunas[i % 2].checkbox(rotulo, help=ajuda, key=f"mc_s{i}")}
        st.markdown("**Histórico**")
        colunas = st.columns(2)
        marcados |= {campo for i, (rotulo, (campo, ajuda)) in enumerate(HISTORICO.items())
                     if colunas[i % 2].checkbox(rotulo, help=ajuda, key=f"mc_h{i}")}
        with st.expander("História familiar e genética"):
            p1 = st.number_input("Parentes de 1º grau com câncer de pâncreas", 0, 10, 0, key="mc_p1")
            pl = st.number_input("Total de parentes afetados do mesmo lado da família", 0, 10, 0, key="mc_pl",
                                 help="Inclua os de 1º grau.")
            gene = st.selectbox("Mutação germinativa conhecida", GENES_GERMINATIVOS, key="mc_gene")
        with st.expander("Exames que já tem (opcional)"):
            ca = st.number_input("CA19-9 sérico (U/mL; 0 = não tem)", 0.0, 200000.0, 0.0, key="mc_ca")
            cisto_mm = st.number_input("Maior diâmetro do cisto (mm)", 0.0, 200.0, 0.0, key="mc_cisto")
            nodulo = st.number_input("Nódulo mural com realce (mm)", 0.0, 50.0, 0.0, key="mc_nodulo")
            ducto = st.number_input("Ducto pancreático principal (mm)", 0.0, 30.0, 0.0, key="mc_ducto")
            imc = st.number_input("IMC (0 = não informado)", 0.0, 80.0, 0.0, step=0.5, key="mc_imc")

    cisto = "cisto_pancreatico" in marcados or cisto_mm > 0
    tem_dados = bool(marcados or p1 or pl or gene != "Nenhuma conhecida" or ca or cisto_mm or ducto or imc)
    r = conhecimento.avaliar_sinais_e_fatores(
        idade=int(idade), **{campo: True for campo in marcados if campo != "cisto_pancreatico"},
        cisto_pancreatico=cisto, parentes_primeiro_grau_com_cancer_pancreas=int(p1),
        parentes_mesmo_lado_com_cancer_pancreas=max(int(pl), int(p1)),
        variante_germinativa=None if gene in {"Nenhuma conhecida", "Outro gene"} else gene,
        imc=imc or None, cisto_tamanho_mm=cisto_mm or None, nodulo_mural_mm=nodulo if cisto else None,
        ducto_pancreatico_principal_mm=ducto or None, ca19_9_u_ml=ca or None,
    )
    o = r["orientacoes"]
    with saida:
        if not tem_dados:
            st.info("Marque os sintomas e o histórico do paciente para ver a orientação. Enquanto isso, estas são as "
                    "perguntas que mais ajudam a decidir:")
            for pergunta in o["perguntas_que_faltam"]:
                st.markdown(f"- {pergunta}")
            return
        CAIXA_PRIORIDADE[r["nivel_prioridade"]](f"### {o['titulo']}\n{CONDUTA_RESUMIDA[r['nivel_prioridade']]}")

        st.markdown("**Por quê**")
        motivos = [f"{i['achado']} ({conhecimento.fonte_curta(i['fonte'])})" for i in r["sinais_de_alarme"]]
        motivos += [f"{i['criterio']} — {'elegível agora' if i['elegivel_vigilancia'] else 'ainda não elegível'} "
                    f"({conhecimento.fonte_curta(i['fonte'])})" for i in r["criterios_alto_risco"]]
        if r["cisto_pancreatico"]:
            c = r["cisto_pancreatico"]
            motivos.append(f"Cisto: estigmas de alto risco {', '.join(c['estigmas_alto_risco']) or 'nenhum'}; "
                           f"características preocupantes {', '.join(c['caracteristicas_preocupantes']) or 'nenhuma'} "
                           "(Fukuoka 2017)")
        for motivo in motivos or ["Nenhum sinal de alarme ou critério de alto risco entre os dados marcados."]:
            st.markdown(f"- {motivo}")
        for texto in r["fatores_de_risco"] + r["observacoes"]:
            st.caption(f"• {texto}")
        if gene == "Outro gene":
            st.caption("• Para mutações em outros genes, discuta a necessidade de vigilância com a genética.")

        st.markdown("**O que pedir agora**")
        for i, exame in enumerate(o["exames_sugeridos"], 1):
            st.markdown(f"{i}. {exame}")
        st.markdown(f"**Prazo:** {o['prazo']}")
        if o["direitos_sus"]:
            st.caption(o["direitos_sus"])

        st.markdown("**Oriente o paciente a voltar antes, ou ir à emergência, se tiver:**")
        for sinal in o["sinais_de_retorno"]:
            st.markdown(f"- {sinal}")
        with st.expander("Como explicar ao paciente"):
            st.write(o["explicacao_ao_paciente"])
        if o["perguntas_que_faltam"]:
            with st.expander("Ainda vale perguntar", expanded=r["nivel_prioridade"] == "orientacao"):
                for pergunta in o["perguntas_que_faltam"]:
                    st.markdown(f"- {pergunta}")

        st.markdown("**Nota para o prontuário** (botão de copiar no canto do quadro)")
        st.code(o["nota_para_prontuario"], language=None, wrap_lines=True)
        st.download_button("Baixar orientações para o paciente (.txt)", data=_texto_para_o_paciente(o),
                           file_name="orientacoes_paciente.txt", mime="text/plain")
        st.caption("Tem o painel urinário? Use a aba Biomarcadores. Quer discutir o caso por texto? Use a aba Agente de IA.")


def aba_biomarcadores() -> None:
    st.subheader("Painel urinário LYVE1 · REG1B · TFF1 (± CA19-9 plasmático)")
    st.caption("Modelo calibrado treinado com Debernardi et al., PLOS Medicine 2020 (590 amostras).")
    exemplo = EXEMPLOS_BIOMARCADORES[st.selectbox("Carregar exemplo (medianas reais do estudo)",
                                                  list(EXEMPLOS_BIOMARCADORES))]
    padrao = exemplo or dict(idade=65, creatinina=75.0, lyve1=1.0, reg1b=30.0, tff1=200.0, ca19_9=None)
    with st.form("biomarcadores"):
        c1, c2, c3 = st.columns(3)
        with c1:
            idade = st.number_input("Idade (anos)", 18, 100, int(padrao["idade"]))
            unidade = st.selectbox("Unidade da creatinina urinária", ["mg/dL", "mg/mL", "mmol/L", "µmol/L"])
            creatinina = st.number_input("Creatinina urinária", 0.0, 100000.0, float(padrao["creatinina"]), step=1.0)
        with c2:
            lyve1 = st.number_input("LYVE1 (ng/mL)", 0.0, 100.0, float(padrao["lyve1"]), format="%.3f")
            reg1b = st.number_input("REG1B (ng/mL)", 0.0, 5000.0, float(padrao["reg1b"]), format="%.2f")
            tff1 = st.number_input("TFF1 (ng/mL)", 0.0, 50000.0, float(padrao["tff1"]), format="%.2f")
        with c3:
            usar_ca = st.checkbox("Tenho CA19-9 plasmático", value=padrao["ca19_9"] is not None)
            ca = st.number_input("CA19-9 (U/mL)", 0.0, 200000.0, float(padrao["ca19_9"] or 0.0))
        enviado = st.form_submit_button("Calcular", type="primary")
    if not enviado:
        return
    try:
        r = inferencia.avaliar_biomarcadores(idade=idade, creatinina=creatinina, unidade_creatinina=unidade,
                                             lyve1=lyve1, reg1b=reg1b, tff1=tff1, ca19_9=ca if usar_ca else None)
    except (ValueError, inferencia.ModeloIndisponivel) as erro:
        st.error(str(erro))
        return

    cores = {"alta": st.error, "intermediaria": st.warning, "baixa": st.success}
    cores[r["faixa"]](f"**Faixa {r['faixa'].upper()}** — {r['interpretacao']}")
    ajustada = r["probabilidade_ajustada_por_prevalencia"]
    m1, m2, m3, m4 = st.columns(4)
    m1.metric(f"Probabilidade no estudo ({r['prevalencia_no_estudo']:.0%} PDAC)", f"{r['probabilidade_pdac_no_estudo']:.0%}")
    m2.metric("Se prevalência 1% (vigilância)", f"{ajustada['populacao_alto_risco_vigilancia']['probabilidade']:.1%}")
    m3.metric("Se prevalência 3% (sintomáticos)", f"{ajustada['sintomaticos_atencao_primaria']['probabilidade']:.1%}")
    m4.metric("Se prevalência 15% (encaminhados)", f"{ajustada['encaminhados_gastro_oncologia']['probabilidade']:.1%}")
    for alerta in r["alertas"]:
        st.warning(alerta)

    st.markdown("**Pontos operacionais** (sensibilidade/especificidade medidas no conjunto de teste)")
    st.dataframe(pd.DataFrame([
        {"Ponto": k, "Critério": v["criterio"], "Limiar": v["limiar"], "Resultado": v["resultado"],
         "Sensibilidade": f"{v['sensibilidade_no_teste']:.0%}", "Especificidade": f"{v['especificidade_no_teste']:.0%}"}
        for k, v in r["pontos_operacionais"].items()
    ]), hide_index=True, width="stretch")

    st.markdown("**O que mais pesou nesta previsão** (efeito de trocar cada valor pela mediana dos não-PDAC)")
    contribuicoes = pd.DataFrame(r["contribuicoes"])
    st.bar_chart(contribuicoes.set_index("variavel")["efeito_na_probabilidade"], horizontal=True)
    st.dataframe(contribuicoes.rename(columns={
        "variavel": "Variável", "valor": "Valor", "unidade": "Unidade", "efeito_na_probabilidade": "Efeito",
        "mediana_controles": "Mediana controles", "mediana_benignos": "Mediana benignos", "mediana_pdac": "Mediana PDAC",
    }), hide_index=True, width="stretch")
    auroc = r["desempenho_validado"]["auroc_teste"]
    st.caption(f"Modelo: {r['familia_do_modelo']} · AUROC no teste {auroc['auc']:.3f} "
               f"(IC 95% {auroc['ic95'][0]:.3f}–{auroc['ic95'][1]:.3f}). {r['nota_sobre_probabilidade']}")
    for limitacao in r["limitacoes"]:
        st.caption(f"• {limitacao}")


def aba_prognostico() -> None:
    esquerda, direita = st.columns(2)
    with esquerda:
        st.subheader("Prognóstico pós-ressecção (TCGA-PAAD)")
        st.caption("Somente para PDAC operado sem metástase. Discriminação modesta (C-index ~0,59).")
        with st.form("prognostico"):
            idade = st.number_input("Idade (anos)", 18, 100, 65)
            c1, c2, c3 = st.columns(3)
            t = c1.selectbox("pT", ["T1", "T2", "T3", "T4"], index=2)
            n = c2.selectbox("pN", ["N0", "N1", "N2"], index=1)
            grau = c3.selectbox("Grau", ["G1", "G2", "G3", "G4"], index=1)
            opcoes = {"desconhecido": None, "sim": True, "não": False}
            g1, g2, g3, g4 = st.columns(4)
            kras = g1.selectbox("KRAS mutado", list(opcoes))
            tp53 = g2.selectbox("TP53 mutado", list(opcoes))
            cdkn2a = g3.selectbox("CDKN2A alterado", list(opcoes))
            smad4 = g4.selectbox("SMAD4 alterado", list(opcoes))
            enviado = st.form_submit_button("Estimar", type="primary")
        if enviado:
            try:
                r = inferencia.estimar_prognostico(idade=idade, estadio_t=t, estadio_n=n, grau=grau,
                                                   kras_mutado=opcoes[kras], tp53_mutado=opcoes[tp53],
                                                   cdkn2a_alterado=opcoes[cdkn2a], smad4_alterado=opcoes[smad4])
            except (ValueError, inferencia.ModeloIndisponivel) as erro:
                st.error(str(erro))
            else:
                st.info(f"**Grupo de risco: {r['grupo_de_risco'].upper()}** (tercis dos operados do TCGA)")
                c1, c2 = st.columns(2)
                c1.metric("Sobrevida global estimada 12 meses", f"{r['sobrevida_global_estimada']['12_meses']:.0%}")
                c2.metric("Sobrevida global estimada 24 meses", f"{r['sobrevida_global_estimada']['24_meses']:.0%}")
                st.dataframe(pd.DataFrame([
                    {"Variável": k, "HR": round(v["hr"], 2), "IC 95%": f"{v['ic95'][0]:.2f}–{v['ic95'][1]:.2f}",
                     "p": round(v["p"], 3)} for k, v in r["hazard_ratios_do_modelo"].items()
                ]), hide_index=True, width="stretch")
                for alerta in r["alertas"]:
                    st.warning(alerta)
                for limitacao in r["limitacoes"]:
                    st.caption(f"• {limitacao}")
        figura = RELATORIOS / "figuras" / "km_prognostico_tcga.png"
        if figura.exists():
            st.image(str(figura), caption="Kaplan-Meier dos grupos de risco (atribuídos fora-da-dobra)")
    with direita:
        st.subheader("Alterações genéticas no TCGA-PAAD")
        gene = st.text_input("Gene (símbolo HUGO)", "KRAS")
        if st.button("Consultar gene"):
            try:
                r = genomica.frequencia_alteracoes(gene)
            except Exception as erro:  # API externa: mostra a falha em vez de derrubar a página
                st.error(str(erro))
            else:
                c1, c2, c3 = st.columns(3)
                c1.metric("Qualquer alteração", f"{r['qualquer_alteracao']['percentual']}%")
                c2.metric("Mutação", f"{r['mutacao']['percentual']}%")
                c3.metric("Deleção homozigótica", f"{r['delecao_homozigotica']['percentual']}%")
                st.markdown(f"**Nota clínica:** {r['nota_clinica']}")
                if r["variantes_mais_frequentes"]:
                    st.dataframe(pd.DataFrame(list(r["variantes_mais_frequentes"].items()),
                                              columns=["Variante", "Amostras"]), hide_index=True)
                st.caption(f"{r['estudo']} · {r['origem_dos_dados']}. {r['limitacoes']}")
        st.subheader("Referências rápidas")
        topico = st.selectbox("Tópico", list(conhecimento.REFERENCIAS))
        st.text(conhecimento.referencia(topico))


def aba_agente() -> None:
    st.subheader("Agente de consulta")
    chave = os.environ.get("ANTHROPIC_API_KEY") or st.session_state.get("chave_api")
    motores = (["Claude (API)"] if chave else []) + [f"Llama local (modo guiado): {m}" for m in modelos_disponiveis()]
    if not motores:
        st.info("Nenhum motor disponível: informe a chave da API na barra lateral (ou defina ANTHROPIC_API_KEY), "
                "ou abra o Ollama com um modelo instalado. As outras abas funcionam sem isso.")
        return
    motor = st.selectbox("Motor do agente", motores)
    local = motor.startswith("Llama local")
    if local:
        st.caption("Roda neste computador: nenhum dado sai da máquina e não há custo. Modo guiado: o Llama só lê o "
                   "caso; regras conferem cada dado no texto e o relatório é montado com as saídas das ferramentas "
                   "(nenhum número vem do modelo de linguagem). Não conversa livremente: responde casos e os "
                   "tópicos de referência.")
    st.caption("Não digite nome, CPF, prontuário ou data de nascimento. Identificadores diretos são removidos "
               "automaticamente, mas a responsabilidade é de quem digita.")
    if st.session_state.get("motor_agente") != motor:
        st.session_state.motor_agente = motor
        st.session_state.agente = (AgenteLocal(motor.rsplit(": ", 1)[1]) if local
                                   else AgenteConsulta(anthropic.Anthropic(api_key=chave)))
        st.session_state.conversa = []

    colunas = st.columns(len(CASOS_EXEMPLO) + 1)
    pergunta = None
    for i, caso in enumerate(CASOS_EXEMPLO):
        if colunas[i].button(f"Caso exemplo {i + 1}", help=caso):
            pergunta = caso
    if colunas[-1].button("Nova consulta"):
        del st.session_state["motor_agente"]
        st.rerun()

    for papel, texto, extras in st.session_state.conversa:
        with st.chat_message(papel):
            st.markdown(texto)
            if extras:
                if extras.get("removidos"):
                    st.caption(f"{extras['removidos']} identificador(es) removido(s) antes do processamento.")
                if extras.get("uso"):
                    st.caption(extras["uso"])
                if extras["ferramentas"]:
                    with st.expander(f"Ferramentas usadas ({len(extras['ferramentas'])})"):
                        st.json(extras["ferramentas"])
    digitado = st.chat_input("Descreva o caso ou faça uma pergunta")
    pergunta = pergunta or digitado
    if not pergunta:
        return
    # O histórico guarda e mostra só a versão anonimizada, a mesma que o agente processa.
    pergunta_exibida, _ = anonimizar(pergunta)
    with st.chat_message("user"):
        st.markdown(pergunta_exibida)
    with st.chat_message("assistant"):
        with st.spinner("Rodando no Llama local — pode levar alguns minutos..." if local else "Analisando o caso..."):
            try:
                resposta = st.session_state.agente.perguntar(pergunta)
            except requests.RequestException as erro:
                st.error(f"Falha ao falar com o Ollama: {erro}")
                return
            except anthropic.AuthenticationError:
                st.error("Chave da API inválida.")
                return
            except anthropic.RateLimitError:
                st.error("Limite de requisições atingido; aguarde alguns segundos.")
                return
            except anthropic.APIConnectionError:
                st.error("Sem conexão com a API. As outras abas funcionam offline.")
                return
            except anthropic.APIStatusError as erro:
                st.error(f"Erro da API ({erro.status_code}): {erro.message}")
                return
        st.markdown(resposta.texto)
    st.session_state.conversa.append(("user", pergunta_exibida, None))
    st.session_state.conversa.append(("assistant", resposta.texto,
                                      {"ferramentas": resposta.ferramentas_usadas, "uso": resposta.resumo_uso(),
                                       "removidos": resposta.identificadores_removidos}))
    st.rerun()


def aba_metricas() -> None:
    st.subheader("Validação dos modelos")
    resumo = inferencia.resumo_metricas()
    if not resumo:
        st.warning("Métricas ainda não geradas. Rode o treino (ver README).")
        return
    for nome, rotulo in (("painel_urinario", "Painel urinário"), ("painel_urinario_ca19_9", "Painel urinário + CA19-9")):
        if nome not in resumo:
            continue
        m = resumo[nome]
        st.markdown(f"#### {rotulo} — {m['familia_vencedora']}")
        c1, c2, c3, c4 = st.columns(4)
        auc = m["teste"]["auroc"]
        c1.metric("AUROC no teste", f"{auc['auc']:.3f}", help=f"IC 95% {auc['ic95'][0]:.3f}–{auc['ic95'][1]:.3f}")
        c2.metric("AUROC VC (desenvolvimento)", f"{m['auroc_vc_desenvolvimento']:.3f}")
        if m["validacao_coorte2_auroc"]:
            c3.metric("AUROC Cohort1→Cohort2", f"{m['validacao_coorte2_auroc']['auc']:.3f}")
        c4.metric("Brier (teste)", f"{m['teste']['brier']:.3f}")
        st.dataframe(pd.DataFrame([
            {"Ponto": k, "Limiar": v["limiar"], "Sensibilidade": f"{v['sensibilidade']:.0%}",
             "Especificidade": f"{v['especificidade']:.0%}"} for k, v in m["teste"]["pontos_operacionais"].items()
        ]), hide_index=True)
        st.caption("Subgrupos (AUROC no teste): " + " · ".join(f"{k}: {v}" for k, v in m["teste"]["subgrupos_auroc"].items())
                   + " | Linhas de base: " + " · ".join(f"{k}: {v}" for k, v in m["linhas_de_base_auroc"].items()))
    if "prognostico_tcga" in resumo:
        p = resumo["prognostico_tcga"]
        st.markdown(f"#### Prognóstico TCGA-PAAD — C-index VC {p['c_index_vc']:.3f} "
                    f"(n={p['n']}, {p['obitos']} óbitos; log-rank fora-da-dobra p={p['logrank_p_grupos_fora_da_dobra']:.3f})")
    figuras = RELATORIOS / "figuras"
    colunas = st.columns(2)
    for i, arquivo in enumerate(sorted(figuras.glob("*.png")) if figuras.exists() else []):
        colunas[i % 2].image(str(arquivo), caption=arquivo.stem.replace("_", " "))
    relatorio = RELATORIOS / "relatorio_metricas_biomarcadores.md"
    if relatorio.exists():
        with st.expander("Relatório completo (TRIPOD+AI)"):
            st.markdown(relatorio.read_text(encoding="utf-8"))


def aba_datasets() -> None:
    st.subheader("Datasets e bancos de dados")
    st.dataframe(pd.DataFrame(conhecimento.DATASETS).rename(columns={
        "nome": "Base", "conteudo": "Conteúdo", "acesso": "Acesso", "uso_no_projeto": "Uso no projeto", "status": "Status",
    }), hide_index=True, width="stretch")


def main() -> None:
    with st.sidebar:
        st.markdown("## 🩺 Identificador de Câncer de Pâncreas")
        st.warning(AVISO_CLINICO)
        st.markdown("**Privacidade (LGPD):** use apenas idade e dados clínicos; nunca nome, CPF ou prontuário.")
        if not os.environ.get("ANTHROPIC_API_KEY"):
            st.text_input("Chave da API Anthropic (só para o agente)", type="password", key="chave_api")
        st.caption("Modelos: Debernardi 2020 (urina), TCGA-PAAD/cBioPortal (prognóstico e genômica), "
                   "SEER (estatísticas). Detalhes na aba Métricas.")
    abas = st.tabs(["Modo consulta", "Biomarcadores urinários", "Prognóstico e genômica", "Agente de IA",
                    "Métricas", "Datasets"])
    with abas[0]:
        aba_modo_consulta()
    with abas[1]:
        aba_biomarcadores()
    with abas[2]:
        aba_prognostico()
    with abas[3]:
        aba_agente()
    with abas[4]:
        aba_metricas()
    with abas[5]:
        aba_datasets()


main()

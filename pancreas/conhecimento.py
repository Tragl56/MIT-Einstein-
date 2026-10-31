"""Base de conhecimento clínico resumida e regras de triagem (sinais de alarme e alto risco).

As regras seguem diretrizes publicadas (NICE NG12, CAPS 2020, AGA 2020, Fukuoka 2017,
NCCN). São resumos para apoio à decisão: confira sempre a versão vigente da diretriz.
"""

from __future__ import annotations

from .config import AVISO_CLINICO

FONTES = {
    "NICE_NG12": "NICE NG12 — Suspected cancer: recognition and referral (pâncreas).",
    "CAPS_2020": "Goggins M et al. Management of patients with increased risk for familial pancreatic "
                 "cancer: updated recommendations from the CAPS Consortium. Gut 2020;69:7-17.",
    "AGA_2020": "Aslanian HR, Lee JH, Canto MI. AGA Clinical Practice Update on Pancreas Cancer "
                "Screening in High-Risk Individuals: Expert Review. Gastroenterology 2020;159:358-362.",
    "FUKUOKA_2017": "Tanaka M et al. Revisions of international consensus Fukuoka guidelines for IPMN. "
                    "Pancreatology 2017;17:738-753 (atualização Kyoto 2024).",
    "NCCN": "NCCN Clinical Practice Guidelines in Oncology: Pancreatic Adenocarcinoma (versão vigente).",
    "SEER": "SEER Cancer Stat Facts: Pancreatic Cancer — seer.cancer.gov/statfacts/html/pancreas.html.",
    "AJCC8": "AJCC Cancer Staging Manual, 8ª edição — pâncreas exócrino.",
    "DEBERNARDI_2020": "Debernardi S et al. A combination of urinary biomarker panel and PancRISK score "
                       "for earlier detection of pancreatic cancer. PLoS Med 2020;17(12):e1003489.",
}

# Gene -> (idade de início da vigilância, exige parente de 1º grau afetado?)
GENES_VIGILANCIA = {
    "CDKN2A": (40, False),
    "STK11": (40, False),
    "BRCA2": (45, True),
    "BRCA1": (45, True),
    "PALB2": (45, True),
    "ATM": (45, True),
    "MLH1": (45, True),
    "MSH2": (45, True),
    "MSH6": (45, True),
    "EPCAM": (45, True),
}


def _item(achado: str, conduta: str, fonte: str) -> dict:
    return {"achado": achado, "conduta_sugerida": conduta, "fonte": FONTES[fonte]}


def fonte_curta(fonte: str) -> str:
    """Rótulo curto de uma referência de FONTES, para exibir ao lado do achado."""
    for prefixo, rotulo in (("NICE", "NICE NG12"), ("Goggins", "CAPS 2020"), ("Tanaka", "Fukuoka 2017"),
                            ("NCCN", "NCCN"), ("Aslanian", "AGA 2020")):
        if fonte.startswith(prefixo):
            return rotulo
    return fonte.split(".")[0]


# --- Orientações práticas para o momento da consulta ------------------------------------

ROTULOS_PRIORIDADE = {"urgente": "URGENTE", "investigar": "INVESTIGAR",
                      "vigilancia_especializada": "VIGILÂNCIA ESPECIALIZADA", "orientacao": "SEM CRITÉRIO AGORA"}

EXAMES_POR_PRIORIDADE = {
    "urgente": [
        "TC de abdome com protocolo pancreático (multifásica). Se não houver acesso rápido, US de abdome enquanto aguarda.",
        "Bilirrubinas, fosfatase alcalina, GGT, TGO/TGP, hemograma e creatinina (para o contraste).",
        "CA19-9 como complemento, nunca isolado; com icterícia, repetir após a desobstrução biliar.",
        "Encaminhar pela via de suspeita de câncer (cirurgia hepatobiliopancreática ou oncologia).",
    ],
    "investigar": [
        "TC com protocolo pancreático ou RM com colangio-RM, com prioridade.",
        "Ecoendoscopia se a imagem for inconclusiva ou mostrar lesão pequena suspeita.",
    ],
    "vigilancia_especializada": [
        "Encaminhar a programa de vigilância: RM com colangio-RM e/ou ecoendoscopia anual em centro especializado.",
        "Aconselhamento genético e teste germinativo, se ainda não feitos.",
        "Glicemia de jejum ou HbA1c anual (diabetes novo pode ser um sinal precoce).",
    ],
    "orientacao": [
        "Nenhum exame específico para câncer de pâncreas é indicado agora pelas diretrizes aplicadas.",
        "Investigar e tratar a causa mais provável dos sintomas, se houver.",
    ],
}

PRAZOS = {
    "urgente": "Não esperar: o exame deve sair em dias, não em semanas.",
    "investigar": "Combinar a data do resultado; se o exame demorar mais de 4 semanas ou surgir algum sinal abaixo, antecipar.",
    "vigilancia_especializada": "Vigilância periódica (em geral anual); retorno antes se surgir algum sinal abaixo.",
    "orientacao": "Reavaliar em 2 a 4 semanas se os sintomas persistirem, ou antes se surgir algum sinal abaixo.",
}

SINAIS_DE_RETORNO = [
    "Pele ou olhos amarelados, urina escura ou fezes claras.",
    "Perda de peso que continua.",
    "Dor na barriga ou nas costas que piora, não passa ou acorda à noite.",
    "Vômitos persistentes.",
    "Febre com calafrios junto com pele amarelada: procurar emergência no mesmo dia (pode ser colangite).",
]

EXPLICACAO_AO_PACIENTE = {
    "urgente": "Alguns sinais que você apresentou precisam ser investigados logo, com um exame de imagem, para entender o "
               "que está acontecendo no pâncreas e nas vias da bile. Pedir esse exame não quer dizer que seja câncer: "
               "muitas causas são benignas, como pedras na vesícula. Mas é importante fazer rápido.",
    "investigar": "Vamos pedir um exame de imagem para esclarecer seus sintomas. É uma investigação cuidadosa; na maioria "
                  "das vezes a causa não é grave.",
    "vigilancia_especializada": "Pela sua história familiar ou genética, seu risco é maior que o da média das pessoas. Por "
                                "isso recomendamos acompanhamento com exames periódicos em um centro especializado, para "
                                "encontrar qualquer alteração bem cedo, quando o tratamento funciona melhor.",
    "orientacao": "Pelos dados de hoje, não há sinais que indiquem investigar o pâncreas agora. Vamos cuidar dos seus "
                  "sintomas e combinar um retorno. Se aparecer algum dos sinais de alerta que expliquei, volte antes.",
}

PERGUNTAS_CHAVE = {
    "ictericia": "Pele ou olhos amarelados, urina escura ou fezes claras?",
    "perda_peso_nao_intencional": "Perdeu peso sem querer nos últimos meses?",
    "dor_abdominal_ou_dorsal": "Dor no abdome superior ou nas costas que persiste ou piora?",
    "diabetes_inicio_recente": "Diabetes que começou nos últimos 3 anos ou descompensou sem motivo aparente?",
    "esteatorreia": "Fezes gordurosas, que boiam ou são difíceis de dar descarga?",
    "sintomas_gastrointestinais": "Náusea, vômitos, diarreia ou constipação novos?",
    "historia_familiar": "Pai, mãe, irmãos ou filhos com câncer de pâncreas? Alguma mutação conhecida na família (BRCA, CDKN2A)?",
    "tabagismo_atual": "Fuma atualmente?",
}

DIREITOS_SUS = ("No SUS, a suspeita de câncer dá direito aos exames de diagnóstico em até 30 dias (Lei 13.896/2019) e, "
                "confirmado o diagnóstico, ao início do tratamento em até 60 dias (Lei 12.732/2012).")


def _orientacoes(prioridade: str, idade: int, alarme: list, alto_risco: list, cisto: dict,
                 informados: set[str]) -> dict:
    exames = list(EXAMES_POR_PRIORIDADE[prioridade])
    if "diabetes_inicio_recente" in informados and prioridade != "vigilancia_especializada":
        exames.append("Glicemia de jejum ou HbA1c para confirmar o diabetes de início recente.")
    if "esteatorreia" in informados:
        exames.append("Elastase fecal (insuficiência pancreática exócrina).")
    if cisto:
        exames.append("Para o cisto: " + cisto["conduta_sugerida"])

    achados = [texto.split(" (")[0] for texto in
               [item["achado"] for item in alarme] + [item["criterio"] for item in alto_risco]]
    criterios = "; ".join(t[0].lower() + t[1:] for t in achados) if achados else \
        "nenhum sinal de alarme ou critério de alto risco relatado"
    nota = (f"Avaliação de risco para neoplasia de pâncreas com ferramenta de apoio à decisão (NICE NG12, CAPS 2020, "
            f"Fukuoka 2017). Idade: {idade} anos. Critérios encontrados: {criterios}. "
            f"Classificação: {ROTULOS_PRIORIDADE[prioridade]}. Conduta sugerida: {exames[0]} "
            "Paciente orientado(a) sobre sinais de alerta e retorno. Decisão clínica do médico assistente.")
    return {
        "titulo": ROTULOS_PRIORIDADE[prioridade],
        "exames_sugeridos": exames,
        "prazo": PRAZOS[prioridade],
        "sinais_de_retorno": SINAIS_DE_RETORNO,
        "explicacao_ao_paciente": EXPLICACAO_AO_PACIENTE[prioridade],
        "perguntas_que_faltam": [pergunta for chave, pergunta in PERGUNTAS_CHAVE.items() if chave not in informados],
        "direitos_sus": DIREITOS_SUS if prioridade in {"urgente", "investigar"} else None,
        "nota_para_prontuario": nota,
    }


def avaliar_sinais_e_fatores(
    idade: int,
    ictericia: bool = False,
    perda_peso_nao_intencional: bool = False,
    dor_abdominal_ou_dorsal: bool = False,
    sintomas_gastrointestinais: bool = False,
    esteatorreia: bool = False,
    massa_abdominal_palpavel: bool = False,
    diabetes_inicio_recente: bool = False,
    pancreatite_aguda_sem_causa: bool = False,
    pancreatite_cronica: bool = False,
    pancreatite_hereditaria: bool = False,
    parentes_primeiro_grau_com_cancer_pancreas: int = 0,
    parentes_mesmo_lado_com_cancer_pancreas: int = 0,
    variante_germinativa: str | None = None,
    tabagismo_atual: bool = False,
    imc: float | None = None,
    cisto_pancreatico: bool = False,
    cisto_tamanho_mm: float | None = None,
    nodulo_mural_mm: float | None = None,
    ducto_pancreatico_principal_mm: float | None = None,
    ca19_9_u_ml: float | None = None,
) -> dict:
    """Aplica as regras de sinais de alarme, alto risco hereditário e cistos.

    sintomas_gastrointestinais: diarreia, náusea, vômitos ou constipação novos.
    diabetes_inicio_recente: diabetes diagnosticado nos últimos 3 anos.
    parentes_mesmo_lado_com_cancer_pancreas: total de parentes afetados do mesmo lado da
    família, incluindo os de 1º grau.
    """
    alarme, alto_risco, fatores, cisto, notas = [], [], [], {}, []
    urgente = investigar = vigilancia = False

    # --- Sinais de alarme (NICE NG12) ---------------------------------------------------
    if ictericia and idade >= 40:
        urgente = True
        alarme.append(_item("Icterícia em paciente com 40 anos ou mais",
                            "Encaminhamento urgente por via de suspeita de câncer; TC de abdome com protocolo "
                            "pancreático e avaliação da via biliar.", "NICE_NG12"))
    elif ictericia:
        investigar = True
        alarme.append(_item("Icterícia", "Investigar causa com US/colangio-RM e bioquímica hepática.", "NICE_NG12"))

    acompanhantes = {
        "dor abdominal ou dorsal": dor_abdominal_ou_dorsal,
        "sintomas gastrointestinais (diarreia, náusea, vômitos, constipação)": sintomas_gastrointestinais,
        "diabetes de início recente": diabetes_inicio_recente,
    }
    presentes = [nome for nome, valor in acompanhantes.items() if valor]
    if idade >= 60 and perda_peso_nao_intencional and presentes:
        urgente = True
        alarme.append(_item(f"60 anos ou mais com perda de peso e {', '.join(presentes)}",
                            "Considerar TC de abdome urgente (ou US se TC indisponível).", "NICE_NG12"))
    elif perda_peso_nao_intencional and presentes:
        investigar = True
        alarme.append(_item(f"Perda de peso não intencional com {', '.join(presentes)}",
                            "Investigar com imagem abdominal prioritária.", "NICE_NG12"))

    if massa_abdominal_palpavel:
        urgente = True
        alarme.append(_item("Massa abdominal palpável", "Imagem urgente (TC) e encaminhamento.", "NICE_NG12"))
    if esteatorreia:
        investigar = True
        alarme.append(_item("Esteatorreia nova (possível insuficiência exócrina por obstrução ductal)",
                            "Imagem pancreática; elastase fecal.", "NCCN"))
    if diabetes_inicio_recente and idade >= 50:
        investigar = True
        alarme.append(_item(
            "Diabetes de início recente após os 50 anos (cerca de 1% desenvolve PDAC em 3 anos; risco "
            "maior se houver perda de peso — escore ENDPAC)",
            "Considerar imagem pancreática, sobretudo se houver perda de peso ou outros sinais.", "NCCN"))
    if pancreatite_aguda_sem_causa and idade >= 40:
        investigar = True
        alarme.append(_item("Pancreatite aguda sem causa aparente a partir dos 40 anos",
                            "Excluir neoplasia obstrutiva com TC/RM após a fase aguda; ecoendoscopia se inconclusivo.",
                            "NCCN"))

    # --- Alto risco hereditário (CAPS 2020 / AGA) -----------------------------------------
    gene = (variante_germinativa or "").strip().upper() or None
    if gene:
        if gene in GENES_VIGILANCIA:
            inicio, exige_parente = GENES_VIGILANCIA[gene]
            if exige_parente and parentes_primeiro_grau_com_cancer_pancreas < 1:
                alto_risco.append({
                    "criterio": f"Portador de variante patogênica em {gene} sem parente de 1º grau afetado",
                    "elegivel_vigilancia": False,
                    "conduta_sugerida": "Vigilância pancreática não é consenso sem história familiar; discutir em "
                                        "aconselhamento genético (algumas diretrizes recentes a consideram).",
                    "fonte": FONTES["CAPS_2020"],
                })
            else:
                elegivel = idade >= inicio
                vigilancia |= elegivel
                alto_risco.append({
                    "criterio": f"Variante patogênica germinativa em {gene}"
                                + (" com parente de 1º grau afetado" if exige_parente else ""),
                    "elegivel_vigilancia": elegivel,
                    "conduta_sugerida": f"Vigilância a partir de ~{inicio} anos (ou 10 anos antes do caso mais jovem "
                                        "da família): RM/colangio-RM e/ou ecoendoscopia anual em centro especializado.",
                    "fonte": FONTES["CAPS_2020"],
                })
        else:
            notas.append(f"Variante em {gene}: sem recomendação específica de vigilância pancreática nas diretrizes "
                         "resumidas aqui; discutir com a genética.")

    if parentes_mesmo_lado_com_cancer_pancreas >= 2 and parentes_primeiro_grau_com_cancer_pancreas >= 1:
        elegivel = idade >= 50
        vigilancia |= elegivel
        alto_risco.append({
            "criterio": "Câncer de pâncreas familiar (2 ou mais parentes do mesmo lado, ao menos 1 de 1º grau)",
            "elegivel_vigilancia": elegivel,
            "conduta_sugerida": "Vigilância a partir de 50–55 anos (ou 10 anos antes do caso mais jovem); "
                                "aconselhamento e teste genético.",
            "fonte": FONTES["CAPS_2020"],
        })
    elif parentes_primeiro_grau_com_cancer_pancreas >= 1:
        fatores.append("Um parente de 1º grau com câncer de pâncreas (risco aumentado, sem critério de vigilância "
                       "isoladamente); oferecer aconselhamento genético.")

    if pancreatite_hereditaria:
        vigilancia |= idade >= 40
        alto_risco.append({
            "criterio": "Pancreatite hereditária (ex.: PRSS1)",
            "elegivel_vigilancia": idade >= 40,
            "conduta_sugerida": "Risco cumulativo elevado; considerar vigilância a partir de ~40 anos em centro "
                                "especializado (sem consenso uniforme).",
            "fonte": FONTES["CAPS_2020"],
        })

    # --- Fatores de risco gerais ----------------------------------------------------------
    if tabagismo_atual:
        fatores.append("Tabagismo atual (cerca de 2 vezes o risco; principal fator modificável).")
    if imc is not None and imc >= 30:
        fatores.append(f"Obesidade (IMC {imc:.1f}).")
    if pancreatite_cronica:
        fatores.append("Pancreatite crônica (risco várias vezes maior; dificulta a imagem — ecoendoscopia ajuda).")
    if idade >= 60:
        fatores.append("Idade acima de 60 anos (mediana ao diagnóstico ~71 anos no SEER).")

    # --- Cisto pancreático (Fukuoka 2017) ------------------------------------------------
    if cisto_pancreatico:
        estigmas, preocupantes = [], []
        if ictericia:
            estigmas.append("icterícia obstrutiva com lesão cística na cabeça")
        if nodulo_mural_mm is not None and nodulo_mural_mm >= 5:
            estigmas.append(f"nódulo mural com realce ≥ 5 mm ({nodulo_mural_mm:g} mm)")
        elif nodulo_mural_mm is not None and nodulo_mural_mm > 0:
            preocupantes.append(f"nódulo mural < 5 mm ({nodulo_mural_mm:g} mm)")
        if ducto_pancreatico_principal_mm is not None:
            if ducto_pancreatico_principal_mm >= 10:
                estigmas.append(f"ducto pancreático principal ≥ 10 mm ({ducto_pancreatico_principal_mm:g} mm)")
            elif ducto_pancreatico_principal_mm >= 5:
                preocupantes.append(f"ducto pancreático principal 5–9 mm ({ducto_pancreatico_principal_mm:g} mm)")
        if cisto_tamanho_mm is not None and cisto_tamanho_mm >= 30:
            preocupantes.append(f"cisto ≥ 3 cm ({cisto_tamanho_mm:g} mm)")
        if ca19_9_u_ml is not None and ca19_9_u_ml >= 37:
            preocupantes.append("CA19-9 sérico elevado")
        if pancreatite_aguda_sem_causa:
            preocupantes.append("pancreatite")
        if estigmas:
            urgente = True
            conduta = "Estigma de alto risco: discutir ressecção cirúrgica em centro de referência."
        elif preocupantes:
            investigar = True
            conduta = "Característica preocupante: ecoendoscopia (± punção) para estratificar."
        else:
            conduta = "Sem estigmas ou características preocupantes: vigilância por imagem conforme o tamanho."
        cisto = {"estigmas_alto_risco": estigmas, "caracteristicas_preocupantes": preocupantes,
                 "conduta_sugerida": conduta, "fonte": FONTES["FUKUOKA_2017"]}

    # --- CA19-9 ---------------------------------------------------------------------------
    if ca19_9_u_ml is not None:
        if ca19_9_u_ml >= 37:
            nota = (f"CA19-9 {ca19_9_u_ml:g} U/mL (elevado). É inespecífico: colestase, colangite e pancreatite "
                    "também elevam. Não serve como rastreio isolado; é útil para prognóstico e seguimento.")
            if ictericia:
                nota += " Com icterícia, reavaliar após desobstrução biliar."
        else:
            nota = (f"CA19-9 {ca19_9_u_ml:g} U/mL (normal). Não exclui PDAC: 5–10% das pessoas são "
                    "Lewis-negativas e não produzem CA19-9.")
        notas.append(nota)

    if urgente:
        prioridade = "urgente"
        passos = ["TC de abdome com protocolo pancreático (multifásica) com urgência.",
                  "Se icterícia: avaliar via biliar (US/colangio-RM); CA19-9 após desobstrução.",
                  "Encaminhar a centro de referência e discutir em tumor board multidisciplinar."]
    elif investigar:
        prioridade = "investigar"
        passos = ["Imagem pancreática prioritária (TC com protocolo pancreático ou RM/colangio-RM).",
                  "Ecoendoscopia se a imagem for inconclusiva ou houver lesão pequena suspeita."]
    elif vigilancia:
        prioridade = "vigilancia_especializada"
        passos = ["Encaminhar a programa de vigilância (RM/colangio-RM e/ou ecoendoscopia anual).",
                  "Aconselhamento genético e teste germinativo, se ainda não realizados."]
    else:
        prioridade = "orientacao"
        passos = ["Sem critério de investigação imediata pelas regras aplicadas.",
                  "Orientar cessação do tabagismo, controle de peso e glicemia; reavaliar se surgirem sintomas."]

    informados = {nome for nome, valor in (
        ("ictericia", ictericia), ("perda_peso_nao_intencional", perda_peso_nao_intencional),
        ("dor_abdominal_ou_dorsal", dor_abdominal_ou_dorsal), ("diabetes_inicio_recente", diabetes_inicio_recente),
        ("esteatorreia", esteatorreia), ("sintomas_gastrointestinais", sintomas_gastrointestinais),
        ("tabagismo_atual", tabagismo_atual),
        ("historia_familiar", parentes_primeiro_grau_com_cancer_pancreas or parentes_mesmo_lado_com_cancer_pancreas
         or variante_germinativa),
    ) if valor}
    return {
        "nivel_prioridade": prioridade,
        "sinais_de_alarme": alarme,
        "criterios_alto_risco": alto_risco,
        "cisto_pancreatico": cisto or None,
        "fatores_de_risco": fatores,
        "observacoes": notas,
        "proximos_passos": passos,
        "orientacoes": _orientacoes(prioridade, idade, alarme, alto_risco, cisto, informados),
        "aviso": AVISO_CLINICO,
    }


REFERENCIAS = {
    "estadiamento_ajcc": """Estadiamento AJCC 8ª edição (pâncreas exócrino)
T1 ≤ 2 cm (T1a ≤ 0,5; T1b > 0,5 e < 1; T1c 1–2 cm) · T2 > 2 e ≤ 4 cm · T3 > 4 cm
T4: envolve tronco celíaco, artéria mesentérica superior e/ou artéria hepática comum, qualquer tamanho
N0 sem linfonodos · N1 1–3 linfonodos · N2 ≥ 4 linfonodos · M1 metástase a distância
Estádios: IA T1N0 · IB T2N0 · IIA T3N0 · IIB T1–3 N1 · III qualquer T N2 ou T4 qualquer N · IV M1
Fonte: AJCC Cancer Staging Manual, 8ª ed.""",

    "sobrevida_seer": """SEER Cancer Stat Facts — câncer de pâncreas (EUA)
Sobrevida relativa em 5 anos (SEER 21, 2016–2022): global 13,7% · localizado 43,6% · regional 17,0% ·
distante 3,4% · desconhecido 12,5%
Estádio ao diagnóstico: localizado 15% · regional 28% · distante 51% · desconhecido 5%
Estimativa 2026 (EUA): 67.530 casos novos e 52.740 óbitos · mediana de idade ao diagnóstico: 71 anos ·
risco ao longo da vida ≈ 1,7%
Fonte: seer.cancer.gov/statfacts/html/pancreas.html (consultado em 2026). Dados dos EUA; a realidade
brasileira pode diferir (ver INCA).""",

    "ca19_9": """CA19-9 sérico
Corte usual 37 U/mL. Não recomendado para rastreio de assintomáticos (baixo VPP).
Falsos positivos: colestase/obstrução biliar, colangite, pancreatite, hepatopatias, diabetes descompensado.
Falsos negativos: 5–10% da população é Lewis-negativa e não produz CA19-9.
Usos: prognóstico (valores pré-operatórios muito altos sugerem doença oculta), resposta ao tratamento e seguimento.
No estudo de Debernardi 2020, CA19-9 ≥ 37 U/mL somado ao painel urinário aumentou a sensibilidade.""",

    "cistos_pancreaticos": """Cistos pancreáticos / IPMN (Fukuoka 2017; atualização Kyoto 2024)
Estigmas de alto risco: icterícia obstrutiva com cisto na cabeça; nódulo mural com realce ≥ 5 mm;
ducto pancreático principal ≥ 10 mm → considerar cirurgia.
Características preocupantes: cisto ≥ 3 cm; nódulo mural < 5 mm; parede espessada/realçante; ducto principal
5–9 mm; mudança abrupta de calibre com atrofia distal; linfonodomegalia; CA19-9 elevado; crescimento
≥ 5 mm em 2 anos; pancreatite → ecoendoscopia ± punção.
Sem nenhum dos dois: vigilância por imagem conforme o tamanho.""",

    "vigilancia_alto_risco": """Vigilância de indivíduos de alto risco (CAPS 2020; AGA)
Quem: portadores de CDKN2A ou STK11 (a partir de ~40 anos); portadores de BRCA2, BRCA1, PALB2, ATM,
MLH1/MSH2/MSH6/EPCAM com ≥ 1 parente de 1º grau afetado (a partir de ~45–50 anos); câncer de pâncreas
familiar — 2 ou mais parentes do mesmo lado, ao menos 1 de 1º grau (a partir de ~50–55 anos); ou 10 anos antes
do caso mais jovem da família. Pancreatite hereditária: considerar a partir de ~40 anos.
Como: RM/colangio-RM e/ou ecoendoscopia, em geral anual, em centro especializado; glicemia/HbA1c.
CA19-9 não substitui a imagem. Confira a diretriz vigente — as idades variam entre consensos.""",

    "sinais_de_alarme": """Sinais de alarme (NICE NG12)
≥ 40 anos com icterícia → encaminhamento urgente por via de suspeita de câncer.
≥ 60 anos com perda de peso e qualquer um de: diarreia, dor dorsal, dor abdominal, náusea, vômitos,
constipação, diabetes de início recente → considerar TC urgente (ou US).
Também: massa abdominal, esteatorreia nova, diabetes de início recente após os 50 anos com perda de peso,
pancreatite aguda sem causa aparente após os 40 anos.""",

    "ressecabilidade": """Ressecabilidade (NCCN, resumo)
Ressecável: sem contato arterial (tronco celíaco, AMS, artéria hepática comum); sem contato venoso
(VMS/veia porta) ou contato ≤ 180° sem irregularidade.
Borderline: contato com a artéria hepática comum sem extensão ao tronco celíaco; contato com AMS ≤ 180°;
contato venoso > 180° ou ≤ 180° com irregularidade/trombose, reconstruível.
Localmente avançado: contato com AMS ou tronco celíaco > 180°; envolvimento venoso não reconstruível.
A classificação final é da radiologia e cirurgia em reunião multidisciplinar.""",

    "conduta_por_estadio": """Conduta por estádio (alto nível — decisão sempre em tumor board)
Ressecável: cirurgia seguida de quimioterapia adjuvante por 6 meses (mFOLFIRINOX se bom performance status —
PRODIGE 24; alternativa gemcitabina + capecitabina — ESPAC-4). Neoadjuvância em casos de maior risco.
Borderline: terapia neoadjuvante (FOLFIRINOX ou gemcitabina + nab-paclitaxel) ± radioterapia, reestadiamento
e cirurgia.
Localmente avançado: quimioterapia sistêmica, reavaliação de ressecabilidade; radioterapia em casos selecionados.
Metastático: bom PS → FOLFIRINOX, NALIRIFOX ou gemcitabina + nab-paclitaxel; PS limítrofe → gemcitabina ±
nab-paclitaxel; 2ª linha após gemcitabina: nal-IRI + 5-FU/LV. Cuidados paliativos precoces para todos.
Verifique aprovação ANVISA, cobertura (SUS/ANS) e diretrizes vigentes (NCCN, ESMO, SBOC).""",

    "testes_geneticos": """Testes genéticos (NCCN)
Teste germinativo para TODO paciente com adenocarcinoma de pâncreas (≈ 5–10% têm variante patogênica:
BRCA2, BRCA1, PALB2, ATM, CDKN2A, genes de Lynch...). Familiares de 1º grau: aconselhamento genético.
Perfil somático do tumor, sobretudo na doença avançada:
- BRCA1/2 ou PALB2: esquemas com platina; manutenção com olaparibe em BRCA germinativo (estudo POLO).
- MSI-H/dMMR: imunoterapia (pembrolizumabe).
- KRAS selvagem (~5–10%): pesquisar fusões NTRK, NRG1, ALK, ROS1, RET e BRAF V600E — há terapias-alvo.
- KRAS G12C (~1–2%): inibidores de G12C. Inibidores de RAS mais amplos estão em estudos clínicos.""",
}


DATASETS = [
    {
        "nome": "Urinary Biomarkers for Pancreatic Cancer (Debernardi 2020)",
        "conteudo": "590 amostras de urina: 183 controles, 208 doenças benignas, 199 PDAC; LYVE1, REG1B, TFF1, "
                    "REG1A, creatinina, idade, sexo, estádio e CA19-9 plasmático (350 amostras).",
        "acesso": "Aberto (CC-BY). S1 Table do artigo no PLOS Medicine; espelho no Kaggle.",
        "uso_no_projeto": "Modelos de triagem por biomarcadores urinários (com e sem CA19-9).",
        "status": "integrado",
    },
    {
        "nome": "Pancreatic Cancer Prediction Dataset (Kaggle)",
        "conteudo": "Há vários datasets com esse nome no Kaggle, de fatores de risco e sintomas. Vários são "
                    "gerados sinteticamente.",
        "acesso": "Kaggle (conta + API key).",
        "uso_no_projeto": "Não usado nos modelos clínicos. Confirme a procedência e se os dados são reais antes de "
                          "treinar qualquer coisa com ele; dados sintéticos servem só para ensino ou demonstração.",
        "status": "não integrado",
    },
    {
        "nome": "TCGA-PAAD Clinical Dataset (Hugging Face)",
        "conteudo": "Espelho dos dados clínicos do TCGA-PAAD.",
        "acesso": "Aberto.",
        "uso_no_projeto": "O projeto busca o mesmo conteúdo direto da fonte primária (cBioPortal), com versão "
                          "rastreável.",
        "status": "coberto via cBioPortal",
    },
    {
        "nome": "PLCO Pancreas Dataset (NCI)",
        "conteudo": "Coorte prospectiva de rastreamento (~155 mil participantes): questionários de fatores de "
                    "risco, seguimento e casos incidentes de câncer de pâncreas; biorrepositório.",
        "acesso": "Controlado: proposta aprovada no NCI CDAS (cdas.cancer.gov).",
        "uso_no_projeto": "Próximo passo: modelo de risco pré-diagnóstico populacional (validação prospectiva).",
        "status": "requer solicitação de acesso",
    },
    {
        "nome": "SEER (Surveillance, Epidemiology and End Results)",
        "conteudo": "Incidência, estádio ao diagnóstico e sobrevida populacional nos EUA.",
        "acesso": "Estatísticas agregadas abertas; microdados com acordo de uso (SEER*Stat).",
        "uso_no_projeto": "Estatísticas de referência de sobrevida por estádio (tabela no agente).",
        "status": "integrado (estatísticas agregadas)",
    },
    {
        "nome": "Imaging Data Commons (IDC) — TCGA-PAAD",
        "conteudo": "Imagens radiológicas e lâminas digitais dos casos TCGA-PAAD (DICOM).",
        "acesso": "Aberto via pacote idc-index, BigQuery ou portal IDC.",
        "uso_no_projeto": "Roteiro: modelo de imagem (TC) — exige curadoria e anotação; fora do escopo do evento.",
        "status": "roteiro",
    },
    {
        "nome": "cBioPortal / PanCancer Atlas",
        "conteudo": "Mutações, CNA, dados clínicos e sobrevida do TCGA-PAAD (estudo paad_tcga_pan_can_atlas_2018).",
        "acesso": "Aberto via API pública.",
        "uso_no_projeto": "Consulta de frequência de alterações genéticas e modelo de prognóstico pós-ressecção.",
        "status": "integrado",
    },
    {
        "nome": "TCGA-PAAD (GDC)",
        "conteudo": "185 casos com dados multiômicos e clínicos; parte é não-PDAC (neuroendócrino etc.).",
        "acesso": "Dados abertos no GDC; dados controlados (BAM, germinativo) via dbGaP.",
        "uso_no_projeto": "Usado pela versão curada do PanCancer Atlas no cBioPortal; histologias não ductais "
                          "excluídas do prognóstico.",
        "status": "integrado via cBioPortal",
    },
]


def referencia(topico: str) -> str:
    if topico not in REFERENCIAS:
        raise KeyError(f"Tópico desconhecido: {topico}. Opções: {', '.join(REFERENCIAS)}")
    return REFERENCIAS[topico]

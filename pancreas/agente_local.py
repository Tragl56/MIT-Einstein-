"""Agente local com Llama (Ollama) em modo guiado: nenhum dado sai do computador.

No teste de ponta a ponta, o llama3.1:8b em modo livre (escolhendo ferramentas e escrevendo o
relatório) inventou resultados: descreveu o painel urinário sem rodar o modelo, citou
frequências do TCGA que não existem e marcou sintomas que o caso não tinha. Por isso o modelo
local só faz aqui o que faz bem — ler o texto e preencher um formulário estruturado — e todo o
resto é determinístico:

1. Extração: expressões regulares (com tratamento de negação) e o Llama, em JSON com esquema fixo.
2. Verificação: número que não aparece no texto é descartado; achado do Llama sem trecho literal
   no texto, ou negado na mesma frase ("nega icterícia", "icterícia indolor"), é descartado.
3. Ferramentas (regras, biomarcadores, prognóstico, genômica) rodam em Python.
4. O relatório é montado a partir das saídas das ferramentas, no formato da skill de consulta,
   com a lista dos dados considerados para o médico conferir.

Sem o Ollama, a extração cai só para as regras e o agente continua funcionando.

Uso no terminal: python -m pancreas.agente_local [--modelo llama3.1:8b]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata

import requests

from . import conhecimento, genomica, inferencia
from .agente import Resposta
from .config import AVISO_CLINICO
from .dados import GENES_CHAVE
from .privacidade import anonimizar

OLLAMA_URL = os.environ.get("PANCREAS_OLLAMA_URL", "http://localhost:11434")
MODELO_LOCAL = os.environ.get("PANCREAS_MODELO_LOCAL", "llama3.1:8b")
OPCOES = {"num_ctx": 4096, "temperature": 0}

NUMERO = r"(\d+(?:[.,]\d+)?)"
# Valor medido: número que não está colado a letras (o "1" de LYVE1 ou o "53" de TP53 não contam).
NUMERO_VALOR = r"(?<![a-z0-9])(\d+(?:[.,]\d+)?)"

# campo -> (rótulo, padrão que precisa aparecer na frase, padrão de negação na mesma frase)
ACHADOS = {
    "ictericia": ("Icterícia", r"icteric|amarelad|pele amarel|olhos amarel",
                  r"anicteric|\b(sem|nega|negou|ausencia de|nao ha)\b[^,.;]{0,15}(icteric|amarel)"),
    "perda_peso_nao_intencional": ("Perda de peso não intencional",
                                   r"perd\w* (de )?(\d+[.,]?\d* ?(kg|quilo)|peso)|emagrec|perda ponderal",
                                   r"\b(sem|nega|negou)\b[^,.;]{0,15}(perd|emagrec)|intencional|dieta"),
    "dor_abdominal_ou_dorsal": ("Dor abdominal ou dorsal", r"\bdor(es)?\b|epigastralgia|dorsalgia|\bdoi\b",
                                r"indolor|\b(sem|nega|negou|ausencia de)\b[^,.;]{0,10}\bdor"),
    "sintomas_gastrointestinais": ("Diarreia, náusea, vômitos ou constipação", r"diarr|nause|vomit|constip|enjo",
                                   r"\b(sem|nega|negou)\b[^,.;]{0,15}(diarr|nause|vomit|constip|enjo)"),
    "esteatorreia": ("Esteatorreia", r"esteatorr|fezes gordur|gordura nas fezes|fezes oleos",
                     r"\b(sem|nega|negou)\b[^,.;]{0,15}(esteatorr|fezes)"),
    "massa_abdominal_palpavel": ("Massa abdominal palpável", r"(massa|tumoracao)[^,.;]{0,20}palp",
                                 r"\b(sem|nega)\b[^,.;]{0,10}(massa|tumoracao)"),
    "pancreatite_aguda_sem_causa": ("Pancreatite aguda sem causa aparente",
                                    r"pancreatite aguda[^.;]{0,40}(sem causa|idiopatic|sem etiolog|causa desconhecida)",
                                    r"\b(sem|nega)\b[^,.;]{0,10}pancreatite"),
    "pancreatite_cronica": ("Pancreatite crônica", r"pancreatite cronica", r"\b(sem|nega)\b[^,.;]{0,10}pancreatite"),
    "pancreatite_hereditaria": ("Pancreatite hereditária", r"pancreatite hereditaria|prss1", r"\b(sem|nega)\b[^,.;]{0,10}pancreatite"),
    "tabagismo_atual": ("Tabagismo atual", r"\bfum(a|ante)\b|tabagis|cigarr",
                        r"ex-? ?(fumante|tabagis)|nao fuma|nega (tabag|fum)|parou de fumar|nunca fumou"),
    "cisto_pancreatico": ("Cisto pancreático / IPMN", r"\bcist|ipmn|neoplasia (cistica|mucinosa)",
                          r"\b(sem|nega)\b[^,.;]{0,10}cist"),
}

VALORES = {
    # campo -> (rótulo, unidade, padrão com o número no grupo 1)
    "ca19_9": ("CA19-9", "U/mL", rf"ca\s*-?\s*19\s*[-.]?\s*9[^0-9]{{0,25}}?{NUMERO_VALOR}"),
    "creatinina": ("Creatinina urinária", "", rf"creatinin\w*[^0-9]{{0,20}}?{NUMERO_VALOR}"),
    "lyve1": ("LYVE1", "ng/mL", rf"lyve\s*-?\s*1[^0-9]{{0,15}}?{NUMERO_VALOR}"),
    "reg1b": ("REG1B", "ng/mL", rf"reg\s*-?\s*1\s*b[^0-9]{{0,15}}?{NUMERO_VALOR}"),
    "tff1": ("TFF1", "ng/mL", rf"tff\s*-?\s*1[^0-9]{{0,15}}?{NUMERO_VALOR}"),
    "imc": ("IMC", "kg/m²", rf"\bimc[^0-9]{{0,10}}?{NUMERO_VALOR}"),
}

CAMPOS_LLAMA = list(ACHADOS)

ESQUEMA_EXTRACAO = {
    "type": "object",
    "properties": {
        "idade": {"type": ["integer", "null"]},
        "achados": {"type": "array", "items": {
            "type": "object",
            "properties": {"campo": {"type": "string", "enum": CAMPOS_LLAMA}, "trecho": {"type": "string"}},
            "required": ["campo", "trecho"]}},
        "ca19_9": {"type": ["number", "null"]},
        "creatinina": {"type": ["number", "null"]},
        "lyve1": {"type": ["number", "null"]},
        "reg1b": {"type": ["number", "null"]},
        "tff1": {"type": ["number", "null"]},
        "parentes_primeiro_grau": {"type": "integer"},
        "parentes_mesmo_lado": {"type": "integer"},
        "variante_germinativa": {"type": ["string", "null"]},
        "operado": {"type": "boolean"},
    },
    "required": ["idade", "achados", "ca19_9", "creatinina", "lyve1", "reg1b", "tff1", "parentes_primeiro_grau",
                 "parentes_mesmo_lado", "variante_germinativa", "operado"],
}

PROMPT_EXTRACAO = """Você preenche um formulário a partir de um caso clínico de pâncreas. Responda só com o JSON.
- Copie apenas o que o texto afirma. Dado ausente: null (números/textos), 0 (contagens) ou false.
- "achados": só achados PRESENTES, cada um com o trecho copiado literalmente do texto. Achado negado
  ("nega icterícia") ou contrariado ("icterícia indolor" não é dor) não entra.
- parentes_primeiro_grau: pai, mãe, irmãos ou filhos com câncer de pâncreas. parentes_mesmo_lado: total de
  parentes afetados do mesmo lado da família, incluindo os de 1º grau.
- variante_germinativa: gene com variante herdada/germinativa (ex.: BRCA2). Mutação do tumor não entra aqui.
- operado: true só se o tumor já foi ressecado (Whipple, pancreatectomia)."""

EXEMPLO_ENTRADA = ("Mulher, 74 anos, dor epigástrica irradiada para o dorso há 2 meses, nega icterícia. Fumante. "
                   "Painel urinário: creatinina 1,1 mg/mL, LYVE1 2,3 ng/mL, REG1B 40 ng/mL, TFF1 300 ng/mL. "
                   "Mãe teve câncer de pâncreas.")
EXEMPLO_SAIDA = {
    "idade": 74,
    "achados": [{"campo": "dor_abdominal_ou_dorsal", "trecho": "dor epigástrica irradiada para o dorso"},
                {"campo": "tabagismo_atual", "trecho": "Fumante"}],
    "ca19_9": None, "creatinina": 1.1, "lyve1": 2.3, "reg1b": 40, "tff1": 300,
    "parentes_primeiro_grau": 1, "parentes_mesmo_lado": 1, "variante_germinativa": None, "operado": False,
}

ROTULOS_PONTOS = {"triagem": "triagem", "equilibrio": "equilíbrio", "confirmacao": "confirmação"}

TITULOS_REFERENCIA = {
    "estadiamento_ajcc": "Estadiamento AJCC", "sobrevida_seer": "Sobrevida (SEER)", "ca19_9": "CA19-9",
    "cistos_pancreaticos": "Cistos pancreáticos", "vigilancia_alto_risco": "Vigilância de alto risco",
    "sinais_de_alarme": "Sinais de alarme", "ressecabilidade": "Ressecabilidade",
    "conduta_por_estadio": "Conduta por estádio", "testes_geneticos": "Testes genéticos",
}

TOPICOS_REFERENCIA = {
    r"estadi|tnm|ajcc": "estadiamento_ajcc",
    r"sobreviv|sobrevida|seer|mortalidade": "sobrevida_seer",
    r"ca\s*-?\s*19": "ca19_9",
    r"cist|ipmn": "cistos_pancreaticos",
    r"vigil|alto risco|rastre": "vigilancia_alto_risco",
    r"alarme|sintoma|encaminh": "sinais_de_alarme",
    r"ressecab|borderline|localmente avancad": "ressecabilidade",
    r"tratament|conduta|quimio|adjuv|folfirinox": "conduta_por_estadio",
    r"genetic|germinativ|ngs|painel genom|mutac|teste": "testes_geneticos",
}


def _normalizar(texto: str) -> str:
    sem_acento = "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", sem_acento.lower().replace("–", "-")).strip()


def _numero(texto: str) -> float:
    return float(texto.replace(",", "."))


def _numeros_de_valores(texto_norm: str) -> set[float]:
    """Números que podem ser valores medidos: ignora os que fazem parte de nomes (CA19-9, LYVE1, TP53, G12D, pT3)."""
    sem_nomes = re.sub(r"ca\s*-?\s*19\s*[-.]?\s*9|\b[a-z]{1,6}\d+[a-z]?\d*\b", " ", texto_norm)
    return {_numero(n) for n in re.findall(NUMERO, sem_nomes)}


def _frases(texto_norm: str) -> list[str]:
    """Divide em frases/orações sem quebrar decimais com vírgula (6,1)."""
    return [p.strip() for p in re.split(r"[.;\n]|,(?!\d)", texto_norm) if p.strip()]


def _frases_com_original(texto: str) -> list[tuple[str, str]]:
    """Pares (frase normalizada para as regras, frase original para mostrar ao médico)."""
    return [(_normalizar(p), p.strip()) for p in re.split(r"[.;\n]|,(?!\d)", texto) if p.strip()]


def detectar_achados(texto: str) -> dict[str, str]:
    """Achados presentes por regra: padrão do campo na frase e nenhuma negação na mesma frase."""
    encontrados = {}
    for frase, original in _frases_com_original(texto):
        for campo, (_, padrao, negacao) in ACHADOS.items():
            if campo not in encontrados and re.search(padrao, frase) and not re.search(negacao, frase):
                encontrados[campo] = original
    for frase, original in _frases_com_original(texto):
        if "diabet" in frase and _diabetes_recente(frase):
            encontrados["diabetes_inicio_recente"] = original
            break
    return encontrados


def _diabetes_recente(frase: str) -> bool:
    anos = re.search(r"ha (\d+) anos?", frase)
    if anos:
        return int(anos.group(1)) <= 3
    return bool(re.search(r"recente|ha \d+ (dias?|semanas?|mes|meses)|ha (um|uma|dois|tres) anos?|ha (um|uma) ano",
                          frase))


def achados_negados(texto: str) -> set[str]:
    """Campos explicitamente negados (usado para atualizar um caso: 'agora sem icterícia')."""
    return {campo for frase in _frases(_normalizar(texto)) for campo, (_, _, negacao) in ACHADOS.items()
            if re.search(negacao, frase)}


def detectar_valores(texto: str) -> dict:
    t = _normalizar(texto)
    valores = {campo: _numero(m.group(1)) for campo, (_, _, padrao) in VALORES.items()
               if (m := re.search(padrao, t))}
    unidade = re.search(r"creatinin\w*[^0-9]{0,20}?\d+(?:[.,]\d+)?\s*(mg/dl|mg/ml|mmol/l|[uμµ]mol/l)", t)
    valores["unidade_creatinina"] = {"mg/dl": "mg/dL", "mg/ml": "mg/mL", "mmol/l": "mmol/L"}.get(
        unidade.group(1), "µmol/L") if unidade else None
    for m in re.finditer(r"\b(\d{1,3})\s*anos\b", t):
        if not t[max(0, m.start() - 3):m.start()].endswith("ha "):
            valores["idade"] = int(m.group(1))
            break
    for campo, padrao in (("cisto_tamanho_mm", r"cist\w*[^.;]{0,40}?" + NUMERO + r"\s*(mm|cm)"),
                          ("ducto_pancreatico_principal_mm", r"(ducto|wirsung)[^.;]{0,40}?" + NUMERO + r"\s*(mm|cm)"),
                          ("nodulo_mural_mm", r"nodulo[^.;]{0,30}?" + NUMERO + r"\s*(mm|cm)")):
        if m := re.search(padrao, t):
            numero, unidade_medida = m.groups()[-2:]
            valores[campo] = _numero(numero) * (10 if unidade_medida == "cm" else 1)
    if re.search(r"(painel|biomarcador)[^.;]{0,30}normal", t):
        valores["painel_normal_sem_valores"] = True
    return valores


def detectar_patologia(texto: str) -> dict:
    t = _normalizar(texto)
    saida = {"operado": bool(re.search(r"operad|whipple|duodenopancreatectomia|pancreatectomia|ressecad|resseccao", t))}
    for chave, padrao, prefixo in (("t", r"\bp?t([1-4])[a-c]?\b", "T"), ("n", r"\bp?n([0-2])\b", "N"),
                                   ("grau", r"\bg([1-4])\b", "G")):
        if m := re.search(padrao, t):
            saida[chave] = f"{prefixo}{m.group(1)}"
    return saida


def detectar_genes(texto: str) -> tuple[dict[str, bool | None], str | None]:
    """Genes do tumor com status (True alterado, False selvagem, None indefinido) e variante germinativa."""
    genes: dict[str, bool | None] = {}
    germinativo = None
    for frase in re.split(r"[.;\n]", texto):
        frase_norm = _normalizar(frase)
        e_germinativa = bool(re.search(r"germinativ|herdad|hereditari|portador", frase_norm))
        for m in re.finditer(r"\b([A-Z][A-Z0-9]{2,7})\b", frase):
            gene = m.group(1)
            if gene not in GENES_CHAVE:
                continue
            if e_germinativa:
                germinativo = germinativo or gene
                continue
            janela = _normalizar(frase[m.end():m.end() + 40])
            if re.search(r"selvagem|wild|\bwt\b|nao mutad|sem mutac|negativ", janela):
                genes[gene] = False
            elif re.search(r"mutad|mutac|alterad|delec|amplif|perda|g12|g13|q61|fusao|v600", janela):
                genes[gene] = True
            else:
                genes.setdefault(gene, None)
    return genes, germinativo


def detectar_familia(texto: str) -> dict:
    """Conta parentes com câncer de pâncreas em frases que citam a doença, por lado da família."""
    primeiro_grau, lados, trechos = 0, {"paterno": 0, "materno": 0, "ambos": 0}, []
    numeros = {"dois": 2, "duas": 2, "tres": 3, "2": 2, "3": 3}
    for frase, original in _frases_com_original(texto):
        if "pancrea" not in frase or not re.search(r"cancer|tumor|adenocarcinoma|neoplasia", frase):
            continue
        achou = False
        for m in re.finditer(r"(?:(dois|duas|tres|2|3) )?\b(pai|mae|irmaos?|irmas?|filhos?|filhas?|tios?|tias?|avos?"
                             r"|primos?|primas?)\b( (paterno|paterna|materno|materna))?", frase):
            quantidade = numeros.get(m.group(1) or "", 1)
            parente, lado = m.group(2), m.group(4) or ""
            achou = True
            if parente == "pai":
                lados["paterno"] += 1
                primeiro_grau += 1
            elif parente == "mae":
                lados["materno"] += 1
                primeiro_grau += 1
            elif parente.startswith(("irm", "filh")):
                lados["ambos"] += quantidade
                primeiro_grau += quantidade
            else:
                lados["paterno" if lado.startswith("patern") else "materno" if lado.startswith("matern")
                      else "ambos"] += quantidade
        if achou:
            trechos.append(original)
    mesmo_lado = max(lados["paterno"], lados["materno"]) + lados["ambos"]
    return {"primeiro_grau": primeiro_grau, "mesmo_lado": max(mesmo_lado, primeiro_grau), "trechos": trechos}


def modelos_disponiveis() -> list[str]:
    """Modelos instalados no Ollama ([] se o Ollama não estiver rodando)."""
    try:
        resposta = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        resposta.raise_for_status()
        return [m["name"] for m in resposta.json().get("models", [])]
    except requests.RequestException:
        return []


class AgenteLocal:
    """Mesma interface do AgenteConsulta (perguntar -> Resposta), com o Llama só na leitura do caso."""

    def __init__(self, modelo: str = MODELO_LOCAL):
        self.modelo = modelo
        self.texto_caso = ""
        self.anterior: dict | None = None

    # --- extração -------------------------------------------------------------------------
    def _extrair_com_llama(self, texto: str) -> dict | None:
        mensagens = [
            {"role": "system", "content": PROMPT_EXTRACAO},
            {"role": "user", "content": EXEMPLO_ENTRADA},
            {"role": "assistant", "content": json.dumps(EXEMPLO_SAIDA, ensure_ascii=False)},
            {"role": "user", "content": texto},
        ]
        try:
            resposta = requests.post(f"{OLLAMA_URL}/api/chat", timeout=900, json={
                "model": self.modelo, "messages": mensagens, "format": ESQUEMA_EXTRACAO, "stream": False,
                "keep_alive": "30m", "options": OPCOES})
            resposta.raise_for_status()
            dados = resposta.json()
            self._uso_llama = (dados.get("prompt_eval_count", 0), dados.get("eval_count", 0))
            return json.loads(dados["message"]["content"])
        except (requests.RequestException, json.JSONDecodeError, KeyError):
            self._llama_falhou = True
            return None

    def extrair(self, texto: str) -> dict:
        """Regras primeiro; o Llama completa lacunas e tudo o que ele traz é conferido no texto."""
        texto_norm = _normalizar(texto)
        numeros_do_texto = _numeros_de_valores(texto_norm)
        valores = detectar_valores(texto)
        achados = {campo: {"trecho": trecho, "origem": "regras"} for campo, trecho in detectar_achados(texto).items()}
        patologia = detectar_patologia(texto)
        genes, germinativo = detectar_genes(texto)
        familia = detectar_familia(texto)
        descartados = []
        valores_do_llama: set[str] = set()

        # Sem nenhum número medido (idade, exame) é pergunta, não caso: não vale esperar o Llama.
        llama = self._extrair_com_llama(texto) if numeros_do_texto else None
        if llama:
            for item in llama.get("achados") or []:
                campo, trecho = item.get("campo"), _normalizar(item.get("trecho") or "")
                if campo not in ACHADOS or campo in achados:
                    continue
                _, padrao, negacao = ACHADOS[campo]
                frases = [(f, o) for f, o in _frases_com_original(texto) if trecho and trecho in f]
                if frases and re.search(padrao, frases[0][0]) and not re.search(negacao, frases[0][0]):
                    achados[campo] = {"trecho": frases[0][1], "origem": "Llama (conferido)"}
                else:
                    descartados.append(f"{ACHADOS[campo][0]}: sugerido pelo Llama sem trecho que o comprove")
            for campo in ("idade", "ca19_9", "creatinina", "lyve1", "reg1b", "tff1"):
                valor = llama.get(campo)
                if valor is None or campo in valores:
                    continue
                if float(valor) in numeros_do_texto:
                    valores[campo] = float(valor)
                    valores_do_llama.add(campo)
                else:
                    descartados.append(f"{campo} = {valor}: valor do Llama que não aparece no texto")
            if not familia["trechos"] and llama.get("parentes_primeiro_grau", 0) + llama.get("parentes_mesmo_lado", 0):
                if re.search(r"pancrea", texto_norm) and re.search(r"\b(pai|mae|irm|filh|tio|tia|avo|prim)", texto_norm):
                    familia = {"primeiro_grau": int(llama["parentes_primeiro_grau"]),
                               "mesmo_lado": max(int(llama["parentes_mesmo_lado"]), int(llama["parentes_primeiro_grau"])),
                               "trechos": ["(contagem do Llama)"]}
            gene_llama = (llama.get("variante_germinativa") or "").strip().upper()
            if not germinativo and gene_llama:
                if gene_llama.lower() in texto_norm:
                    germinativo = gene_llama
                else:
                    descartados.append(f"variante germinativa {gene_llama}: não aparece no texto")
        return {"valores": valores, "achados": achados, "patologia": patologia, "genes": genes,
                "germinativo": germinativo, "familia": familia, "descartados": list(dict.fromkeys(descartados)),
                "valores_do_llama": valores_do_llama, "usou_llama": llama is not None}

    @staticmethod
    def _tem_dados(extraido: dict) -> bool:
        valores = {k: v for k, v in extraido["valores"].items() if v is not None}
        return bool(valores or extraido["achados"] or extraido["genes"] or extraido["germinativo"]
                    or extraido["familia"]["trechos"] or extraido["patologia"].get("t"))

    # --- ferramentas -----------------------------------------------------------------------
    def _avaliar(self, x: dict, usadas: list[dict]) -> dict:
        v, achados, pat = x["valores"], x["achados"], x["patologia"]
        idade = v.get("idade")
        resultados: dict = {"genes": {}}

        def registrar(nome: str, entrada: dict, saida):
            usadas.append({"ferramenta": nome, "entrada": entrada,
                           "saida": json.dumps(saida, ensure_ascii=False) if not isinstance(saida, str) else saida})
            return saida

        diagnosticado = pat.get("operado") or pat.get("t")
        if idade and not diagnosticado:
            entrada = {"idade": int(idade), **{campo: True for campo in achados},
                       "parentes_primeiro_grau_com_cancer_pancreas": x["familia"]["primeiro_grau"],
                       "parentes_mesmo_lado_com_cancer_pancreas": x["familia"]["mesmo_lado"],
                       "variante_germinativa": x["germinativo"], "imc": v.get("imc"),
                       "cisto_tamanho_mm": v.get("cisto_tamanho_mm"), "nodulo_mural_mm": v.get("nodulo_mural_mm"),
                       "ducto_pancreatico_principal_mm": v.get("ducto_pancreatico_principal_mm"),
                       "ca19_9_u_ml": v.get("ca19_9")}
            resultados["risco"] = registrar("avaliar_sinais_e_fatores_de_risco", entrada,
                                            conhecimento.avaliar_sinais_e_fatores(**entrada))

        painel = ("creatinina", "lyve1", "reg1b", "tff1")
        if idade and all(v.get(c) is not None for c in painel):
            entrada = {"idade": idade, "creatinina": v["creatinina"], "lyve1": v["lyve1"], "reg1b": v["reg1b"],
                       "tff1": v["tff1"], "ca19_9": v.get("ca19_9"),
                       "unidade_creatinina": v.get("unidade_creatinina") or "mg/dL"}
            try:
                resultados["biomarcadores"] = registrar("avaliar_biomarcadores_urinarios", entrada,
                                                        inferencia.avaliar_biomarcadores(**entrada))
                # Colestase eleva o CA19-9 e ele domina o modelo: mostra também o painel sem CA19-9.
                if "ictericia" in achados and entrada["ca19_9"] is not None:
                    sem_ca = {**entrada, "ca19_9": None}
                    resultados["biomarcadores_sem_ca19_9"] = registrar(
                        "avaliar_biomarcadores_urinarios", sem_ca, inferencia.avaliar_biomarcadores(**sem_ca))
            except (ValueError, inferencia.ModeloIndisponivel) as erro:
                resultados["biomarcadores_erro"] = str(erro)

        if pat.get("operado") and idade and all(pat.get(c) for c in ("t", "n", "grau")):
            entrada = {"idade": idade, "estadio_t": pat["t"], "estadio_n": pat["n"], "grau": pat["grau"],
                       "kras_mutado": x["genes"].get("KRAS"), "tp53_mutado": x["genes"].get("TP53"),
                       "cdkn2a_alterado": x["genes"].get("CDKN2A"), "smad4_alterado": x["genes"].get("SMAD4")}
            resultados["prognostico"] = registrar("estimar_prognostico_pos_resseccao", entrada,
                                                  inferencia.estimar_prognostico(**entrada))

        # Só genes do tumor: a frequência somática do TCGA não descreve variantes germinativas.
        for gene in x["genes"]:
            if gene not in resultados["genes"]:
                try:
                    resultados["genes"][gene] = registrar("consultar_alteracoes_geneticas_tcga", {"gene": gene},
                                                          genomica.frequencia_alteracoes(gene))
                except Exception:  # API externa; o relatório segue sem esse gene
                    pass
        return resultados

    # --- relatório -------------------------------------------------------------------------
    def perguntar(self, texto: str) -> Resposta:
        inicio = time.time()
        texto_seguro, removidos = anonimizar(texto)
        self._uso_llama = (0, 0)
        self._llama_falhou = False
        usadas: list[dict] = []

        novo = self.extrair(texto_seguro)
        if not self._tem_dados(novo) and not achados_negados(texto_seguro):
            return self._resposta(self._responder_pergunta(texto_seguro), usadas, removidos, inicio, novo)

        comparacao = None
        if self.anterior:
            novo = self._mesclar(self.anterior["extraido"], novo, texto_seguro)
            self.texto_caso += "\n" + texto_seguro
        else:
            self.texto_caso = texto_seguro
        resultados = self._avaliar(novo, usadas)
        if self.anterior:
            comparacao = self._comparar(self.anterior["resultados"], resultados)
        self.anterior = {"extraido": novo, "resultados": resultados}
        relatorio = self._montar_relatorio(novo, resultados)
        if comparacao:
            relatorio = f"**Comparação com a avaliação anterior:** {comparacao}\n\n{relatorio}"
        return self._resposta(relatorio, usadas, removidos, inicio, novo)

    def _resposta(self, texto: str, usadas, removidos, inicio, extraido) -> Resposta:
        entrada, saida = self._uso_llama
        if extraido.get("usou_llama"):
            modelo = f"{self.modelo}, modo guiado"
        elif self._llama_falhou:
            modelo = "só regras (Ollama indisponível)"
        else:
            modelo = f"{self.modelo}, modo guiado; sem dados de caso, Llama não foi necessário"
        uso = {"modelo": modelo, "local": True, "chamadas": 1 if extraido.get("usou_llama") else 0,
               "entrada": entrada, "saida": saida, "cache_leitura": 0, "cache_escrita": 0,
               "segundos": time.time() - inicio}
        return Resposta(texto, usadas, removidos, uso, "end_turn")

    @staticmethod
    def _mesclar(anterior: dict, novo: dict, texto_novo: str) -> dict:
        """Atualização do caso: valores novos substituem os antigos; negações removem achados."""
        valores = {**anterior["valores"], **{k: v for k, v in novo["valores"].items() if v is not None}}
        if novo["valores"].get("painel_normal_sem_valores"):
            for campo in ("creatinina", "lyve1", "reg1b", "tff1"):
                valores.pop(campo, None)
        achados = {k: v for k, v in anterior["achados"].items() if k not in achados_negados(texto_novo)}
        achados.update(novo["achados"])
        familia = novo["familia"] if novo["familia"]["trechos"] else anterior["familia"]
        return {"valores": valores, "achados": achados,
                "patologia": {**anterior["patologia"], **{k: v for k, v in novo["patologia"].items() if v}},
                "genes": {**anterior["genes"], **novo["genes"]}, "germinativo": novo["germinativo"] or anterior["germinativo"],
                "familia": familia, "descartados": novo["descartados"],
                "valores_do_llama": anterior["valores_do_llama"] | novo["valores_do_llama"], "usou_llama": novo["usou_llama"]}

    @staticmethod
    def _comparar(antes: dict, depois: dict) -> str:
        partes = []
        if "risco" in antes or "risco" in depois:
            p1 = antes.get("risco", {}).get("nivel_prioridade", "—").upper()
            p2 = depois.get("risco", {}).get("nivel_prioridade", "—").upper()
            partes.append(f"prioridade {p1} → {p2}" + (" (sem mudança)" if p1 == p2 else ""))
        f1 = antes.get("biomarcadores", {}).get("faixa", "não avaliado")
        f2 = depois.get("biomarcadores", {}).get("faixa", "não avaliado")
        if f1 != "não avaliado" or f2 != "não avaliado":
            partes.append(f"painel urinário {f1.upper()} → {f2.upper()}")
        return "; ".join(partes) or "sem dados comparáveis"

    def _responder_pergunta(self, texto: str) -> str:
        t = _normalizar(texto)
        for padrao, topico in TOPICOS_REFERENCIA.items():
            if re.search(padrao, t):
                return (f"**Referência — {TITULOS_REFERENCIA[topico]}**\n\n```\n{conhecimento.referencia(topico)}\n```\n\n"
                        "No modo local guiado eu respondo com textos curados e com a avaliação de casos clínicos; "
                        "para perguntas abertas use o motor Claude.")
        return ("Não encontrei dados de um caso clínico nem um tópico de referência nesta mensagem. Descreva o caso "
                "(idade, sintomas, exames, história familiar, patologia) ou pergunte sobre: "
                + ", ".join(t.replace("_", " ") for t in conhecimento.REFERENCIAS) + ".")

    def _montar_relatorio(self, x: dict, r: dict) -> str:
        v, pat = x["valores"], x["patologia"]
        linhas = ["## Resumo do caso"]
        resumo = [f"{int(v['idade'])} anos" if v.get("idade") else "idade não informada"]
        if x["achados"]:
            resumo.append("achados: " + ", ".join(ACHADOS[c][0].lower() if c in ACHADOS else
                                                  "diabetes de início recente" for c in x["achados"]))
        exames = [f"{VALORES[c][0]} {_fmt(v[c])} {VALORES[c][1] or v.get('unidade_creatinina') or 'mg/dL'}".strip()
                  for c in ("ca19_9", "creatinina", "lyve1", "reg1b", "tff1", "imc") if v.get(c) is not None]
        if exames:
            resumo.append("exames: " + "; ".join(exames))
        if pat.get("t"):
            resumo.append(f"patologia: p{pat['t']} p{pat.get('n', 'N?')} {pat.get('grau', 'G?')}"
                          + (" após ressecção" if pat.get("operado") else ""))
        if x["genes"]:
            resumo.append("tumor: " + ", ".join(f"{g} ({'alterado' if s else 'selvagem' if s is False else 'status ?'})"
                                                for g, s in x["genes"].items()))
        if x["germinativo"]:
            resumo.append(f"variante germinativa em {x['germinativo']}")
        if x["familia"]["trechos"]:
            resumo.append(f"família: {x['familia']['primeiro_grau']} parente(s) de 1º grau e "
                          f"{x['familia']['mesmo_lado']} do mesmo lado com câncer de pâncreas")
        frase_resumo = "; ".join(resumo)
        linhas += [frase_resumo[0].upper() + frase_resumo[1:] + ".", ""]

        risco = r.get("risco")
        if risco:
            rotulo = {"urgente": "URGENTE", "investigar": "INVESTIGAR", "vigilancia_especializada":
                      "VIGILÂNCIA ESPECIALIZADA", "orientacao": "ORIENTAÇÃO"}[risco["nivel_prioridade"]]
            linhas += [f"## Prioridade: {rotulo}"]
            if risco["sinais_de_alarme"]:
                linhas.append(f"Definida pelas regras de sinais de alarme: {risco['sinais_de_alarme'][0]['achado'].lower()}.")
            elif risco["criterios_alto_risco"]:
                linhas.append(f"Critério de alto risco: {risco['criterios_alto_risco'][0]['criterio'].lower()}.")
            else:
                linhas.append("Nenhum critério de investigação imediata pelas regras aplicadas.")
            linhas += ["", "## Achados que sustentam a prioridade"]
            for item in risco["sinais_de_alarme"]:
                linhas.append(f"- {item['achado']} — {item['conduta_sugerida']} ({item['fonte'].split(' — ')[0].rstrip('.')})")
            for item in risco["criterios_alto_risco"]:
                elegivel = "elegível agora" if item["elegivel_vigilancia"] else "ainda não elegível"
                linhas.append(f"- {item['criterio']} ({elegivel}) — {item['conduta_sugerida']}")
            if risco.get("cisto_pancreatico"):
                c = risco["cisto_pancreatico"]
                linhas.append(f"- Cisto: estigmas {', '.join(c['estigmas_alto_risco']) or 'nenhum'}; características "
                              f"preocupantes {', '.join(c['caracteristicas_preocupantes']) or 'nenhuma'} — {c['conduta_sugerida']}")
            for texto in risco["fatores_de_risco"] + risco["observacoes"]:
                linhas.append(f"- {texto}")
            linhas.append("")
        elif pat.get("operado") or pat.get("t"):
            linhas += ["## Situação: adenocarcinoma de pâncreas já diagnosticado",
                       "As regras de suspeição não se aplicam; foco em prognóstico, genômica e seguimento.", ""]

        modelos = []
        if r.get("biomarcadores"):
            for chave in ("biomarcadores", "biomarcadores_sem_ca19_9"):
                if r.get(chave):
                    modelos += _linhas_biomarcadores(r[chave])
            if r.get("biomarcadores_sem_ca19_9"):
                modelos.append("  - Com icterícia o CA19-9 pode estar falsamente elevado por colestase: dê mais peso ao "
                               "resultado sem CA19-9 e repita o CA19-9 após a desobstrução biliar.")
            if not v.get("unidade_creatinina"):
                modelos.append("  - Unidade da creatinina não informada: assumido mg/dL (padrão dos laboratórios brasileiros).")
        elif r.get("biomarcadores_erro"):
            modelos.append(f"- Painel urinário não calculado: {r['biomarcadores_erro']}")
        p = r.get("prognostico")
        if p:
            sg = p["sobrevida_global_estimada"]
            modelos.append(f"- Prognóstico pós-ressecção (TCGA-PAAD): grupo **{p['grupo_de_risco'].upper()}**; sobrevida "
                           f"global estimada {_pct(sg['12_meses'])} em 12 meses e {_pct(sg['24_meses'])} em 24 meses; "
                           f"C-index {_fmt(p['c_index_validacao_cruzada'], 3)} (discriminação modesta, risco relativo).")
            modelos += [f"  - {alerta}" for alerta in p["alertas"]]
        if modelos:
            linhas += ["## Resultado dos modelos", *modelos, ""]

        if r["genes"] or x["germinativo"] or pat.get("operado") or pat.get("t"):
            linhas.append("## Genética e genômica")
            if x["germinativo"]:
                nota = genomica.NOTAS_GENES.get(x["germinativo"], "Sem nota clínica curada para este gene.")
                linhas.append(f"- {x['germinativo']} (variante germinativa): {nota}")
            for gene, g in r["genes"].items():
                status = x["genes"].get(gene)
                origem = "alterado no tumor" if status else "selvagem no tumor" if status is False else "citado"
                variantes = ", ".join(f"{k} ({n})" for k, n in list(g["variantes_mais_frequentes"].items())[:3])
                linhas.append(f"- {gene} ({origem}): alterado em {_fmt(g['qualquer_alteracao']['percentual'], 1)}% dos PDAC "
                              f"do TCGA-PAAD" + (f"; mais comuns: {variantes}" if variantes else "") + f". {g['nota_clinica']}")
            if pat.get("operado") or pat.get("t"):
                linhas.append("- Teste germinativo é recomendado para todo paciente com adenocarcinoma de pâncreas (NCCN), "
                              "se ainda não realizado.")
            linhas.append("")

        linhas.append("## Próximos passos sugeridos")
        if risco:
            passos = list(risco["orientacoes"]["exames_sugeridos"])
        else:
            passos = ["Discutir o caso em tumor board multidisciplinar (adjuvância e seguimento).",
                      "Teste germinativo e aconselhamento genético para a família, se ainda não realizados.",
                      "Seguimento com CA19-9 e imagem conforme a diretriz vigente."]
            if x["genes"].get("KRAS") is False:
                passos.append("KRAS selvagem: pesquisar fusões NRG1, NTRK, ALK, ROS1, RET e BRAF V600E.")
        linhas += [f"{i}. {passo}" for i, passo in enumerate(passos, 1)] + [""]
        if risco:
            o = risco["orientacoes"]
            linhas += [f"**Prazo:** {o['prazo']}" + (f" {o['direitos_sus']}" if o["direitos_sus"] else ""), "",
                       "## Rede de segurança — oriente o paciente a voltar antes se tiver",
                       *[f"- {sinal}" for sinal in o["sinais_de_retorno"]], "",
                       "## Como explicar ao paciente", o["explicacao_ao_paciente"], ""]

        faltam = self._dados_faltantes(x, r)
        if faltam:
            linhas += ["## Dados que faltam e mudariam a conduta", *[f"- {f}" for f in faltam], ""]

        linhas.append("## Dados considerados (extraídos do texto — confira)")
        origem = lambda campo: "Llama, conferido no texto" if campo in x["valores_do_llama"] else "regras"  # noqa: E731
        if v.get("idade"):
            linhas.append(f"- Idade: {int(v['idade'])} anos ({origem('idade')})")
        for campo in ("ca19_9", "creatinina", "lyve1", "reg1b", "tff1", "imc"):
            if v.get(campo) is not None:
                unidade = VALORES[campo][1] or v.get("unidade_creatinina") or "mg/dL (assumido)"
                linhas.append(f"- {VALORES[campo][0]}: {_fmt(v[campo])} {unidade} ({origem(campo)})")
        for campo, info in x["achados"].items():
            rotulo = ACHADOS[campo][0] if campo in ACHADOS else "Diabetes de início recente (≤ 3 anos)"
            linhas.append(f"- {rotulo}: \"{info['trecho']}\" ({info['origem']})")
        if pat.get("t") or pat.get("operado"):
            linhas.append(f"- Patologia: {'operado' if pat.get('operado') else 'não operado'}; "
                          f"{pat.get('t', 'T?')} {pat.get('n', 'N?')} {pat.get('grau', 'G?')} (regras)")
        if x["genes"]:
            linhas.append("- Genes do tumor: " + ", ".join(
                f"{g} {'alterado' if s else 'selvagem' if s is False else 'status não informado'}"
                for g, s in x["genes"].items()) + " (regras)")
        if x["germinativo"]:
            linhas.append(f"- Variante germinativa: {x['germinativo']}")
        for familia in x["familia"]["trechos"]:
            linhas.append(f"- História familiar: \"{familia}\" → {x['familia']['primeiro_grau']} de 1º grau, "
                          f"{x['familia']['mesmo_lado']} do mesmo lado")
        linhas += [f"- Descartado: {d}" for d in x["descartados"]]
        if risco:
            linhas += ["", "## Nota para o prontuário", "```", risco["orientacoes"]["nota_para_prontuario"], "```"]
        linhas += ["", "## Limitações e fontes"]
        limites = []
        for chave in ("biomarcadores", "prognostico"):
            if r.get(chave):
                limites += r[chave]["limitacoes"]
        if r["genes"]:
            limites.append(next(iter(r["genes"].values()))["limitacoes"])
        fontes = sorted({item["fonte"] for chave in ("sinais_de_alarme", "criterios_alto_risco")
                         for item in (risco or {}).get(chave, [])})
        linhas += [f"- {l}" for l in limites] + [f"- Fonte: {f}" for f in fontes]
        linhas.append("- Relatório montado automaticamente a partir das ferramentas (modo guiado do Llama local): os "
                      "números vêm dos modelos validados; o texto do caso foi lido pelo Llama e conferido por regras.")
        linhas += ["", f"> {AVISO_CLINICO}"]
        return "\n".join(linhas)

    def _dados_faltantes(self, x: dict, r: dict) -> list[str]:
        v, pat = x["valores"], x["patologia"]
        faltam = []
        texto = _normalizar(self.texto_caso)
        if not v.get("idade"):
            faltam.append("Idade — necessária para as regras de alarme e para os modelos.")
        if pat.get("operado") or pat.get("t"):
            faltam += ["Margem cirúrgica (R0/R1) — forte fator prognóstico.",
                       "CA19-9 pós-operatório e performance status — orientam adjuvância e prognóstico."]
            if not all(pat.get(c) for c in ("t", "n", "grau")):
                faltam.append("pT, pN e grau completos — necessários para o modelo de prognóstico.")
            return faltam
        risco = r.get("risco") or {}
        investigando = risco.get("nivel_prioridade") in {"urgente", "investigar"}
        if investigando and v.get("ca19_9") is None:
            faltam.append("CA19-9 sérico — complementa a investigação (interpretar junto com bilirrubina).")
        painel = [c for c in ("creatinina", "lyve1", "reg1b", "tff1") if v.get(c) is None]
        if 0 < len(painel) < 4:
            faltam.append(f"Painel urinário incompleto (falta {', '.join(painel)}) — o modelo precisa dos quatro valores.")
        if investigando and not re.search(
                r"\btc\b|tomografia|ressonancia|\brm\b|ecoendoscopia|ultrass|imagem", texto):
            faltam.append("Exame de imagem pancreática (TC com protocolo pancreático) — confirma ou afasta lesão.")
        return faltam


def _linhas_biomarcadores(b: dict) -> list[str]:
    pontos = " · ".join(f"{ROTULOS_PONTOS[k]} {p['resultado']}" for k, p in b["pontos_operacionais"].items())
    ajust = b["probabilidade_ajustada_por_prevalencia"]
    contrib = ", ".join(f"{c['variavel']} ({c['efeito_na_probabilidade']:+.2f})".replace(".", ",")
                        for c in b["contribuicoes"][:3])
    auc = b["desempenho_validado"]["auroc_teste"]
    linhas = [
        f"- Painel urinário {'com' if b['modelo'].endswith('ca19_9') else 'sem'} CA19-9: faixa **{b['faixa'].upper()}**; "
        f"{pontos}; probabilidade reajustada para prevalência 3% ≈ "
        f"{_pct(ajust['sintomaticos_atencao_primaria']['probabilidade'])} e 15% ≈ "
        f"{_pct(ajust['encaminhados_gastro_oncologia']['probabilidade'])} (no estudo: "
        f"{_pct(b['probabilidade_pdac_no_estudo'])}). Principais contribuições: {contrib}. AUROC validado no teste: "
        f"{_fmt(auc['auc'], 3)} (IC 95% {_fmt(auc['ic95'][0], 3)}–{_fmt(auc['ic95'][1], 3)})."
    ]
    return linhas + [f"  - {alerta}" for alerta in b["alertas"]]


def _fmt(numero: float, casas: int = 2) -> str:
    texto = f"{numero:.{casas}f}".rstrip("0").rstrip(".") if casas else f"{numero:.0f}"
    return texto.replace(".", ",")


def _pct(fracao: float) -> str:
    return f"{fracao * 100:.1f}%".replace(".", ",")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdin.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Agente local com Llama (Ollama), modo guiado")
    parser.add_argument("--modelo", default=MODELO_LOCAL)
    args = parser.parse_args()
    if args.modelo not in modelos_disponiveis():
        print(f"Aviso: Ollama ou modelo '{args.modelo}' indisponível — a extração usará só as regras.")
    agente = AgenteLocal(args.modelo)
    print(f"Agente local ({args.modelo}, modo guiado) — nada sai deste computador. 'sair' para encerrar.\n{AVISO_CLINICO}\n")
    while True:
        try:
            pergunta = input("Médico> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if pergunta.lower() in {"sair", "exit", "quit"}:
            break
        if pergunta:
            resposta = agente.perguntar(pergunta)
            print(f"\n{resposta.texto}\n\n[{resposta.resumo_uso()}]\n")


if __name__ == "__main__":
    main()

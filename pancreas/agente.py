"""Agente de consulta oncológica (Claude + ferramentas locais).

O agente segue o roteiro da skill `pancreas-consulta-oncologica` (lido do SKILL.md, a mesma
fonte usada no Claude Code) e chama ferramentas que rodam localmente: modelos de
biomarcadores e prognóstico, regras de sinais de alarme, genômica do TCGA e referências.
Somente o texto da conversa (anonimizado) e os resultados das ferramentas vão para a API.

Uso no terminal: python -m pancreas.agente
Requer a variável de ambiente ANTHROPIC_API_KEY.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field

import anthropic
from anthropic import beta_tool

from . import conhecimento, genomica, inferencia
from .config import AVISO_CLINICO, SKILLS
from .privacidade import anonimizar

MODELO = os.environ.get("PANCREAS_MODELO_CLAUDE", "claude-opus-5-5")
# Raciocínio clínico pede esforço alto; "medium" responde mais rápido em demonstrações.
ESFORCO = os.environ.get("PANCREAS_ESFORCO", "high")
MAX_ITERACOES_FERRAMENTAS = 12

# US$ por milhão de tokens (escrita de cache de 5 min = 1,25 × entrada).
PRECOS_USD_POR_MILHAO = {
    "claude-opus-5-5": {"entrada": 4.0, "saida": 20.0, "cache_leitura": 0.20, "cache_escrita": 5.0},
}

CASOS_EXEMPLO = [
    "Homem, 68 anos, icterícia indolor há 3 semanas, perda de 7 kg em 2 meses, diabetes diagnosticado há 1 ano. "
    "CA19-9 de 410 U/mL. Painel urinário: creatinina 80 mg/dL, LYVE1 6,1 ng/mL, REG1B 150 ng/mL, TFF1 900 ng/mL.",
    "Mulher, 52 anos, assintomática, portadora de variante patogênica germinativa em BRCA2; pai e tio paterno "
    "tiveram câncer de pâncreas. Deve entrar em vigilância? Como?",
    "Paciente de 64 anos operado (Whipple) com adenocarcinoma ductal pT3 pN1 G3, KRAS G12D e TP53 mutados. "
    "Qual o prognóstico relativo e há alteração acionável?",
]


def _json(dados) -> str:
    return json.dumps(dados, ensure_ascii=False)


def _texto_do_resultado(conteudo) -> str:
    """Conteúdo de um tool_result (string ou lista de blocos de texto) como texto simples."""
    if isinstance(conteudo, str):
        return conteudo
    return "".join(b.get("text", "") for b in conteudo or [] if isinstance(b, dict))


def _erro(mensagem: str) -> str:
    return _json({"erro": mensagem})


@beta_tool
def avaliar_biomarcadores_urinarios(
    idade: float,
    creatinina_urinaria: float,
    unidade_creatinina: str,
    lyve1_ng_ml: float,
    reg1b_ng_ml: float,
    tff1_ng_ml: float,
    ca19_9_plasmatico_u_ml: float | None = None,
) -> str:
    """Estima a probabilidade de PDAC pelo painel urinário LYVE1, REG1B e TFF1 (± CA19-9 plasmático).

    Modelo treinado com Debernardi et al. 2020. Use somente quando os valores dos biomarcadores urinários
    forem informados. Devolve probabilidade calibrada,
    faixa de risco, resultado em três pontos operacionais (triagem, equilíbrio, confirmação), probabilidade
    reajustada para prevalências realistas, contribuição de cada variável e limitações.

    Args:
        idade: Idade em anos.
        creatinina_urinaria: Creatinina na mesma amostra de urina.
        unidade_creatinina: Unidade da creatinina: "mg/dL" (padrão dos laboratórios brasileiros), "mg/mL",
            "mmol/L" ou "µmol/L".
        lyve1_ng_ml: LYVE1 urinário em ng/mL.
        reg1b_ng_ml: REG1B urinário em ng/mL.
        tff1_ng_ml: TFF1 urinário em ng/mL.
        ca19_9_plasmatico_u_ml: CA19-9 plasmático em U/mL, se disponível (ativa o modelo com CA19-9).
    """
    try:
        return _json(inferencia.avaliar_biomarcadores(
            idade=idade, creatinina=creatinina_urinaria, unidade_creatinina=unidade_creatinina,
            lyve1=lyve1_ng_ml, reg1b=reg1b_ng_ml, tff1=tff1_ng_ml, ca19_9=ca19_9_plasmatico_u_ml,
        ))
    except (ValueError, inferencia.ModeloIndisponivel) as erro:
        return _erro(str(erro))


@beta_tool
def avaliar_sinais_e_fatores_de_risco(
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
) -> str:
    """Aplica regras de diretrizes (NICE NG12, CAPS 2020, Fukuoka 2017) e devolve a prioridade do caso.

    Níveis de prioridade: urgente, investigar, vigilancia_especializada, orientacao. Também devolve sinais de
    alarme, critérios de alto risco hereditário, achados de cisto pancreático, observações sobre CA19-9 e
    próximos passos.

    Chame em toda consulta com dados clínicos, mesmo sem biomarcadores. Informe apenas o que foi relatado;
    deixe o restante no padrão.

    Args:
        idade: Idade em anos.
        ictericia: Icterícia presente.
        perda_peso_nao_intencional: Perda de peso não intencional.
        dor_abdominal_ou_dorsal: Dor abdominal (epigástrica) ou dorsal.
        sintomas_gastrointestinais: Diarreia, náusea, vômitos ou constipação novos.
        esteatorreia: Esteatorreia nova.
        massa_abdominal_palpavel: Massa abdominal palpável.
        diabetes_inicio_recente: Diabetes diagnosticado nos últimos 3 anos.
        pancreatite_aguda_sem_causa: Pancreatite aguda sem causa aparente.
        pancreatite_cronica: Pancreatite crônica.
        pancreatite_hereditaria: Pancreatite hereditária (ex.: PRSS1).
        parentes_primeiro_grau_com_cancer_pancreas: Número de parentes de 1º grau com câncer de pâncreas.
        parentes_mesmo_lado_com_cancer_pancreas: Total de parentes afetados do mesmo lado da família
            (incluindo os de 1º grau).
        variante_germinativa: Gene com variante patogênica germinativa conhecida (ex.: BRCA2, CDKN2A, STK11).
        tabagismo_atual: Fumante atual.
        imc: Índice de massa corporal.
        cisto_pancreatico: Há cisto pancreático/IPMN.
        cisto_tamanho_mm: Maior diâmetro do cisto em mm.
        nodulo_mural_mm: Tamanho do nódulo mural com realce, em mm (0 se ausente).
        ducto_pancreatico_principal_mm: Calibre do ducto pancreático principal em mm.
        ca19_9_u_ml: CA19-9 sérico em U/mL.
    """
    argumentos = dict(locals())
    try:
        return _json(conhecimento.avaliar_sinais_e_fatores(**argumentos))
    except ValueError as erro:
        return _erro(str(erro))


@beta_tool
def estimar_prognostico_pos_resseccao(
    idade: float,
    estadio_t: str,
    estadio_n: str,
    grau: str,
    kras_mutado: bool | None = None,
    tp53_mutado: bool | None = None,
    cdkn2a_alterado: bool | None = None,
    smad4_alterado: bool | None = None,
) -> str:
    """Estratifica o risco de óbito após ressecção de adenocarcinoma de pâncreas (Cox no TCGA-PAAD).

    Discriminação modesta (C-index ~0,59). Devolve grupo de risco (baixo/intermediário/alto), sobrevida
    estimada em 12 e 24 meses, hazard ratios e limitações. Use apenas para pacientes operados sem metástase;
    não use para doença metastática ou localmente avançada não operada.

    Args:
        idade: Idade em anos.
        estadio_t: Estádio T patológico: T1, T2, T3 ou T4.
        estadio_n: Estádio N patológico: N0, N1 ou N2.
        grau: Grau histológico: G1, G2, G3 ou G4.
        kras_mutado: KRAS mutado no tumor (omita se desconhecido).
        tp53_mutado: TP53 mutado (omita se desconhecido).
        cdkn2a_alterado: CDKN2A mutado ou deletado (omita se desconhecido).
        smad4_alterado: SMAD4 mutado ou deletado (omita se desconhecido).
    """
    try:
        return _json(inferencia.estimar_prognostico(
            idade=idade, estadio_t=estadio_t, estadio_n=estadio_n, grau=grau, kras_mutado=kras_mutado,
            tp53_mutado=tp53_mutado, cdkn2a_alterado=cdkn2a_alterado, smad4_alterado=smad4_alterado,
        ))
    except (ValueError, inferencia.ModeloIndisponivel) as erro:
        return _erro(str(erro))


@beta_tool
def consultar_alteracoes_geneticas_tcga(gene: str) -> str:
    """Frequência de alterações de um gene no adenocarcinoma de pâncreas (TCGA-PAAD, via cBioPortal).

    Inclui mutações, deleções homozigóticas, amplificações, variantes mais comuns e uma nota clínica
    (terapias-alvo, implicações hereditárias).

    Args:
        gene: Símbolo HUGO do gene, ex.: KRAS, TP53, CDKN2A, SMAD4, BRCA2, PALB2, NTRK1.
    """
    try:
        return _json(genomica.frequencia_alteracoes(gene))
    except Exception as erro:  # API externa: qualquer falha vira resposta legível para o modelo
        return _erro(f"Falha ao consultar {gene}: {erro}")


@beta_tool
def consultar_referencia_clinica(topico: str) -> str:
    """Texto de referência curado (com fonte) sobre um tópico de oncologia pancreática.

    Use antes de citar números de sobrevida, critérios de estadiamento, ressecabilidade, cistos, vigilância ou
    testes genéticos, em vez de citá-los de memória.

    Args:
        topico: Um de: estadiamento_ajcc, sobrevida_seer, ca19_9, cistos_pancreaticos, vigilancia_alto_risco,
            sinais_de_alarme, ressecabilidade, conduta_por_estadio, testes_geneticos.
    """
    try:
        return conhecimento.referencia(topico)
    except KeyError as erro:
        return _erro(str(erro))


@beta_tool
def consultar_metricas_e_datasets() -> str:
    """Métricas de validação dos modelos e catálogo dos 8 datasets do projeto.

    Inclui AUROC com IC 95%, sensibilidade/especificidade, validação por coorte, C-index e o status de
    integração de cada dataset. Use quando perguntarem sobre confiabilidade, desempenho, limitações ou origem
    dos dados."""
    return _json({"metricas": inferencia.resumo_metricas(), "datasets": conhecimento.DATASETS})


FERRAMENTAS = [
    avaliar_biomarcadores_urinarios,
    avaliar_sinais_e_fatores_de_risco,
    estimar_prognostico_pos_resseccao,
    consultar_alteracoes_geneticas_tcga,
    consultar_referencia_clinica,
    consultar_metricas_e_datasets,
]


def _roteiro_da_skill() -> str:
    """Corpo do SKILL.md da consulta (sem o cabeçalho YAML) e sua referência de interpretação."""
    pasta = SKILLS / "pancreas-consulta-oncologica"
    texto = (pasta / "SKILL.md").read_text(encoding="utf-8")
    if texto.startswith("---"):
        texto = texto.split("---", 2)[2]
    interpretacao = (pasta / "references" / "interpretacao_modelos.md").read_text(encoding="utf-8")
    return (f"{texto.strip()}\n\n<conteudo_de_references_interpretacao_modelos_md>\n{interpretacao.strip()}\n"
            "</conteudo_de_references_interpretacao_modelos_md>")


def montar_prompt_sistema() -> str:
    return f"""Você é o assistente de oncologia pancreática de um sistema de apoio à decisão usado por médicos em \
consultas, num evento hospitalar no Brasil. Responda em português do Brasil, em tom técnico e objetivo.

Neste ambiente você não executa comandos de terminal: onde o roteiro abaixo cita comandos `python -m pancreas.cli`, \
use as ferramentas equivalentes (avaliar_sinais_e_fatores_de_risco, avaliar_biomarcadores_urinarios, \
estimar_prognostico_pos_resseccao, consultar_alteracoes_geneticas_tcga, consultar_referencia_clinica, \
consultar_metricas_e_datasets).

Os identificadores do paciente são removidos antes de chegar a você ([NOME], [CPF], etc.). Não peça nome, CPF, \
prontuário ou data de nascimento; idade e dados clínicos bastam.

Aviso que deve encerrar todo relatório: {AVISO_CLINICO}

<roteiro_da_consulta>
{_roteiro_da_skill()}
</roteiro_da_consulta>"""


@dataclass
class Resposta:
    texto: str
    ferramentas_usadas: list[dict] = field(default_factory=list)
    identificadores_removidos: int = 0
    uso: dict = field(default_factory=dict)
    motivo_parada: str | None = None

    @property
    def custo_estimado_usd(self) -> float | None:
        precos = PRECOS_USD_POR_MILHAO.get(self.uso.get("modelo", ""))
        if not precos:
            return None
        return sum(self.uso.get(chave, 0) * preco for chave, preco in precos.items()) / 1_000_000

    def resumo_uso(self) -> str:
        if not self.uso:
            return ""
        tokens = sum(self.uso.get(k, 0) for k in ("entrada", "saida", "cache_leitura", "cache_escrita"))
        milhar = lambda n: f"{n:,}".replace(",", ".")  # noqa: E731 — formato brasileiro
        if self.uso.get("local"):
            return (f"Execução local ({self.uso['modelo']}) · {self.uso['chamadas']} chamada(s) · "
                    f"{milhar(tokens)} tokens · {self.uso['segundos']:.0f} s · sem custo; nenhum dado saiu do computador")
        texto = (f"{self.uso['chamadas']} chamada(s) à API · {milhar(tokens)} tokens "
                 f"({milhar(self.uso['cache_leitura'])} lidos do cache)")
        custo = self.custo_estimado_usd
        if custo is not None:
            texto += f" · ~US$ {custo:.3f}".replace(".", ",")
        return texto


class AgenteConsulta:
    """Conversa multi-turno; o histórico é mantido localmente e só cresce (nunca é editado)."""

    def __init__(self, cliente: anthropic.Anthropic | None = None):
        self.cliente = cliente or anthropic.Anthropic()
        self.sistema = [{"type": "text", "text": montar_prompt_sistema(), "cache_control": {"type": "ephemeral"}}]
        self.mensagens: list[dict] = []

    def perguntar(self, texto: str) -> Resposta:
        texto_seguro, removidos = anonimizar(texto)
        self.mensagens.append({"role": "user", "content": texto_seguro})
        runner = self.cliente.beta.messages.tool_runner(
            model=MODELO,
            max_tokens=16000,
            system=self.sistema,
            tools=FERRAMENTAS,
            messages=list(self.mensagens),
            output_config={"effort": ESFORCO},
            max_iterations=MAX_ITERACOES_FERRAMENTAS,
            # Se um classificador de segurança recusar por engano um caso clínico, a API refaz
            # o pedido no modelo de reserva recomendado em vez de devolver a recusa.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
        ultima, usadas = None, []
        uso = {"modelo": MODELO, "chamadas": 0, "entrada": 0, "saida": 0, "cache_leitura": 0, "cache_escrita": 0}
        for mensagem in runner:
            ultima = mensagem
            self.mensagens.append({"role": "assistant", "content": mensagem.content})
            uso["chamadas"] += 1
            uso["entrada"] += mensagem.usage.input_tokens or 0
            uso["saida"] += mensagem.usage.output_tokens or 0
            uso["cache_leitura"] += getattr(mensagem.usage, "cache_read_input_tokens", 0) or 0
            uso["cache_escrita"] += getattr(mensagem.usage, "cache_creation_input_tokens", 0) or 0
            if mensagem.model != MODELO:
                uso["modelo"] = mensagem.model  # o fallback atendeu; o custo estimado deixa de valer
            for bloco in mensagem.content:
                if bloco.type == "tool_use":
                    usadas.append({"ferramenta": bloco.name, "entrada": bloco.input, "id": bloco.id})
            resultados = runner.generate_tool_call_response()
            if resultados is not None:
                self.mensagens.append(resultados)
                saidas = {r["tool_use_id"]: r.get("content") for r in resultados["content"]
                          if isinstance(r, dict) and r.get("type") == "tool_result"}
                for uso in usadas:
                    if uso.get("id") in saidas:
                        uso["saida"] = _texto_do_resultado(saidas[uso["id"]])

        if ultima is None:
            return Resposta("Não houve resposta do modelo.", usadas, removidos, uso)
        if ultima.stop_reason == "refusal":
            return Resposta("O modelo não pôde responder a esta solicitação. Reformule a pergunta com foco clínico.",
                            usadas, removidos, uso, ultima.stop_reason)
        texto_final = "\n".join(b.text for b in ultima.content if b.type == "text").strip()
        if ultima.stop_reason == "max_tokens":
            texto_final += "\n\n[Resposta interrompida pelo limite de tamanho — peça para continuar.]"
        return Resposta(texto_final or "(sem texto)", usadas, removidos, uso, ultima.stop_reason)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdin.reconfigure(encoding="utf-8")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Defina ANTHROPIC_API_KEY para usar o agente (ex.: no PowerShell: $env:ANTHROPIC_API_KEY='...').")
        sys.exit(1)
    agente = AgenteConsulta()
    print(f"Agente de oncologia pancreática ({MODELO}). Digite o caso; 'sair' para encerrar.\n{AVISO_CLINICO}\n")
    while True:
        try:
            pergunta = input("Médico> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if pergunta.lower() in {"sair", "exit", "quit"}:
            break
        if not pergunta:
            continue
        try:
            resposta = agente.perguntar(pergunta)
        except anthropic.AuthenticationError:
            print("Chave da API inválida.")
            break
        except anthropic.RateLimitError:
            print("Limite de requisições atingido; aguarde alguns segundos e tente de novo.")
            continue
        except anthropic.APIConnectionError:
            print("Sem conexão com a API. As abas offline do app continuam funcionando.")
            continue
        except anthropic.APIStatusError as erro:
            print(f"Erro da API ({erro.status_code}): {erro.message}")
            continue
        if resposta.identificadores_removidos:
            print(f"[{resposta.identificadores_removidos} identificador(es) removido(s) antes do envio]")
        for uso in resposta.ferramentas_usadas:
            print(f"  · ferramenta: {uso['ferramenta']}")
        print(f"\nAssistente> {resposta.texto}\n\n[{resposta.resumo_uso()}]\n")


if __name__ == "__main__":
    main()

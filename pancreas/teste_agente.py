"""Teste de ponta a ponta do agente com os casos de exemplo do app.

Para cada caso confere: (1) as ferramentas certas foram chamadas, (2) a resposta traz a
prioridade e os resultados esperados e (3) nenhum número da resposta é inventado — todo número
precisa vir do caso, da saída de alguma ferramenta ou das fontes curadas do prompt. Salva as
respostas completas em reports/ para leitura humana (a checagem automática não substitui isso).

Uso:
  python -m pancreas.teste_agente --motor local [--modelo llama3.1:8b]
  python -m pancreas.teste_agente --motor claude          (requer ANTHROPIC_API_KEY)
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from datetime import datetime

from . import conhecimento
from .agente import CASOS_EXEMPLO, montar_prompt_sistema
from .config import RELATORIOS

CONTINUACAO = ("Se o painel urinário tivesse vindo normal e o CA19-9 fosse 20 U/mL, a prioridade mudaria? "
               "Responda em poucas linhas.")

# (ferramentas que precisam ter sido chamadas, grupos de palavras: cada grupo precisa de ao menos uma)
ESPERADO = [
    ({"avaliar_sinais_e_fatores_de_risco", "avaliar_biomarcadores_urinarios"}, [["URGENTE"], ["ALTA"]]),
    ({"avaliar_sinais_e_fatores_de_risco"}, [["VIGILÂNCIA", "VIGILANCIA"]]),
    ({"estimar_prognostico_pos_resseccao", "consultar_alteracoes_geneticas_tcga"}, [["KRAS"], ["ALTO"]]),
]
ESPERADO_CONTINUACAO = (set(), [["URGENTE"]])

NUMERO = r"\d+(?:[.,]\d+)?"


def numeros_sem_origem(texto: str, fontes: list[str]) -> list[str]:
    """Números da resposta que não batem (com tolerância de arredondamento) com nenhuma fonte."""
    permitidos = {float(n.replace(",", ".")) for fonte in fontes for n in re.findall(NUMERO, fonte)}
    suspeitos = []
    for bruto in re.findall(NUMERO, texto):
        valor = float(bruto.replace(",", "."))
        if valor.is_integer() and valor <= 10:  # numeração de listas, contagens pequenas
            continue
        casas = len(re.split(r"[.,]", bruto)[1]) if re.search(r"[.,]", bruto) else 0
        tolerancia = 0.5 * 10 ** -casas + 1e-9
        if not any(abs(valor - p) <= tolerancia or abs(valor - 100 * p) <= tolerancia for p in permitidos):
            suspeitos.append(bruto)
    return suspeitos


def _criar_agente(motor: str, modelo: str | None):
    if motor == "local":
        from .agente_local import MODELO_LOCAL, AgenteLocal
        return AgenteLocal(modelo or MODELO_LOCAL)
    from .agente import AgenteConsulta
    return AgenteConsulta()


def _conferir(resposta, ferramentas_esperadas: set[str], grupos: list[list[str]], fontes: list[str]) -> list[str]:
    falhas = []
    usadas = {u["ferramenta"] for u in resposta.ferramentas_usadas}
    if faltando := ferramentas_esperadas - usadas:
        falhas.append(f"ferramentas não chamadas: {', '.join(sorted(faltando))}")
    for grupo in grupos:
        if not any(p in resposta.texto.upper() for p in grupo):
            falhas.append(f"resposta sem nenhuma de: {', '.join(grupo)}")
    if suspeitos := numeros_sem_origem(resposta.texto, fontes):
        falhas.append(f"números sem origem nas ferramentas/fontes: {', '.join(dict.fromkeys(suspeitos))}")
    if resposta.motivo_parada in {"refusal", "max_tokens"}:
        falhas.append(f"parou por {resposta.motivo_parada}")
    return falhas


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Teste de ponta a ponta do agente")
    parser.add_argument("--motor", choices=["local", "claude"], default="local")
    parser.add_argument("--modelo", help="modelo do Ollama (motor local)")
    args = parser.parse_args()

    fontes_fixas = [montar_prompt_sistema(), *conhecimento.FONTES.values(), *conhecimento.REFERENCIAS.values()]
    linhas = [f"# Teste de ponta a ponta do agente ({args.motor})", "",
              f"Executado em {datetime.now():%Y-%m-%d %H:%M}.", ""]
    resultados, agente_caso_1, fontes_caso_1 = [], None, []
    for indice, (caso, (ferramentas, grupos)) in enumerate(zip(CASOS_EXEMPLO, ESPERADO), 1):
        agente = _criar_agente(args.motor, args.modelo)
        print(f"Caso {indice}... ", end="", flush=True)
        inicio = time.time()
        resposta = agente.perguntar(caso)
        fontes = [caso, *fontes_fixas, *(u.get("saida", "") for u in resposta.ferramentas_usadas)]
        falhas = _conferir(resposta, ferramentas, grupos, fontes)
        print(f"{'OK' if not falhas else 'FALHOU'} em {time.time() - inicio:.0f}s · {resposta.resumo_uso()}")
        resultados.append((f"Caso {indice}", falhas))
        linhas += _secao(f"Caso {indice}", caso, resposta, falhas)
        if indice == 1:
            agente_caso_1, fontes_caso_1 = agente, fontes

    print("Continuação do caso 1... ", end="", flush=True)
    inicio = time.time()
    resposta = agente_caso_1.perguntar(CONTINUACAO)
    fontes = [CONTINUACAO, *fontes_caso_1, *(u.get("saida", "") for u in resposta.ferramentas_usadas)]
    falhas = _conferir(resposta, *ESPERADO_CONTINUACAO, fontes)
    print(f"{'OK' if not falhas else 'FALHOU'} em {time.time() - inicio:.0f}s · {resposta.resumo_uso()}")
    resultados.append(("Continuação", falhas))
    linhas += _secao("Continuação do caso 1 (multi-turno)", CONTINUACAO, resposta, falhas)

    destino = RELATORIOS / f"teste_agente_{args.motor}.md"
    destino.write_text("\n".join(linhas), encoding="utf-8")
    aprovados = sum(1 for _, falhas in resultados if not falhas)
    print(f"\n{aprovados}/{len(resultados)} aprovados. Respostas completas em {destino}")
    for nome, falhas in resultados:
        for falha in falhas:
            print(f"  {nome}: {falha}")
    return 0 if aprovados == len(resultados) else 1


def _secao(titulo: str, pergunta: str, resposta, falhas: list[str]) -> list[str]:
    return [
        f"## {titulo} — {'aprovado' if not falhas else 'reprovado: ' + '; '.join(falhas)}", "",
        f"**Pergunta:** {pergunta}", "",
        "**Ferramentas:** " + (", ".join(u["ferramenta"] for u in resposta.ferramentas_usadas) or "nenhuma"), "",
        f"**Uso:** {resposta.resumo_uso()}", "",
        "**Resposta:**", "", resposta.texto, "", "---", "",
    ]


if __name__ == "__main__":
    sys.exit(main())

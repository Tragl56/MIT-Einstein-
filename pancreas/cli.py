"""Linha de comando usada pelas skills do Claude Code. Toda saída é JSON (UTF-8).

Exemplos:
  python -m pancreas.cli risco --idade 67 --ictericia --perda-peso --dor --ca19-9 450
  python -m pancreas.cli biomarcadores --idade 67 --creatinina 85 --unidade-creatinina mg/dL \
      --lyve1 5.6 --reg1b 120 --tff1 700 [--ca19-9 450]
  python -m pancreas.cli prognostico --idade 64 --t T3 --n N1 --grau G2 [--kras sim]
  python -m pancreas.cli gene KRAS
  python -m pancreas.cli referencia sobrevida_seer
  python -m pancreas.cli metricas
  python -m pancreas.cli datasets
"""

from __future__ import annotations

import argparse
import json
import sys

from . import conhecimento, genomica, inferencia


def _booleano_opcional(valor: str | None) -> bool | None:
    if valor is None:
        return None
    return valor.strip().lower() in {"sim", "s", "true", "1", "yes", "mutado", "alterado"}


def _imprimir(dados) -> None:
    if isinstance(dados, str):
        print(dados)
    else:
        print(json.dumps(dados, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="python -m pancreas.cli", description="Identificador de câncer de pâncreas")
    sub = parser.add_subparsers(dest="comando", required=True)

    b = sub.add_parser("biomarcadores", help="probabilidade de PDAC pelo painel urinário")
    b.add_argument("--idade", type=float, required=True)
    b.add_argument("--creatinina", type=float, required=True, help="creatinina urinária")
    b.add_argument("--unidade-creatinina", default="mg/dL", help="mg/dL (padrão), mg/mL, mmol/L ou µmol/L")
    b.add_argument("--lyve1", type=float, required=True, help="ng/mL")
    b.add_argument("--reg1b", type=float, required=True, help="ng/mL")
    b.add_argument("--tff1", type=float, required=True, help="ng/mL")
    b.add_argument("--ca19-9", dest="ca19_9", type=float, help="CA19-9 plasmático em U/mL (opcional)")

    r = sub.add_parser("risco", help="sinais de alarme, alto risco hereditário e cistos")
    r.add_argument("--idade", type=int, required=True)
    for flag, destino in (("--ictericia", "ictericia"), ("--perda-peso", "perda_peso_nao_intencional"),
                          ("--dor", "dor_abdominal_ou_dorsal"), ("--sintomas-gi", "sintomas_gastrointestinais"),
                          ("--esteatorreia", "esteatorreia"), ("--massa", "massa_abdominal_palpavel"),
                          ("--diabetes-recente", "diabetes_inicio_recente"),
                          ("--pancreatite-aguda", "pancreatite_aguda_sem_causa"),
                          ("--pancreatite-cronica", "pancreatite_cronica"),
                          ("--pancreatite-hereditaria", "pancreatite_hereditaria"),
                          ("--tabagismo", "tabagismo_atual"), ("--cisto", "cisto_pancreatico")):
        r.add_argument(flag, dest=destino, action="store_true")
    r.add_argument("--parentes-1grau", dest="parentes_primeiro_grau_com_cancer_pancreas", type=int, default=0)
    r.add_argument("--parentes-mesmo-lado", dest="parentes_mesmo_lado_com_cancer_pancreas", type=int, default=0)
    r.add_argument("--variante", dest="variante_germinativa", help="gene com variante germinativa, ex.: BRCA2")
    r.add_argument("--imc", type=float)
    r.add_argument("--cisto-mm", dest="cisto_tamanho_mm", type=float)
    r.add_argument("--nodulo-mm", dest="nodulo_mural_mm", type=float)
    r.add_argument("--ducto-mm", dest="ducto_pancreatico_principal_mm", type=float)
    r.add_argument("--ca19-9", dest="ca19_9_u_ml", type=float)

    p = sub.add_parser("prognostico", help="grupo de risco pós-ressecção (TCGA-PAAD)")
    p.add_argument("--idade", type=float, required=True)
    p.add_argument("--t", required=True, help="T1–T4")
    p.add_argument("--n", required=True, help="N0, N1 ou N2")
    p.add_argument("--grau", required=True, help="G1–G4")
    for gene in ("kras", "tp53", "cdkn2a", "smad4"):
        p.add_argument(f"--{gene}", help="sim/nao (omita se desconhecido)")

    g = sub.add_parser("gene", help="frequência de alterações no TCGA-PAAD")
    g.add_argument("simbolo")

    ref = sub.add_parser("referencia", help="texto de referência clínica")
    ref.add_argument("topico", nargs="?", help=", ".join(conhecimento.REFERENCIAS))

    sub.add_parser("metricas", help="métricas de validação dos modelos")
    sub.add_parser("datasets", help="catálogo dos datasets")

    args = parser.parse_args(argv)
    try:
        if args.comando == "biomarcadores":
            _imprimir(inferencia.avaliar_biomarcadores(
                idade=args.idade, creatinina=args.creatinina, unidade_creatinina=args.unidade_creatinina,
                lyve1=args.lyve1, reg1b=args.reg1b, tff1=args.tff1, ca19_9=args.ca19_9))
        elif args.comando == "risco":
            argumentos = {k: v for k, v in vars(args).items() if k != "comando"}
            _imprimir(conhecimento.avaliar_sinais_e_fatores(**argumentos))
        elif args.comando == "prognostico":
            _imprimir(inferencia.estimar_prognostico(
                idade=args.idade, estadio_t=args.t, estadio_n=args.n, grau=args.grau,
                kras_mutado=_booleano_opcional(args.kras), tp53_mutado=_booleano_opcional(args.tp53),
                cdkn2a_alterado=_booleano_opcional(args.cdkn2a), smad4_alterado=_booleano_opcional(args.smad4)))
        elif args.comando == "gene":
            _imprimir(genomica.frequencia_alteracoes(args.simbolo))
        elif args.comando == "referencia":
            _imprimir(conhecimento.referencia(args.topico) if args.topico else {"topicos": list(conhecimento.REFERENCIAS)})
        elif args.comando == "metricas":
            _imprimir(inferencia.resumo_metricas())
        elif args.comando == "datasets":
            _imprimir(conhecimento.DATASETS)
    except (ValueError, KeyError, inferencia.ModeloIndisponivel) as erro:
        _imprimir({"erro": str(erro)})
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

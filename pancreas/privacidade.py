"""Remoção de identificadores diretos antes de enviar texto ao modelo de linguagem (LGPD).

É uma camada de proteção, não uma garantia: a regra no evento continua sendo não digitar
nome, CPF, prontuário ou outros identificadores do paciente.
"""

from __future__ import annotations

import re

PADROES = [
    # Só a palavra-chave ignora maiúsculas; o nome precisa começar com maiúscula.
    (re.compile(r"\b((?i:nome|paciente|sr|sra|dr|dra)\.?)\s*:?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+"
                r"(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)*"), r"\1 [NOME]"),
    (re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b"), "[CPF]"),
    (re.compile(r"\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b"), "[CNS]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[EMAIL]"),
    (re.compile(r"(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}-\d{4}\b"), "[TELEFONE]"),
    (re.compile(r"(?i)\b(prontu[aá]rio|registro|matr[ií]cula|RGHC?|atendimento)\s*(?:n[º°o.]*)?\s*:?\s*[\w./-]*\d[\w./-]*"),
     r"\1 [REGISTRO]"),
    (re.compile(r"(?i)\bRG\s*:?\s*[\d.\-xX]{5,}"), "RG [RG]"),
    (re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b"), "[DATA]"),
]


def anonimizar(texto: str) -> tuple[str, int]:
    """Devolve o texto sem identificadores diretos e quantas substituições foram feitas."""
    total = 0
    for padrao, substituto in PADROES:
        texto, n = padrao.subn(substituto, texto)
        total += n
    return texto, total

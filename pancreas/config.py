"""Caminhos e constantes compartilhadas pelo projeto."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DADOS_BRUTOS = RAIZ / "data" / "raw"
DADOS_PROCESSADOS = RAIZ / "data" / "processed"
MODELOS = RAIZ / "models"
RELATORIOS = RAIZ / "reports"
SKILLS = RAIZ / ".claude" / "skills"

SEMENTE = 42

# Aviso exibido em toda saída voltada ao usuário (UI, CLI, agente).
AVISO_CLINICO = (
    "Ferramenta de apoio à decisão para pesquisa e demonstração. "
    "Não é dispositivo médico registrado na ANVISA e não substitui avaliação clínica, "
    "exames de imagem, anatomopatológico ou discussão em tumor board."
)


def garantir_pastas() -> None:
    for pasta in (DADOS_BRUTOS, DADOS_PROCESSADOS, MODELOS, RELATORIOS):
        pasta.mkdir(parents=True, exist_ok=True)

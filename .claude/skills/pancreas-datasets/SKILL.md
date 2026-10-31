---
name: pancreas-datasets
description: Catálogo e guia de acesso dos datasets de câncer de pâncreas do projeto — Urinary Biomarkers (Debernardi 2020/Kaggle), Pancreatic Cancer Prediction (Kaggle), TCGA-PAAD (GDC, Hugging Face, cBioPortal/PanCancer Atlas), PLCO, SEER e Imaging Data Commons. Use quando o usuário perguntar de onde vêm os dados, como baixar ou carregar algum desses bancos, se um dataset serve para treinar um modelo, como pedir acesso controlado (PLCO/CDAS, dbGaP, SEER*Stat), como harmonizar variáveis entre bases, ou questões de licença, ética e LGPD para dados de pacientes — inclusive quando citar só o nome da base ("e o SEER?", "dá para usar o PLCO?").
---

# Datasets de câncer de pâncreas

Antes de usar qualquer base num modelo clínico, responda três perguntas: **os dados são reais** (não
sintéticos)? **o desenho permite a pergunta** (caso-controle não estima prevalência; TCGA não tem
controles)? **a licença e a ética permitem o uso**? O catálogo vivo, com o status de integração, sai de:

```
python -m pancreas.cli datasets
```

## Resumo

| Base | O que tem | Acesso | Uso no projeto |
|---|---|---|---|
| Urinary Biomarkers (Debernardi 2020) | 590 urinas: 183 controles, 208 benignos, 199 PDAC; LYVE1, REG1B, TFF1, REG1A, creatinina, CA19-9 | Aberto, CC-BY (S1 Table do PLOS Med; espelho no Kaggle) | **Integrado** — modelos de triagem |
| Pancreatic Cancer Prediction (Kaggle) | Fatores de risco/sintomas; várias versões com esse nome são sintéticas | Kaggle API | Não integrado; só ensino/demonstração após checar procedência |
| TCGA-PAAD Clinical (Hugging Face) | Espelho do clínico do TCGA-PAAD | Aberto | Coberto pela fonte primária (cBioPortal) |
| PLCO Pancreas (NCI) | Coorte prospectiva (~155 mil), questionários pré-diagnóstico, casos incidentes | **Controlado** — proposta no CDAS | Próximo passo: risco populacional pré-diagnóstico |
| SEER | Incidência, estádio, sobrevida (EUA) | Agregado aberto; microdados com acordo (SEER*Stat) | **Integrado** — tabela de sobrevida por estádio |
| IDC — TCGA-PAAD | TC/RM e lâminas (DICOM) | Aberto (idc-index, BigQuery) | Roteiro — modelo de imagem |
| cBioPortal / PanCancer Atlas | Mutações, CNA, clínico, sobrevida (`paad_tcga_pan_can_atlas_2018`) | API pública | **Integrado** — genômica e prognóstico |
| TCGA-PAAD (GDC) | 185 casos multiômicos; parte não-PDAC | Aberto + controlado (dbGaP) | Via cBioPortal; histologias não ductais excluídas |

Detalhes de cada base, armadilhas e código de acesso: `references/guia_de_acesso.md`.

## Como os dados entram no projeto

- `pancreas/dados.py` baixa a S1 Table do PLOS (confere SHA-256) e consulta a API do cBioPortal; os brutos
  ficam em `data/raw/` (fora do Git).
- Nomes de coluna padronizados em português (`idade`, `creatinina`, `lyve1`, `reg1b`, `tff1`, `ca19_9`,
  `diagnostico` 1/2/3, `estadio_grupo` I-II/III-IV).
- Para uma base nova: escreva `carregar_<base>()` em `dados.py` devolvendo as mesmas colunas e unidades
  (veja a tabela de harmonização no guia), e treine pelo protocolo da skill `pancreas-modelagem-metricas`.

## Ética e LGPD (dados de pacientes brasileiros)

- Dados de saúde são **sensíveis** (LGPD art. 11): base legal, minimização e anonimização antes de
  qualquer análise; registros de acesso.
- Pesquisa com dados de pacientes do hospital exige aprovação do CEP (e CONEP quando aplicável) e TCLE
  ou dispensa justificada.
- Não envie dados identificáveis para serviços externos (incluindo APIs de IA). O agente do projeto remove
  identificadores diretos, mas a regra é não digitá-los.
- Bases com acordo de uso (PLCO, SEER microdados, dbGaP) proíbem redistribuição: não versione esses
  arquivos.

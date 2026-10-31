# Guia de acesso por base

## 1. Urinary Biomarkers for Pancreatic Cancer (Debernardi et al., PLOS Medicine 2020)

- Fonte primária: S1 Table do artigo (doi 10.1371/journal.pmed.1003489), baixada por
  `python -m pancreas.dados`. O PMC tem desafio anti-robô; o link de suplemento do PLOS funciona direto.
- Espelho: Kaggle `johnjdavisiv/urinary-biomarkers-for-pancreatic-cancer` (mesmos dados, colunas renomeadas).
- Armadilhas: centro e coorte quase determinam o diagnóstico; CA19-9 e REG1A faltam de forma diferencial;
  "Stage" e "Benign Samples Diagnosis" derivam do rótulo. Veja a skill `pancreas-modelagem-metricas`.

## 2. Pancreatic Cancer Prediction Dataset (Kaggle)

- Há vários conjuntos com nome parecido. Antes de usar, leia a ficha: autor, origem, se foi gerado
  sinteticamente, licença, número de casos reais.
- Dados sintéticos ensinam o fluxo de ML mas **não** produzem modelo clínico. Não misture com dados reais.
- Acesso: `pip install kaggle`, token em `~/.kaggle/kaggle.json`, `kaggle datasets download -d <autor>/<nome>`.

## 3. TCGA-PAAD Clinical (Hugging Face)

- Espelho comunitário; prefira a fonte primária (cBioPortal/GDC), que tem versão rastreável.
- Se usar o espelho, compare contagens com o cBioPortal (184 pacientes no PanCancer Atlas).

## 4. PLCO (Prostate, Lung, Colorectal and Ovarian Cancer Screening Trial)

- Acesso controlado pelo NCI CDAS (cdas.cancer.gov): cadastro, proposta de projeto, acordo de uso.
  Prazo típico de semanas.
- Útil para: modelo de risco pré-diagnóstico (tabagismo, diabetes, IMC, história familiar) com desfecho de
  câncer de pâncreas incidente — algo que nenhuma base aberta do projeto permite.
- Atenção: eventos raros (poucas centenas de casos); use métricas para desfecho raro (AUPRC, calibração).

## 5. SEER

- Estatísticas agregadas abertas: seer.cancer.gov/statfacts/html/pancreas.html (usadas na referência
  `sobrevida_seer`).
- Microdados: SEER*Stat com acordo de uso; não redistribuir.
- Dados dos EUA; para o Brasil, compare com estimativas do INCA.

## 6. Imaging Data Commons (IDC) — TCGA-PAAD

- `pip install idc-index`; exemplo:
  ```python
  from idc_index import IDCClient
  c = IDCClient()
  series = c.sql_query("SELECT SeriesInstanceUID, Modality FROM index WHERE collection_id = 'tcga_paad'")
  c.download_from_selection(seriesInstanceUID=list(series.SeriesInstanceUID[:5]), downloadDir="data/raw/idc")
  ```
- Poucos exames por paciente e protocolos heterogêneos: para segmentação/detecção em TC, combine com bases
  dedicadas (ex.: Medical Segmentation Decathlon — Pancreas) e anotação por radiologista.

## 7. cBioPortal / PanCancer Atlas

- API pública: `https://www.cbioportal.org/api`, estudo `paad_tcga_pan_can_atlas_2018`.
- Perfis: `_mutations`, `_gistic` (CNA discreta); listas de amostras `_all`, `_sequenced`, `_cna`,
  `_cnaseq` (denominadores corretos de frequência).
- Fusões (NRG1, NTRK) não entram nas consultas do projeto.

## 8. TCGA-PAAD (GDC)

- portal.gdc.cancer.gov, projeto TCGA-PAAD. Dados abertos (clínicos, expressão, mutações somáticas
  mascaradas); controlados via dbGaP (BAM, germinativo).
- ~19% dos perfis não são PDAC (neuroendócrino, pâncreas normal/inflamado). Filtre por histologia
  (ICD-O 8500/3, 8140/3, 8255/3) como em `pancreas/treino_prognostico.py`.

## Harmonização de variáveis

| Conceito | Coluna no projeto | Unidade | Debernardi | TCGA (cBioPortal) |
|---|---|---|---|---|
| Idade | `idade` | anos | Age | AGE |
| Sexo | `sexo_masculino` | 0/1 | Sex (M/F) | SEX (Male/Female) |
| Desfecho diagnóstico | `pdac` | 0/1 | Diagnosis == 3 | — (todos PDAC) |
| Estádio agrupado | `estadio_grupo` | I-II / III-IV | Stage | AJCC_PATHOLOGIC_TUMOR_STAGE |
| CA19-9 | `ca19_9` | U/mL | Plasma CA19-9 | — |
| Creatinina urinária | `creatinina` | mg/mL | Creatinine mg/ml | — |
| Sobrevida | `tempo_meses`, `obito` | meses, 0/1 | — | OS_MONTHS, OS_STATUS |

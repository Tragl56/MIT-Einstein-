# Relatório de métricas — biomarcadores urinários para PDAC

Gerado em 2026-10-29 por `python -m pancreas.treino_biomarcadores`.
Dados: Debernardi et al., PLOS Medicine 2020 (S1 Table, 590 amostras de urina: 183 controles, 208 doenças hepatobiliares benignas, 199 PDAC).

Tarefa: PDAC × não-PDAC (controles + benignos). O teste (25%) foi separado antes de qualquer ajuste e usado uma única vez. Limiares escolhidos nas previsões fora-da-dobra do desenvolvimento.

## Modelo `painel_urinario`

- Variáveis: idade, creatinina, lyve1, reg1b, tff1
- Família vencedora na validação cruzada: **Ensemble (votação suave dos 3 melhores)** (calibrada por sigmoide)
- Desenvolvimento: 442 amostras · Teste: 148 amostras (50 PDAC)

### Seleção de modelo (VC 5×3 no desenvolvimento)

| Modelo | AUROC (média ± dp) | Brier | AUPRC |
|---|---|---|---|
| Ensemble (votação suave dos 3 melhores) **(vencedor)** | 0.900 ± 0.032 | 0.123 | 0.829 |
| Extra Trees | 0.898 ± 0.029 | 0.124 | 0.828 |
| Regressão logística com splines | 0.896 ± 0.033 | 0.124 | 0.821 |
| Random Forest | 0.895 ± 0.034 | 0.125 | 0.822 |
| Regressão logística | 0.895 ± 0.029 | 0.123 | 0.822 |
| SVM (kernel RBF) | 0.889 ± 0.030 | 0.125 | 0.819 |
| Regressão logística com interações | 0.889 ± 0.032 | 0.127 | 0.825 |
| Gradient Boosting (histograma) | 0.887 ± 0.034 | 0.129 | 0.815 |

### Desempenho no teste (avaliação única)

- **AUROC 0.888** (IC 95% 0.831–0.936)
- AUPRC 0.799 · Brier 0.130 · inclinação de calibração 0.93 · calibração-no-geral -0.002

| Ponto operacional | Limiar | Sensibilidade (IC 95%) | Especificidade (IC 95%) | VPP se prevalência 3% | VPN se prevalência 3% |
|---|---|---|---|---|---|
| triagem (sensibilidade >= 90% (descartar com mais segurança)) | 0.173 | 84.0% (71.5%–91.7%) | 71.4% (61.8%–79.4%) | 8.3% | 99.3% |
| equilibrio (índice de Youden máximo) | 0.342 | 78.0% (64.8%–87.2%) | 80.6% (71.7%–87.2%) | 11.1% | 99.2% |
| confirmacao (especificidade >= 95% (priorizar investigação)) | 0.717 | 52.0% (38.5%–65.2%) | 94.9% (88.6%–97.8%) | 24.0% | 98.5% |

Subgrupos no teste (AUROC):

- PDAC × controles saudáveis: 0.944 (n=96)
- PDAC × doenças benignas: 0.839 (n=102)
- PDAC estádio I–II × não-PDAC: 0.903 (n=124)
- PDAC × pancreatite: 0.798 (n=84)
- Sensibilidade no limiar de triagem: estádio I–II 92.3% (n=26), estádio III–IV 75.0% (n=24)

### Comparação com linhas de base (mesmo teste)

- LYVE1 isolado: AUROC 0.844
- Regressão logística simples (tipo PancRISK, sem ajuste): AUROC 0.877
- CA19-9 plasmático ≥ 37 U/mL (amostras com CA19-9): sensibilidade 91.7%, especificidade 92.3%; AUROC contínuo 0.953
- Ablação sem idade: AUROC 0.863 (quanto do desempenho vem só dos biomarcadores)

### Validação por coorte (treino Cohort1 → teste Cohort2)

- AUROC 0.898 (IC 95% 0.836–0.947), n=258 (37 PDAC)
- triagem: sensibilidade 86.5%, especificidade 81.4%
- equilibrio: sensibilidade 67.6%, especificidade 93.2%
- confirmacao: sensibilidade 43.2%, especificidade 96.4%

Limiares do modelo publicado (todas as amostras): triagem = 0.182, equilibrio = 0.320, confirmacao = 0.744

## Modelo `painel_urinario_ca19_9`

- Variáveis: idade, creatinina, lyve1, reg1b, tff1, ca19_9
- Família vencedora na validação cruzada: **Ensemble (votação suave dos 3 melhores)** (calibrada por sigmoide)
- Desenvolvimento: 262 amostras · Teste: 88 amostras (38 PDAC)

### Seleção de modelo (VC 5×3 no desenvolvimento)

| Modelo | AUROC (média ± dp) | Brier | AUPRC |
|---|---|---|---|
| Ensemble (votação suave dos 3 melhores) **(vencedor)** | 0.970 ± 0.017 | 0.066 | 0.956 |
| Extra Trees | 0.967 ± 0.019 | 0.073 | 0.954 |
| Regressão logística com interações | 0.965 ± 0.014 | 0.073 | 0.946 |
| Gradient Boosting (histograma) | 0.965 ± 0.022 | 0.071 | 0.947 |
| Regressão logística com splines | 0.963 ± 0.019 | 0.077 | 0.947 |
| Random Forest | 0.963 ± 0.020 | 0.076 | 0.945 |
| SVM (kernel RBF) | 0.956 ± 0.019 | 0.079 | 0.940 |
| Regressão logística | 0.954 ± 0.023 | 0.084 | 0.941 |

### Desempenho no teste (avaliação única)

- **AUROC 0.933** (IC 95% 0.877–0.977)
- AUPRC 0.917 · Brier 0.105 · inclinação de calibração 0.90 · calibração-no-geral +0.041

| Ponto operacional | Limiar | Sensibilidade (IC 95%) | Especificidade (IC 95%) | VPP se prevalência 3% | VPN se prevalência 3% |
|---|---|---|---|---|---|
| triagem (sensibilidade >= 90% (descartar com mais segurança)) | 0.438 | 81.6% (66.6%–90.8%) | 90.0% (78.6%–95.7%) | 20.1% | 99.4% |
| equilibrio (índice de Youden máximo) | 0.400 | 81.6% (66.6%–90.8%) | 90.0% (78.6%–95.7%) | 20.1% | 99.4% |
| confirmacao (especificidade >= 95% (priorizar investigação)) | 0.726 | 71.1% (55.2%–83.0%) | 96.0% (86.5%–98.9%) | 35.5% | 99.1% |

Subgrupos no teste (AUROC):

- PDAC × controles saudáveis: 0.989 (n=61)
- PDAC × doenças benignas: 0.886 (n=65)
- PDAC estádio I–II × não-PDAC: 0.906 (n=70)
- PDAC × pancreatite: 0.827 (n=52)
- Sensibilidade no limiar de triagem: estádio I–II 75.0% (n=20), estádio III–IV 88.9% (n=18)

### Comparação com linhas de base (mesmo teste)

- LYVE1 isolado: AUROC 0.812
- Regressão logística simples (tipo PancRISK, sem ajuste): AUROC 0.951
- CA19-9 plasmático ≥ 37 U/mL (amostras com CA19-9): sensibilidade 89.5%, especificidade 86.0%; AUROC contínuo 0.921
- Ablação sem idade: AUROC 0.923 (quanto do desempenho vem só dos biomarcadores)

### Validação por coorte (treino Cohort1 → teste Cohort2)

- AUROC 0.983 (IC 95% 0.952–1.000), n=138 (14 PDAC)
- triagem: sensibilidade 92.9%, especificidade 93.5%
- equilibrio: sensibilidade 85.7%, especificidade 98.4%
- confirmacao: sensibilidade 71.4%, especificidade 100.0%

Limiares do modelo publicado (todas as amostras): triagem = 0.394, equilibrio = 0.331, confirmacao = 0.689

## Limitações

- Estudo caso-controle com prevalência de PDAC artificialmente alta (34%): o VPP real em populações de baixa prevalência é muito menor (ver colunas de VPP a 3%).
- Amostras de centros europeus; LYVE1/REG1B/TFF1 urinários são ensaios ELISA de pesquisa, sem padronização clínica. Valores de outros kits não são intercambiáveis.
- Controles vieram de um único centro (BPTB): parte do sinal pode refletir diferenças pré-analíticas entre centros. Por isso o centro nunca entra no modelo e reportamos a validação por coorte.
- Validação externa prospectiva em população brasileira é necessária antes de uso clínico.

Figuras em `reports/figuras/`.
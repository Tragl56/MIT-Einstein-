---
name: pancreas-prognostico-genomica
description: Prognóstico e genômica do adenocarcinoma de pâncreas já diagnosticado — grupo de risco pós-ressecção (Cox no TCGA-PAAD), frequência de alterações genéticas (KRAS, TP53, CDKN2A, SMAD4, BRCA1/2, PALB2, ATM, MSI/dMMR, fusões NTRK/NRG1) via cBioPortal, alterações acionáveis, teste germinativo e sobrevida por estádio (SEER). Use quando o paciente já tiver diagnóstico de PDAC e o médico perguntar sobre prognóstico, sobrevida, estadiamento, ressecabilidade, laudo de painel genômico/NGS, mutação KRAS G12D/G12C, BRCA, "tem alvo terapêutico?", "vale pedir teste genético?", ou quiser comparar o caso com o TCGA — mesmo sem citar o TCGA ou o cBioPortal.
---

# Prognóstico e genômica (PDAC diagnosticado)

## Quando usar cada ferramenta

| Situação | Ferramenta | Comando no Claude Code |
|---|---|---|
| Paciente operado, sem metástase, com T, N e grau | Prognóstico pós-ressecção | `python -m pancreas.cli prognostico --idade 64 --t T3 --n N1 --grau G2 [--kras sim]` |
| Laudo genômico com genes alterados | Frequência + nota clínica por gene | `python -m pancreas.cli gene KRAS` |
| Sobrevida por estádio, estadiamento, ressecabilidade, conduta | Referências curadas | `python -m pancreas.cli referencia sobrevida_seer` (ou `estadiamento_ajcc`, `ressecabilidade`, `conduta_por_estadio`, `testes_geneticos`) |

## Prognóstico pós-ressecção — leitura correta

O modelo (Cox penalizado, 161 pacientes, 92 óbitos) usa idade, T3/T4, N+, grau 3/4 e alterações em KRAS,
TP53, CDKN2A e SMAD4. A discriminação é modesta (C-index ~0,59 em validação cruzada); os grupos de risco
fora-da-dobra separam bem as curvas (log-rank significativo), mas não servem para prever o tempo de um
paciente específico.

- Fale em risco **relativo** ("maior que a média dos operados do TCGA"), não em "você tem X meses".
- Os números absolutos (SG 12 e 24 meses) vêm de pacientes tratados antes da adjuvância com mFOLFIRINOX;
  hoje a sobrevida tende a ser maior.
- Margem R0/R1, CA19-9 pós-operatório, performance status e adjuvância não estão no modelo e pesam muito.
- Não use para doença metastática ou localmente avançada não operada (fora da população do TCGA).

## Genômica — como responder

1. Para cada gene do laudo, consulte a frequência no TCGA-PAAD e a nota clínica.
2. Separe **somático** (tumor) de **germinativo** (herdado). Variante germinativa em BRCA1/2, PALB2, ATM,
   CDKN2A, STK11 ou genes de Lynch muda a conduta do paciente **e** da família (aconselhamento, vigilância
   de parentes — veja a referência `vigilancia_alto_risco`).
3. Aponte alterações acionáveis com cautela e fonte (referência `testes_geneticos`):
   - BRCA1/2, PALB2 → platina; olaparibe de manutenção em BRCA germinativo (POLO).
   - MSI-H/dMMR → imunoterapia.
   - KRAS selvagem → pesquisar fusões NTRK, NRG1, ALK, ROS1, RET e BRAF V600E.
   - KRAS G12C → inibidores específicos; G12D/G12V/G12R → estudos clínicos com inibidores de RAS.
4. Recomende teste germinativo para todo paciente com PDAC (NCCN), se ainda não feito.
5. Termine com: aprovação ANVISA, cobertura (SUS/ANS) e elegibilidade a estudos clínicos devem ser
   verificadas; a decisão terapêutica é do tumor board.

## Limitações a citar

- Frequências do TCGA subestimam alterações (amostras com baixa pureza tumoral; KRAS ~65% no TCGA vs ~90%
  na literatura).
- Fusões e metilação não estão nas consultas.
- TCGA é majoritariamente norte-americano e de pacientes operados.

---
name: pancreas-modelagem-metricas
description: Treina, valida, compara e melhora os modelos de detecção e prognóstico de câncer de pâncreas do projeto (painel urinário Debernardi 2020, CA19-9, Cox TCGA-PAAD), com protocolo anti-vazamento, AUROC com IC 95%, calibração, limiares clínicos e relatório no padrão TRIPOD+AI. Use sempre que o usuário pedir para treinar ou retreinar, "melhorar as métricas", aumentar AUROC/sensibilidade/especificidade, testar outro algoritmo, adicionar variáveis ou dados novos, explicar por que uma métrica caiu, conferir se há overfitting/vazamento, ou gerar o relatório de validação — mesmo que ele só diga "o modelo está ruim" ou "dá para melhorar?".
---

# Modelagem e métricas

O objetivo é melhorar o desempenho **real** do modelo em pacientes novos, não o número do relatório. Em
dados pequenos (590 amostras) é fácil inflar métricas sem perceber; as regras abaixo existem porque cada
uma já foi uma armadilha concreta neste dataset.

## Comandos

```
python -m pancreas.dados                    # baixa/confere os dados (SHA-256 do PLOS; cache do cBioPortal)
python -m pancreas.treino_biomarcadores     # ~8–10 min; --rapido para testar o código (~2 min)
python -m pancreas.treino_prognostico       # ~1 min
python -m pytest                            # testes
```

Saídas: `models/*.joblib`, `reports/metricas_*.json`, `reports/relatorio_metricas_biomarcadores.md`,
`reports/figuras/*.png` (ROC, calibração, distribuição das previsões, comparação de modelos, Kaplan-Meier).

## Protocolo (não quebre sem motivo forte)

1. **Teste intocado.** 25% estratificado por diagnóstico × estádio, separado antes de tudo e usado uma
   única vez. Nunca escolha modelo, variável, limiar ou hiperparâmetro olhando o teste — se fizer isso,
   o número do teste deixa de ser uma estimativa honesta.
2. **Seleção por validação cruzada 5×3** no desenvolvimento: 7 famílias (regressão logística, splines,
   interações, SVM, Random Forest, Extra Trees, Gradient Boosting) + ensemble de votação suave dos 3
   melhores. Vence o maior AUROC médio.
3. **Calibração sigmoide** com o modelo-base treinado em 100% dos dados (`ensemble=False`).
4. **Limiares** (triagem: sensibilidade ≥ 90%; equilíbrio: Youden; confirmação: especificidade ≥ 95%)
   escolhidos nas previsões fora-da-dobra do desenvolvimento.
5. **Robustez:** validação por coorte (Cohort1 → Cohort2), ablação sem idade, linhas de base (LYVE1 isolado,
   regressão logística simples tipo PancRISK, CA19-9 ≥ 37 U/mL), subgrupos (controles, benignos,
   pancreatite, estádio I–II).
6. **Modelo publicado** reajustado com todas as amostras; limiares recalculados fora-da-dobra.

## Vazamentos conhecidos neste dataset

| Variável | Por que não pode entrar |
|---|---|
| `centro` (BPTB/LIV/ESP/UCL) | Todos os controles são do BPTB; ESP/LIV são quase só PDAC; UCL só benignos |
| `coorte` | Cohort1 é 49% PDAC; Cohort2, 14% |
| `estadio`, `diagnostico_benigno` | Derivados do rótulo |
| Ausência de CA19-9 / REG1A | Falta em ~50% dos controles e só ~25% dos PDAC: o padrão de falta "prevê" o diagnóstico. Por isso o modelo com CA19-9 é treinado só em casos completos, sem indicador de falta |

Se alguma mudança fizer o AUROC saltar de repente (ex.: +0,05), procure vazamento antes de comemorar.

## O que já foi testado (e o resultado)

- Sexo como variável: não melhorou (AUROC VC 0,893 vs 0,894).
- Remover creatinina: piorou (0,878) — a normalização pela diluição importa.
- Modelagem multiclasse (controle/benigno/PDAC) usando P(PDAC): sem ganho (0,892 vs 0,892).
- Calibração com `ensemble=True`: perdia discriminação (5 cópias com 80% dos dados); `ensemble=False`
  preservou o AUROC e deu o melhor Brier.
- Ensemble de votação: ganho pequeno porém consistente na VC sobre o melhor modelo isolado.

## Caminhos que realmente podem melhorar as métricas

1. **Mais dados de verdade**, sobretudo PDAC estádio I–II e pancreatite crônica (os casos difíceis). Uma
   coorte brasileira prospectiva vale mais que qualquer ajuste fino.
2. **Validação externa** antes de prometer desempenho: amostras de outro centro, mesmo kit ELISA.
3. **Variáveis clínicas complementares** se houver dados pareados (diabetes recente, perda de peso,
   bilirrubina): entram como novas colunas em `features.py` e passam pelo mesmo protocolo.
4. **Limiar por contexto**: em vigilância de alto risco, priorize sensibilidade; em sintomáticos
   encaminhados, o ponto de equilíbrio.

Para cada experimento: altere uma coisa por vez, compare o AUROC da VC do desenvolvimento (com o desvio
padrão — diferenças menores que ~0,01 são ruído), e só então rode o protocolo completo.

## Como reportar (TRIPOD+AI, resumido)

Fonte dos dados e período · critérios de elegibilidade · desfecho e preditores com unidades · tamanho
amostral e eventos · tratamento de dados faltantes · tipo de modelo e ajuste de hiperparâmetros ·
discriminação (AUROC + IC) e calibração (inclinação, Brier, gráfico) · limiares e sensibilidade/
especificidade com IC · validação interna e por coorte · limitações e aplicabilidade. O relatório gerado
já cobre esses itens; ao resumir, não omita os ICs nem a calibração.

## Prognóstico (TCGA-PAAD)

Cox com penalização escolhida por C-index em VC 5×10; compara clínico × clínico + genômico; grupos de risco
avaliados fora-da-dobra (log-rank). C-index ~0,59 é esperado: faltam margem cirúrgica, CA19-9
pós-operatório e tratamento. Não "melhore" adicionando variáveis pós-baseline (ex.: radioterapia
recebida) — isso cria viés de tempo imortal.

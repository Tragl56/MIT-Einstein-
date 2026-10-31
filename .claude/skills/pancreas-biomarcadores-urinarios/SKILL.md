---
name: pancreas-biomarcadores-urinarios
description: Interpreta o painel urinário LYVE1, REG1B e TFF1 (com creatinina urinária, idade e, opcionalmente, CA19-9 plasmático) para detecção de adenocarcinoma de pâncreas, usando o modelo calibrado do projeto (Debernardi et al. 2020 / PancRISK). Use sempre que aparecerem valores de LYVE1, REG1B, REG1A, TFF1, creatinina urinária ou "painel urinário", quando alguém perguntar como converter unidades desses exames, o que significa um resultado do modelo, qual limiar usar, quanto vale o VPP/VPN, ou por que o CA19-9 muda o resultado — mesmo que a pergunta não mencione o modelo pelo nome.
---

# Painel urinário para PDAC (LYVE1, REG1B, TFF1)

## O que é

Três proteínas medidas por ELISA na urina, mais elevadas em adenocarcinoma ductal de pâncreas (PDAC):

- **LYVE1** (lymphatic vessel endothelial hyaluronan receptor 1) — o marcador isolado mais forte.
- **REG1B** (regenerating family member 1 beta) — substituiu o REG1A no painel de 2020.
- **TFF1** (trefoil factor 1) — também sobe em doença benigna, por isso discrimina pior PDAC × pancreatite.

A creatinina urinária entra no modelo para corrigir a diluição da amostra (urina mais ou menos concentrada),
e a idade porque o risco de PDAC cresce com ela. Isso reproduz o PancRISK do artigo original.

## Como rodar

```
python -m pancreas.cli biomarcadores --idade 67 --creatinina 85 --unidade-creatinina mg/dL \
    --lyve1 5.6 --reg1b 120 --tff1 700 [--ca19-9 450]
```

(Use `.venv\Scripts\python.exe` no Windows.) Com `--ca19-9` o sistema usa o modelo treinado nas 350
amostras que tinham CA19-9 plasmático; sem ele, o modelo do painel puro (590 amostras).

## Unidades — o erro mais comum

| Variável | Unidade do modelo | Conversão |
|---|---|---|
| Creatinina urinária | mg/mL | laboratórios brasileiros costumam dar **mg/dL**: divida por 100 (o comando aceita `--unidade-creatinina mg/dL`, `mmol/L` ou `µmol/L` e converte) |
| LYVE1, REG1B, TFF1 | ng/mL | sem conversão; confira se o laudo não está em pg/mL (÷ 1000) |
| CA19-9 | U/mL (plasma/soro) | U/mL = kU/L |

Se um valor cair fora da faixa vista no treino, a saída traz um alerta de extrapolação. Antes de
interpretar, desconfie de unidade trocada.

## Como interpretar

Leia a seção "Painel urinário" de `../pancreas-consulta-oncologica/references/interpretacao_modelos.md`.
Em resumo:

1. Comunique a **faixa** (baixa, intermediária, alta) e os **pontos operacionais**, não a probabilidade bruta.
2. A probabilidade do estudo vem de uma população caso-controle com 34% de PDAC. Para dimensionar o risco
   real, use `probabilidade_ajustada_por_prevalencia` (1%, 3% ou 15%, conforme o contexto).
3. Explique as **contribuições**: qual biomarcador mais empurrou a probabilidade e como o valor se compara
   às medianas de controles, benignos e PDAC.
4. Lembre que o desempenho é melhor contra controles saudáveis do que contra pancreatite crônica: num
   paciente com pancreatite, um resultado intermediário é esperado e pede imagem, não conclusão.

## Desempenho

Os números atuais estão em `reports/relatorio_metricas_biomarcadores.md` ou em
`python -m pancreas.cli metricas`. Cite sempre com o IC 95% e diga de onde vem (teste separado de 25% e
validação por coorte Cohort1 → Cohort2). Não arredonde para cima nem omita a especificidade.

## Limitações que precisam aparecer na resposta

- ELISA de pesquisa, sem padronização clínica; kits diferentes não são intercambiáveis com o estudo.
- Coortes do Reino Unido e Espanha; sem validação em população brasileira.
- Desenho caso-controle (prevalência artificial) — por isso o VPP em prevalência realista é baixo, mesmo
  com AUROC alto.
- REG1A não é usado: foi medido só em parte das amostras e a falta do exame se correlaciona com o
  diagnóstico (usar causaria vazamento).

# Como interpretar a saída dos modelos

## Painel urinário (LYVE1, REG1B, TFF1 + creatinina + idade, ± CA19-9)

| Campo | Como explicar ao médico |
|---|---|
| `faixa` | **baixa**: abaixo do limiar de triagem (alta sensibilidade) · **intermediária**: entre triagem e confirmação, indeterminado · **alta**: acima do limiar de alta especificidade |
| `pontos_operacionais.triagem` | Limiar escolhido para sensibilidade ≥ 90% no desenvolvimento. "Negativo" aqui é o resultado mais tranquilizador que o modelo dá — mas não exclui câncer |
| `pontos_operacionais.confirmacao` | Limiar para especificidade ≥ 95%. "Positivo" aqui justifica priorizar imagem |
| `pontos_operacionais.equilibrio` | Índice de Youden: compromisso entre os dois |
| `probabilidade_pdac_no_estudo` | Probabilidade calibrada **na população do estudo** (34% de PDAC; 43% no modelo com CA19-9). Não é o risco absoluto do paciente |
| `probabilidade_ajustada_por_prevalencia` | Mesma evidência reescalada (Bayes) para prevalência 1% (vigilância de alto risco), 3% (sintomáticos na atenção primária) e 15% (encaminhados à gastro/oncologia). Escolha a que se parece com o contexto do paciente |
| `contribuicoes` | Quanto a probabilidade cairia se aquela variável tivesse o valor mediano dos não-PDAC. Positivo = empurra para PDAC. Compare o valor com as medianas de controles, benignos e PDAC |
| `alertas` | Valores fora da faixa de treino = extrapolação; diga isso |
| `desempenho_validado` | AUROC no teste separado e na validação por coorte — cite com o IC 95% |

Frases úteis:
- "O perfil urinário é semelhante ao de pacientes com PDAC no estudo de validação (faixa alta). Em um
  contexto de encaminhamento (prevalência ~15%), isso corresponde a cerca de X%."
- "O resultado ficou abaixo do limiar de triagem. Ainda assim, a icterícia com 70 anos é sinal de alarme
  pela NICE e deve ser investigada."

Limitações a citar sempre que o painel for usado:
- Ensaios ELISA de pesquisa; valores de outros kits não são intercambiáveis.
- População do Reino Unido e Espanha, desenho caso-controle; sem validação brasileira.
- Discrimina pior PDAC × pancreatite crônica do que PDAC × controle saudável.

## Prognóstico pós-ressecção (Cox, TCGA-PAAD)

- `grupo_de_risco` é relativo aos pacientes do TCGA (tercis). Explique como "risco maior/menor que a média
  de pacientes operados", não como sentença individual.
- `sobrevida_global_estimada` reflete pacientes tratados antes da era mFOLFIRINOX adjuvante; a sobrevida
  atual tende a ser maior (PRODIGE 24: mediana ~54 meses com mFOLFIRINOX).
- `hazard_ratios_do_modelo`: N1 e idade são os fatores mais consistentes; KRAS mutado tende a pior
  prognóstico (IC largo).
- Faltam margem (R0/R1), CA19-9 pós-operatório e tratamento adjuvante — diga que pesam muito.

## Prioridade clínica (regras de diretriz)

- `urgente` → encaminhamento por via de suspeita de câncer / imagem urgente.
- `investigar` → imagem prioritária eletiva.
- `vigilancia_especializada` → programa de vigilância (RM/colangio-RM e/ou ecoendoscopia anual).
- `orientacao` → sem critério de investigação imediata pelas regras aplicadas; orientar e reavaliar.

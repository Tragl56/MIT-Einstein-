# Teste de ponta a ponta do agente (local)

Executado em 2026-10-29 21:47.

## Caso 1 — aprovado

**Pergunta:** Homem, 68 anos, icterícia indolor há 3 semanas, perda de 7 kg em 2 meses, diabetes diagnosticado há 1 ano. CA19-9 de 410 U/mL. Painel urinário: creatinina 80 mg/dL, LYVE1 6,1 ng/mL, REG1B 150 ng/mL, TFF1 900 ng/mL.

**Ferramentas:** avaliar_sinais_e_fatores_de_risco, avaliar_biomarcadores_urinarios, avaliar_biomarcadores_urinarios

**Uso:** Execução local (onco-llama3.1:latest, modo guiado) · 1 chamada(s) · 690 tokens · 23 s · sem custo; nenhum dado saiu do computador

**Resposta:**

## Resumo do caso
68 anos; achados: icterícia, perda de peso não intencional, diabetes de início recente; exames: CA19-9 410 U/mL; Creatinina urinária 80 mg/dL; LYVE1 6,1 ng/mL; REG1B 150 ng/mL; TFF1 900 ng/mL.

## Prioridade: URGENTE
Definida pelas regras de sinais de alarme: icterícia em paciente com 40 anos ou mais.

## Achados que sustentam a prioridade
- Icterícia em paciente com 40 anos ou mais — Encaminhamento urgente por via de suspeita de câncer; TC de abdome com protocolo pancreático e avaliação da via biliar. (NICE NG12)
- 60 anos ou mais com perda de peso e diabetes de início recente — Considerar TC de abdome urgente (ou US se TC indisponível). (NICE NG12)
- Diabetes de início recente após os 50 anos (cerca de 1% desenvolve PDAC em 3 anos; risco maior se houver perda de peso — escore ENDPAC) — Considerar imagem pancreática, sobretudo se houver perda de peso ou outros sinais. (NCCN Clinical Practice Guidelines in Oncology: Pancreatic Adenocarcinoma (versão vigente))
- Idade acima de 60 anos (mediana ao diagnóstico ~71 anos no SEER).
- CA19-9 410 U/mL (elevado). É inespecífico: colestase, colangite e pancreatite também elevam. Não serve como rastreio isolado; é útil para prognóstico e seguimento. Com icterícia, reavaliar após desobstrução biliar.

## Resultado dos modelos
- Painel urinário com CA19-9: faixa **ALTA**; triagem positivo · equilíbrio positivo · confirmação positivo; probabilidade reajustada para prevalência 3% ≈ 44,4% e 15% ≈ 82,0% (no estudo: 95,1%). Principais contribuições: CA19-9 plasmático (+0,77), LYVE1 urinário (+0,04), Idade (+0,01). AUROC validado no teste: 0,933 (IC 95% 0,877–0,977).
- Painel urinário sem CA19-9: faixa **ALTA**; triagem positivo · equilíbrio positivo · confirmação positivo; probabilidade reajustada para prevalência 3% ≈ 15,7% e 15% ≈ 51,6% (no estudo: 75,5%). Principais contribuições: LYVE1 urinário (+0,36), Idade (+0,15), REG1B urinário (+0,11). AUROC validado no teste: 0,888 (IC 95% 0,831–0,936).
  - Com icterícia o CA19-9 pode estar falsamente elevado por colestase: dê mais peso ao resultado sem CA19-9 e repita o CA19-9 após a desobstrução biliar.

## Próximos passos sugeridos
1. TC de abdome com protocolo pancreático (multifásica). Se não houver acesso rápido, US de abdome enquanto aguarda.
2. Bilirrubinas, fosfatase alcalina, GGT, TGO/TGP, hemograma e creatinina (para o contraste).
3. CA19-9 como complemento, nunca isolado; com icterícia, repetir após a desobstrução biliar.
4. Encaminhar pela via de suspeita de câncer (cirurgia hepatobiliopancreática ou oncologia).
5. Glicemia de jejum ou HbA1c para confirmar o diabetes de início recente.

**Prazo:** Não esperar: o exame deve sair em dias, não em semanas. No SUS, a suspeita de câncer dá direito aos exames de diagnóstico em até 30 dias (Lei 13.896/2019) e, confirmado o diagnóstico, ao início do tratamento em até 60 dias (Lei 12.732/2012).

## Rede de segurança — oriente o paciente a voltar antes se tiver
- Pele ou olhos amarelados, urina escura ou fezes claras.
- Perda de peso que continua.
- Dor na barriga ou nas costas que piora, não passa ou acorda à noite.
- Vômitos persistentes.
- Febre com calafrios junto com pele amarelada: procurar emergência no mesmo dia (pode ser colangite).

## Como explicar ao paciente
Alguns sinais que você apresentou precisam ser investigados logo, com um exame de imagem, para entender o que está acontecendo no pâncreas e nas vias da bile. Pedir esse exame não quer dizer que seja câncer: muitas causas são benignas, como pedras na vesícula. Mas é importante fazer rápido.

## Dados que faltam e mudariam a conduta
- Exame de imagem pancreática (TC com protocolo pancreático) — confirma ou afasta lesão.

## Dados considerados (extraídos do texto — confira)
- Idade: 68 anos (regras)
- CA19-9: 410 U/mL (regras)
- Creatinina urinária: 80 mg/dL (regras)
- LYVE1: 6,1 ng/mL (regras)
- REG1B: 150 ng/mL (regras)
- TFF1: 900 ng/mL (regras)
- Icterícia: "icterícia indolor há 3 semanas" (regras)
- Perda de peso não intencional: "perda de 7 kg em 2 meses" (regras)
- Diabetes de início recente (≤ 3 anos): "diabetes diagnosticado há 1 ano" (regras)

## Nota para o prontuário
```
Avaliação de risco para neoplasia de pâncreas com ferramenta de apoio à decisão (NICE NG12, CAPS 2020, Fukuoka 2017). Idade: 68 anos. Critérios encontrados: icterícia em paciente com 40 anos ou mais; 60 anos ou mais com perda de peso e diabetes de início recente; diabetes de início recente após os 50 anos. Classificação: URGENTE. Conduta sugerida: TC de abdome com protocolo pancreático (multifásica). Se não houver acesso rápido, US de abdome enquanto aguarda. Paciente orientado(a) sobre sinais de alerta e retorno. Decisão clínica do médico assistente.
```

## Limitações e fontes
- LYVE1, REG1B e TFF1 urinários são ensaios ELISA de pesquisa; valores de kits diferentes não são intercambiáveis com os do estudo.
- Treinado com amostras do Reino Unido e Espanha; falta validação em população brasileira.
- Fonte: NCCN Clinical Practice Guidelines in Oncology: Pancreatic Adenocarcinoma (versão vigente).
- Fonte: NICE NG12 — Suspected cancer: recognition and referral (pâncreas).
- Relatório montado automaticamente a partir das ferramentas (modo guiado do Llama local): os números vêm dos modelos validados; o texto do caso foi lido pelo Llama e conferido por regras.

> Ferramenta de apoio à decisão para pesquisa e demonstração. Não é dispositivo médico registrado na ANVISA e não substitui avaliação clínica, exames de imagem, anatomopatológico ou discussão em tumor board.

---

## Caso 2 — aprovado

**Pergunta:** Mulher, 52 anos, assintomática, portadora de variante patogênica germinativa em BRCA2; pai e tio paterno tiveram câncer de pâncreas. Deve entrar em vigilância? Como?

**Ferramentas:** avaliar_sinais_e_fatores_de_risco

**Uso:** Execução local (onco-llama3.1:latest, modo guiado) · 1 chamada(s) · 638 tokens · 17 s · sem custo; nenhum dado saiu do computador

**Resposta:**

## Resumo do caso
52 anos; variante germinativa em BRCA2; família: 1 parente(s) de 1º grau e 2 do mesmo lado com câncer de pâncreas.

## Prioridade: VIGILÂNCIA ESPECIALIZADA
Critério de alto risco: variante patogênica germinativa em brca2 com parente de 1º grau afetado.

## Achados que sustentam a prioridade
- Variante patogênica germinativa em BRCA2 com parente de 1º grau afetado (elegível agora) — Vigilância a partir de ~45 anos (ou 10 anos antes do caso mais jovem da família): RM/colangio-RM e/ou ecoendoscopia anual em centro especializado.
- Câncer de pâncreas familiar (2 ou mais parentes do mesmo lado, ao menos 1 de 1º grau) (elegível agora) — Vigilância a partir de 50–55 anos (ou 10 anos antes do caso mais jovem); aconselhamento e teste genético.

## Genética e genômica
- BRCA2 (variante germinativa): Deficiência de recombinação homóloga: sensibilidade a platina; olaparibe de manutenção se germinativo (estudo POLO). Familiares: aconselhamento genético.

## Próximos passos sugeridos
1. Encaminhar a programa de vigilância: RM com colangio-RM e/ou ecoendoscopia anual em centro especializado.
2. Aconselhamento genético e teste germinativo, se ainda não feitos.
3. Glicemia de jejum ou HbA1c anual (diabetes novo pode ser um sinal precoce).

**Prazo:** Vigilância periódica (em geral anual); retorno antes se surgir algum sinal abaixo.

## Rede de segurança — oriente o paciente a voltar antes se tiver
- Pele ou olhos amarelados, urina escura ou fezes claras.
- Perda de peso que continua.
- Dor na barriga ou nas costas que piora, não passa ou acorda à noite.
- Vômitos persistentes.
- Febre com calafrios junto com pele amarelada: procurar emergência no mesmo dia (pode ser colangite).

## Como explicar ao paciente
Pela sua história familiar ou genética, seu risco é maior que o da média das pessoas. Por isso recomendamos acompanhamento com exames periódicos em um centro especializado, para encontrar qualquer alteração bem cedo, quando o tratamento funciona melhor.

## Dados considerados (extraídos do texto — confira)
- Idade: 52 anos (regras)
- Variante germinativa: BRCA2
- História familiar: "pai e tio paterno tiveram câncer de pâncreas" → 1 de 1º grau, 2 do mesmo lado

## Nota para o prontuário
```
Avaliação de risco para neoplasia de pâncreas com ferramenta de apoio à decisão (NICE NG12, CAPS 2020, Fukuoka 2017). Idade: 52 anos. Critérios encontrados: variante patogênica germinativa em BRCA2 com parente de 1º grau afetado; câncer de pâncreas familiar. Classificação: VIGILÂNCIA ESPECIALIZADA. Conduta sugerida: Encaminhar a programa de vigilância: RM com colangio-RM e/ou ecoendoscopia anual em centro especializado. Paciente orientado(a) sobre sinais de alerta e retorno. Decisão clínica do médico assistente.
```

## Limitações e fontes
- Fonte: Goggins M et al. Management of patients with increased risk for familial pancreatic cancer: updated recommendations from the CAPS Consortium. Gut 2020;69:7-17.
- Relatório montado automaticamente a partir das ferramentas (modo guiado do Llama local): os números vêm dos modelos validados; o texto do caso foi lido pelo Llama e conferido por regras.

> Ferramenta de apoio à decisão para pesquisa e demonstração. Não é dispositivo médico registrado na ANVISA e não substitui avaliação clínica, exames de imagem, anatomopatológico ou discussão em tumor board.

---

## Caso 3 — aprovado

**Pergunta:** Paciente de 64 anos operado (Whipple) com adenocarcinoma ductal pT3 pN1 G3, KRAS G12D e TP53 mutados. Qual o prognóstico relativo e há alteração acionável?

**Ferramentas:** estimar_prognostico_pos_resseccao, consultar_alteracoes_geneticas_tcga, consultar_alteracoes_geneticas_tcga

**Uso:** Execução local (onco-llama3.1:latest, modo guiado) · 1 chamada(s) · 724 tokens · 32 s · sem custo; nenhum dado saiu do computador

**Resposta:**

## Resumo do caso
64 anos; patologia: pT3 pN1 G3 após ressecção; tumor: KRAS (alterado), TP53 (alterado).

## Situação: adenocarcinoma de pâncreas já diagnosticado
As regras de suspeição não se aplicam; foco em prognóstico, genômica e seguimento.

## Resultado dos modelos
- Prognóstico pós-ressecção (TCGA-PAAD): grupo **ALTO**; sobrevida global estimada 74,0% em 12 meses e 33,0% em 24 meses; C-index 0,587 (discriminação modesta, risco relativo).
  - Genômica não informada (cdkn2a_alterado, smad4_alterado): usada a frequência média do TCGA.

## Genética e genômica
- KRAS (alterado no tumor): alterado em 66,9% dos PDAC do TCGA-PAAD; mais comuns: G12D (49), G12V (33), G12R (25). Mutado em ~90% dos PDAC (G12D > G12V > G12R). KRAS selvagem: pesquisar fusões NRG1, NTRK, ALK, ROS1, RET e BRAF. G12C é raro (~1–2%) e tem inibidores específicos. No TCGA a frequência parece menor porque parte das amostras tem baixa celularidade tumoral.
- TP53 (alterado no tumor): alterado em 61,7% dos PDAC do TCGA-PAAD; mais comuns: R175H (4), R248Q (4), R248W (4). Alterado em ~70% dos PDAC; associado a agressividade; sem terapia-alvo aprovada.
- Teste germinativo é recomendado para todo paciente com adenocarcinoma de pâncreas (NCCN), se ainda não realizado.

## Próximos passos sugeridos
1. Discutir o caso em tumor board multidisciplinar (adjuvância e seguimento).
2. Teste germinativo e aconselhamento genético para a família, se ainda não realizados.
3. Seguimento com CA19-9 e imagem conforme a diretriz vigente.

## Dados que faltam e mudariam a conduta
- Margem cirúrgica (R0/R1) — forte fator prognóstico.
- CA19-9 pós-operatório e performance status — orientam adjuvância e prognóstico.

## Dados considerados (extraídos do texto — confira)
- Idade: 64 anos (regras)
- Patologia: operado; T3 N1 G3 (regras)
- Genes do tumor: KRAS alterado, TP53 alterado (regras)
- Descartado: Tabagismo atual: sugerido pelo Llama sem trecho que o comprove

## Limitações e fontes
- População do TCGA: pacientes operados (sobretudo estádio II) tratados antes da era mFOLFIRINOX adjuvante; a sobrevida absoluta atual tende a ser maior.
- Discriminação modesta (C-index ~0,59): use como estratificação relativa, não como previsão individual.
- Sem margem cirúrgica (R0/R1), CA19-9 pós-operatório ou tratamento recebido, que pesam muito no prognóstico.
- Fusões (NRG1, NTRK etc.) e metilação não estão incluídas; parte das amostras do TCGA tem baixa pureza tumoral, o que subestima frequências.
- Relatório montado automaticamente a partir das ferramentas (modo guiado do Llama local): os números vêm dos modelos validados; o texto do caso foi lido pelo Llama e conferido por regras.

> Ferramenta de apoio à decisão para pesquisa e demonstração. Não é dispositivo médico registrado na ANVISA e não substitui avaliação clínica, exames de imagem, anatomopatológico ou discussão em tumor board.

---

## Continuação do caso 1 (multi-turno) — aprovado

**Pergunta:** Se o painel urinário tivesse vindo normal e o CA19-9 fosse 20 U/mL, a prioridade mudaria? Responda em poucas linhas.

**Ferramentas:** avaliar_sinais_e_fatores_de_risco

**Uso:** Execução local (onco-llama3.1:latest, modo guiado) · 1 chamada(s) · 673 tokens · 26 s · sem custo; nenhum dado saiu do computador

**Resposta:**

**Comparação com a avaliação anterior:** prioridade URGENTE → URGENTE (sem mudança); painel urinário ALTA → NÃO AVALIADO

## Resumo do caso
68 anos; achados: icterícia, perda de peso não intencional, diabetes de início recente; exames: CA19-9 20 U/mL.

## Prioridade: URGENTE
Definida pelas regras de sinais de alarme: icterícia em paciente com 40 anos ou mais.

## Achados que sustentam a prioridade
- Icterícia em paciente com 40 anos ou mais — Encaminhamento urgente por via de suspeita de câncer; TC de abdome com protocolo pancreático e avaliação da via biliar. (NICE NG12)
- 60 anos ou mais com perda de peso e diabetes de início recente — Considerar TC de abdome urgente (ou US se TC indisponível). (NICE NG12)
- Diabetes de início recente após os 50 anos (cerca de 1% desenvolve PDAC em 3 anos; risco maior se houver perda de peso — escore ENDPAC) — Considerar imagem pancreática, sobretudo se houver perda de peso ou outros sinais. (NCCN Clinical Practice Guidelines in Oncology: Pancreatic Adenocarcinoma (versão vigente))
- Idade acima de 60 anos (mediana ao diagnóstico ~71 anos no SEER).
- CA19-9 20 U/mL (normal). Não exclui PDAC: 5–10% das pessoas são Lewis-negativas e não produzem CA19-9.

## Próximos passos sugeridos
1. TC de abdome com protocolo pancreático (multifásica). Se não houver acesso rápido, US de abdome enquanto aguarda.
2. Bilirrubinas, fosfatase alcalina, GGT, TGO/TGP, hemograma e creatinina (para o contraste).
3. CA19-9 como complemento, nunca isolado; com icterícia, repetir após a desobstrução biliar.
4. Encaminhar pela via de suspeita de câncer (cirurgia hepatobiliopancreática ou oncologia).
5. Glicemia de jejum ou HbA1c para confirmar o diabetes de início recente.

**Prazo:** Não esperar: o exame deve sair em dias, não em semanas. No SUS, a suspeita de câncer dá direito aos exames de diagnóstico em até 30 dias (Lei 13.896/2019) e, confirmado o diagnóstico, ao início do tratamento em até 60 dias (Lei 12.732/2012).

## Rede de segurança — oriente o paciente a voltar antes se tiver
- Pele ou olhos amarelados, urina escura ou fezes claras.
- Perda de peso que continua.
- Dor na barriga ou nas costas que piora, não passa ou acorda à noite.
- Vômitos persistentes.
- Febre com calafrios junto com pele amarelada: procurar emergência no mesmo dia (pode ser colangite).

## Como explicar ao paciente
Alguns sinais que você apresentou precisam ser investigados logo, com um exame de imagem, para entender o que está acontecendo no pâncreas e nas vias da bile. Pedir esse exame não quer dizer que seja câncer: muitas causas são benignas, como pedras na vesícula. Mas é importante fazer rápido.

## Dados que faltam e mudariam a conduta
- Exame de imagem pancreática (TC com protocolo pancreático) — confirma ou afasta lesão.

## Dados considerados (extraídos do texto — confira)
- Idade: 68 anos (regras)
- CA19-9: 20 U/mL (regras)
- Icterícia: "icterícia indolor há 3 semanas" (regras)
- Perda de peso não intencional: "perda de 7 kg em 2 meses" (regras)
- Diabetes de início recente (≤ 3 anos): "diabetes diagnosticado há 1 ano" (regras)
- Descartado: Dor abdominal ou dorsal: sugerido pelo Llama sem trecho que o comprove
- Descartado: Tabagismo atual: sugerido pelo Llama sem trecho que o comprove
- Descartado: idade = 74: valor do Llama que não aparece no texto

## Nota para o prontuário
```
Avaliação de risco para neoplasia de pâncreas com ferramenta de apoio à decisão (NICE NG12, CAPS 2020, Fukuoka 2017). Idade: 68 anos. Critérios encontrados: icterícia em paciente com 40 anos ou mais; 60 anos ou mais com perda de peso e diabetes de início recente; diabetes de início recente após os 50 anos. Classificação: URGENTE. Conduta sugerida: TC de abdome com protocolo pancreático (multifásica). Se não houver acesso rápido, US de abdome enquanto aguarda. Paciente orientado(a) sobre sinais de alerta e retorno. Decisão clínica do médico assistente.
```

## Limitações e fontes
- Fonte: NCCN Clinical Practice Guidelines in Oncology: Pancreatic Adenocarcinoma (versão vigente).
- Fonte: NICE NG12 — Suspected cancer: recognition and referral (pâncreas).
- Relatório montado automaticamente a partir das ferramentas (modo guiado do Llama local): os números vêm dos modelos validados; o texto do caso foi lido pelo Llama e conferido por regras.

> Ferramenta de apoio à decisão para pesquisa e demonstração. Não é dispositivo médico registrado na ANVISA e não substitui avaliação clínica, exames de imagem, anatomopatológico ou discussão em tumor board.

---

// Planos terapêuticos fictícios do protótipo IRIS, copiados sem alteração de src/mockData.ts.
// São documentos da equipe: aparecem só no OncoFlow Pro e não alimentam respostas ao paciente.

export const PLANOS_IRIS: Record<string, string> = {
  'pac-001': `Paciente: José Pereira da Silva, 64 anos, aposentado, ex-trabalhador rural. Ensino fundamental incompleto. Mora com a esposa Maria, cuidadora principal. Usa WhatsApp com facilidade — prefere áudio a texto. Comunicação simples e direta. Não familiarizado com terminologia médica.

Diagnóstico: Carcinoma de pulmão não pequenas células (CPNPC), estágio IV, com metástases. Mutação EGFR positiva.

Objetivo do tratamento: Controle de doença e prolongamento de sobrevida. Tratamento não curativo — foco em qualidade de vida e tempo.

Esquema atual:
Quimioterapia a cada 21 dias: Carboplatina AUC5 IV D1. Pemetrexede 500mg/m² IV D1.
Terapia alvo contínua: Gefitinibe 250mg VO 1x/dia — todos os dias, sem interrupção, independente dos ciclos de quimioterapia.
Suporte obrigatório para o pemetrexede: Ácido fólico 5mg VO 1x/dia. Vitamina B12 1000mcg IM a cada 9 semanas.

Comorbidades: Ex-tabagista. DPOC leve. Hipertensão arterial controlada.
Medicações contínuas: Losartana 50mg 1x/dia. Salbutamol spray se necessário. Sem alergias conhecidas.

Medicações de suporte em casa:
Ondansetrona 8mg VO a cada 8h se náusea. Loperamida — 4mg na primeira evacuação líquida, depois 2mg após cada evacuação, máximo 16mg/dia. Hidratante corporal sem perfume 2x/dia. Protetor solar FPS 30 ou maior, diariamente. Dipirona 1g VO a cada 6h se dor.

Meta de hidratação: 2 litros por dia.

Toxicidades esperadas: Rash cutâneo (comum com gefitinibe, primeiras semanas, face/pescoço/tronco). Diarreia relacionada ao gefitinibe. Pele seca e unhas frágeis. Náusea e fadiga D1 a D5. Mielossupressão — risco maior na primeira semana pós-quimioterapia.

O que seria preocupante: Falta de ar ou piora da respiração (risco de pneumonite intersticial pelo gefitinibe). Febre acima de 37.8°C. Diarreia intensa ou que não melhora com loperamida. Incapacidade de ingerir líquidos. Rash muito extenso, com bolhas ou feridas. Prostração que impede atividades básicas. Interrupção do gefitinibe por conta própria.`,
  'pac-002': `Paciente: Renato Oliveira Santos, 57 anos, motorista. Ensino médio completo. Mora com a esposa Carla, cuidadora principal. Perfil prático, comunicação direta.

Diagnóstico: Adenocarcinoma de cólon sigmóide, ressecado. Estadiamento patológico pT3N1M0. Pós-operatório sem evidência de doença.

Objetivo do tratamento: Curativo. Estratégia: Adjuvância — reduzir risco de recorrência após a cirurgia.

Esquema atual:
FOLFOX — ciclos a cada 14 dias. Total previsto: 12 ciclos (6 meses). Oxaliplatina 85mg/m² IV D1. Leucovorina 400mg/m² IV D1. 5-FU bolus 400mg/m² IV D1. 5-FU contínuo 2400mg/m² em 46h via bomba de infusão elastomérica — paciente vai para casa com a bomba no D1 e retorna para retirada no D3.

Comorbidades: Hipertensão arterial controlada. Medicação contínua: Enalapril 10mg 1x/dia. Sem alergias conhecidas.

Medicações de suporte em casa:
Ondansetrona 8mg VO a cada 8h se náusea. Loperamida — 4mg na primeira evacuação líquida, depois 2mg após cada evacuação, máximo 16mg/dia. Lactulona 20mL à noite se constipação. Dipirona 1g VO a cada 6h se dor. Bochechos com bicarbonato 4x/dia se desconforto oral.

Meta de hidratação: 2 litros por dia.

Orientação importante: Nos primeiros dias após a infusão (D1 a D3), evitar exposição ao frio — bebidas geladas, alimentos gelados, superfícies frias, ar condicionado intenso. A oxaliplatina causa neuropatia sensitiva desencadeada pelo frio, esperada e transitória.

Toxicidades esperadas: Náusea e desconforto abdominal D1 a D3. Fadiga cumulativa ao longo dos ciclos. Diarreia frequente com 5-FU, a partir do D2. Mucosite leve. Neuropatia periférica transitória — formigamento em mãos e pés, especialmente ao frio, D1 a D5.

O que seria preocupante: Diarreia intensa ou que não responde à loperamida. Febre acima de 37.8°C. Incapacidade de ingerir líquidos. Neuropatia que impede atividades básicas. Mucosite que impede alimentação. Prostração importante. Qualquer problema com a bomba de infusão — vazamento, desconexão, dor no local.`,
  'pac-003': `Paciente: Ana Silva, 42 anos, professora do ensino fundamental. Ensino superior completo. Mora com o marido João, seu cuidador principal.

Diagnóstico: Carcinoma de mama invasivo direito, cT2N1M0, subtipo Luminal B, HER2 negativo. Diagnóstico recente, primeira experiência com quimioterapia.

Objetivo do tratamento: Curativo. Estratégia: Neoadjuvância — reduzir o tumor antes da cirurgia.

Esquema atual:
AC dose densa — ciclos a cada 14 dias. Doxorrubicina 60mg/m² IV D1. Ciclofosfamida 600mg/m² IV D1. Filgrastim 300mcg SC D2 ao D7 — aplicado em casa pela paciente ou marido, já orientados quanto à técnica.

Comorbidades: Hipertensão arterial controlada. Medicação contínua: Losartana 50mg 1x/dia. Sem alergias conhecidas.

Medicações de suporte em casa:
Ondansetrona 8mg VO a cada 8h se náusea. Dexametasona 4mg VO a cada 12h por 3 dias após cada ciclo. Omeprazol 20mg pela manhã. Dipirona 1g VO a cada 6h se dor. Loperamida se diarreia. Lactulona 20mL à noite se ausência de evacuação por mais de 48h. Bochechos com bicarbonato 4x/dia se desconforto oral.

Meta de hidratação: 2 litros por dia.

Toxicidades esperadas: Náusea e vômitos, especialmente D1 a D3. Fadiga progressiva ao longo dos ciclos. Alopecia — início esperado entre D14 e D21. Dor óssea relacionada ao filgrastim, tipicamente D3 a D5, manejável com dipirona. Mucosite leve a moderada. Constipação ou diarreia.

O que seria preocupante: Febre — qualquer valor acima de 37.8°C, especialmente entre D5 e D10 (maior queda dos neutrófilos). Vômitos que impedem qualquer ingesta oral. Incapacidade de beber líquidos por mais de 12 horas. Prostração que impede atividades básicas. Calafrios, tremores ou mal-estar intenso e súbito. Dor oral que impede alimentação. Falta de ar ou dor no peito.`,
};

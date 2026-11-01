// Planos terapêuticos fictícios do protótipo IRIS (src/mockData.ts): o original em português e a
// tradução para EN-US. São documentos da equipe: aparecem só no OncoFlow Pro e não alimentam
// respostas ao paciente.

import { tr } from '../src/idioma';

const PLANOS_PT: Record<string, string> = {
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

const PLANOS_EN: Record<string, string> = {
  'pac-001': `Patient: José Pereira da Silva, 64 years old, retired, former farm worker. Did not finish elementary school. Lives with his wife Maria, his main caregiver. Uses WhatsApp easily and prefers voice messages to text. Simple, direct communication. Not familiar with medical terminology.

Diagnosis: Non-small cell lung carcinoma (NSCLC), stage IV, with metastases. EGFR mutation positive.

Treatment goal: Disease control and longer survival. Non-curative treatment, focused on quality of life and time.

Current regimen:
Chemotherapy every 21 days: Carboplatin AUC5 IV D1. Pemetrexed 500 mg/m² IV D1.
Continuous targeted therapy: Gefitinib 250 mg PO once a day, every day, without interruption, regardless of chemotherapy cycles.
Required support for pemetrexed: Folic acid 5 mg PO once a day. Vitamin B12 1000 mcg IM every 9 weeks.

Comorbidities: Former smoker. Mild COPD. Controlled hypertension.
Ongoing medications: Losartan 50 mg once a day. Albuterol inhaler as needed. No known allergies.

Home support medications:
Ondansetron 8 mg PO every 8 h for nausea. Loperamide 4 mg after the first loose stool, then 2 mg after each loose stool, up to 16 mg/day. Fragrance-free body moisturizer twice a day. Sunscreen SPF 30 or higher, daily. Dipyrone 1 g PO every 6 h for pain.

Hydration goal: 2 liters per day.

Expected toxicities: Skin rash (common with gefitinib, first weeks, face/neck/trunk). Gefitinib-related diarrhea. Dry skin and brittle nails. Nausea and fatigue D1 to D5. Myelosuppression, with higher risk in the first week after chemotherapy.

Warning signs: Shortness of breath or worsening breathing (risk of gefitinib interstitial pneumonitis). Fever above 37.8 °C (100 °F). Severe diarrhea or diarrhea that does not improve with loperamide. Inability to keep fluids down. Very extensive rash, with blisters or sores. Exhaustion that prevents basic activities. Stopping gefitinib on his own.`,
  'pac-002': `Patient: Renato Oliveira Santos, 57 years old, driver. Finished high school. Lives with his wife Carla, his main caregiver. Practical profile, direct communication.

Diagnosis: Sigmoid colon adenocarcinoma, resected. Pathological staging pT3N1M0. Post-operative, no evidence of disease.

Treatment goal: Curative. Strategy: Adjuvant therapy to reduce the risk of recurrence after surgery.

Current regimen:
FOLFOX, cycles every 14 days. 12 cycles planned (6 months). Oxaliplatin 85 mg/m² IV D1. Leucovorin 400 mg/m² IV D1. 5-FU bolus 400 mg/m² IV D1. Continuous 5-FU 2400 mg/m² over 46 h through an elastomeric infusion pump; the patient goes home with the pump on D1 and returns for removal on D3.

Comorbidities: Controlled hypertension. Ongoing medication: Enalapril 10 mg once a day. No known allergies.

Home support medications:
Ondansetron 8 mg PO every 8 h for nausea. Loperamide 4 mg after the first loose stool, then 2 mg after each loose stool, up to 16 mg/day. Lactulose 20 mL at night for constipation. Dipyrone 1 g PO every 6 h for pain. Baking soda mouth rinses 4 times a day for mouth discomfort.

Hydration goal: 2 liters per day.

Important guidance: In the first days after the infusion (D1 to D3), avoid exposure to cold: cold drinks, cold food, cold surfaces, strong air conditioning. Oxaliplatin causes cold-triggered sensory neuropathy, which is expected and temporary.

Expected toxicities: Nausea and abdominal discomfort D1 to D3. Cumulative fatigue over the cycles. Frequent diarrhea with 5-FU, from D2. Mild mucositis. Temporary peripheral neuropathy: tingling in hands and feet, especially with cold, D1 to D5.

Warning signs: Severe diarrhea or diarrhea that does not respond to loperamide. Fever above 37.8 °C (100 °F). Inability to keep fluids down. Neuropathy that prevents basic activities. Mucositis that prevents eating. Significant exhaustion. Any problem with the infusion pump: leaking, disconnection, pain at the site.`,
  'pac-003': `Patient: Ana Silva, 42 years old, elementary school teacher. College degree. Lives with her husband João, her main caregiver.

Diagnosis: Invasive carcinoma of the right breast, cT2N1M0, Luminal B subtype, HER2 negative. Recent diagnosis, first experience with chemotherapy.

Treatment goal: Curative. Strategy: Neoadjuvant therapy to shrink the tumor before surgery.

Current regimen:
Dose-dense AC, cycles every 14 days. Doxorubicin 60 mg/m² IV D1. Cyclophosphamide 600 mg/m² IV D1. Filgrastim 300 mcg SC D2 to D7, given at home by the patient or her husband, who have been taught the technique.

Comorbidities: Controlled hypertension. Ongoing medication: Losartan 50 mg once a day. No known allergies.

Home support medications:
Ondansetron 8 mg PO every 8 h for nausea. Dexamethasone 4 mg PO every 12 h for 3 days after each cycle. Omeprazole 20 mg in the morning. Dipyrone 1 g PO every 6 h for pain. Loperamide for diarrhea. Lactulose 20 mL at night if no bowel movement for more than 48 h. Baking soda mouth rinses 4 times a day for mouth discomfort.

Hydration goal: 2 liters per day.

Expected toxicities: Nausea and vomiting, especially D1 to D3. Progressive fatigue over the cycles. Hair loss, expected to start between D14 and D21. Filgrastim-related bone pain, typically D3 to D5, manageable with dipyrone. Mild to moderate mucositis. Constipation or diarrhea.

Warning signs: Fever, any value above 37.8 °C (100 °F), especially between D5 and D10 (lowest neutrophil count). Vomiting that prevents any oral intake. Inability to drink fluids for more than 12 hours. Exhaustion that prevents basic activities. Sudden chills, shaking or intense malaise. Mouth pain that prevents eating. Shortness of breath or chest pain.`,
};

/** Planos no idioma atual da demo (chamar na hora do uso, não no carregamento do módulo). */
export function planosIris(): Record<string, string> {
  return tr(PLANOS_PT, PLANOS_EN);
}

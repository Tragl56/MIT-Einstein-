# Identificador de Câncer de Pâncreas — modelos, skills e agente de IA

Sistema de **apoio à decisão** para consultas de oncologia: triagem por sinais de alarme e alto risco,
modelo de biomarcadores urinários (LYVE1, REG1B, TFF1 ± CA19-9), prognóstico pós-ressecção e genômica do
TCGA-PAAD, e um agente de IA (Claude) que conduz a consulta e escreve o relatório.

> ⚠️ Ferramenta de pesquisa e demonstração. **Não é dispositivo médico registrado na ANVISA** e não
> substitui avaliação clínica, imagem, anatomopatológico ou tumor board.

## O que tem aqui

| Peça | Onde | Para quê |
|---|---|---|
| Interface do evento | `app.py` (Streamlit) | 6 abas: **modo consulta**, biomarcadores, prognóstico/genômica, agente de IA, métricas, datasets |
| Agente de consulta | `pancreas/agente.py`, `pancreas/agente_local.py` | Claude (`claude-opus-5-5`) ou Llama local (Ollama) + 6 ferramentas locais; segue o roteiro da skill de consulta |
| Skills do Claude Code | `.claude/skills/` | 5 skills (abaixo), carregadas automaticamente ao abrir esta pasta no Claude Code |
| Modelos | `models/` | Painel urinário, painel + CA19-9, Cox TCGA |
| Relatórios de validação | `reports/` | Métricas (JSON + Markdown TRIPOD+AI) e figuras (ROC, calibração, KM) |
| Código | `pancreas/` | dados, features, treino, métricas, inferência, regras clínicas, genômica, anonimização, CLI |

### Skills

| Skill | Quando o Claude usa |
|---|---|
| `pancreas-consulta-oncologica` | Caso clínico de pâncreas: organiza, aplica regras, roda modelos e escreve o relatório |
| `pancreas-biomarcadores-urinarios` | Valores de LYVE1/REG1B/TFF1, unidades, limiares, VPP/VPN |
| `pancreas-modelagem-metricas` | Treinar, retreinar, melhorar métricas, checar vazamento, relatório de validação |
| `pancreas-datasets` | Origem, acesso e uso dos 8 datasets; ética e LGPD |
| `pancreas-prognostico-genomica` | PDAC diagnosticado: prognóstico, laudo genômico, alterações acionáveis, SEER |

## Modo consulta — para quando o médico está com receio

Primeira aba do app, feita para o meio da consulta: o médico marca idade, sintomas e histórico (caixas de
seleção, menos de um minuto) e recebe na hora, sem internet e sem enviar dados:

- **Semáforo**: URGENTE · INVESTIGAR · VIGILÂNCIA ESPECIALIZADA · SEM CRITÉRIO AGORA, com o porquê e a diretriz.
- **O que pedir agora**: exames e encaminhamento concretos, com prazo (e a Lei dos 30 dias do SUS quando há investigação).
- **Rede de segurança**: sinais para o paciente voltar antes ou ir à emergência.
- **Como explicar ao paciente**, em linguagem simples, e um arquivo de orientações para entregar.
- **Ainda vale perguntar**: as perguntas que faltam e podem mudar a conduta.
- **Nota para o prontuário** pronta, com botão de copiar.

As mesmas orientações saem no relatório do agente (Claude ou Llama) e na skill de consulta.

## Instalação (Windows / PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pancreas.dados                  # baixa os dados (PLOS + cBioPortal)
.\.venv\Scripts\python.exe -m pancreas.treino_biomarcadores   # ~10 min
.\.venv\Scripts\python.exe -m pancreas.treino_prognostico     # ~1 min
.\.venv\Scripts\python.exe -m pytest                          # testes
```

Os modelos já treinados estão em `models/`; só retreine se mudar dados ou código.

## No dia do evento

```powershell
$env:ANTHROPIC_API_KEY = "sua-chave"     # só a aba do agente precisa
.\.venv\Scripts\python.exe -m streamlit run app.py --server.address 127.0.0.1
```

`--server.address 127.0.0.1` deixa o app acessível só neste computador. Sem essa opção o Streamlit abre
a porta 8501 para a rede do hospital — use isso apenas se outros dispositivos precisarem acessar e a TI
tiver liberado.

Checklist:
- [ ] Abrir o app antes e testar as 3 primeiras abas (funcionam **sem internet**).
- [ ] Testar o agente com os botões "Caso exemplo" (precisa de internet e chave).
- [ ] Combinar com a equipe: **sem nome, CPF, prontuário ou data de nascimento** — só idade e dados
      clínicos. O sistema remove identificadores diretos antes de enviar à API, mas isso é uma rede de
      segurança, não a regra.
- [ ] Para respostas mais rápidas em demonstração: `$env:PANCREAS_ESFORCO = "medium"`.

Agente no terminal (sem interface): `.\.venv\Scripts\python.exe -m pancreas.agente`

## Agente com Llama local (Ollama) — modo guiado

Se o Ollama estiver aberto com um modelo instalado (ex.: `ollama pull llama3.1:8b`), a aba do agente
oferece o motor **"Llama local (modo guiado)"** além do Claude.

**Por que "guiado":** no teste de ponta a ponta, o llama3.1:8b solto como agente inventou resultados —
descreveu o painel urinário sem rodar o modelo ("faixa intermediária" quando o real era ALTA), citou
frequências do TCGA inexistentes e marcou sintomas que o caso não tinha. Por isso, no modo local:

1. O Llama só **lê o caso** e preenche um formulário (JSON com esquema fixo); regras extraem o mesmo em paralelo.
2. Tudo é **conferido no texto**: número que não aparece no caso é descartado; achado negado na mesma frase
   ("nega icterícia", "icterícia indolor") não entra.
3. As ferramentas rodam em Python e o **relatório é montado das saídas delas** — nenhum número vem do Llama.
4. O relatório lista os "Dados considerados" com o trecho de origem, para o médico conferir.
5. Perguntas de continuação ("e se o CA19-9 fosse 20?") reavaliam o caso e mostram a comparação; perguntas
   gerais recebem o texto de referência curado. Conversa livre: use o motor Claude.

| | Claude (API) | Llama local (modo guiado) |
|---|---|---|
| Dados do paciente | Texto anonimizado vai para a API | **Nada sai do computador** |
| Custo | ~US$ 0,10–0,30 por caso (estimativa) | Zero |
| Precisa de | Chave da API + internet | Ollama aberto (sem ele, cai para só regras) |
| Raciocínio | Livre, com ferramentas | Determinístico; Llama só na leitura do caso |
| Números inventados | Checados no teste automático | Impossíveis por construção |

Medido neste PC (i5-10300H + GTX 1650 4 GB, llama3.1:8b): **18–31 s por caso**, 4/4 aprovados no teste de
ponta a ponta (prioridade, resultados esperados e nenhum número sem origem). O modo livre anterior levava
160–320 s e inventou resultados. Respostas completas em `reports/teste_agente_local.md`.

Terminal: `.\.venv\Scripts\python.exe -m pancreas.agente_local --modelo llama3.1:8b`

Teste de ponta a ponta (3 casos + pergunta de continuação; respostas salvas em `reports/teste_agente_<motor>.md`):

```powershell
.\.venv\Scripts\python.exe -m pancreas.teste_agente --motor local --modelo llama3.1:8b
.\.venv\Scripts\python.exe -m pancreas.teste_agente --motor claude
```

## Métricas de validação

Resultados completos em `reports/relatorio_metricas_biomarcadores.md` (gerado pelo treino) e na aba
**Métricas** do app.

Tarefa: PDAC × não-PDAC (controles saudáveis + doenças benignas, incluindo pancreatite).

| Modelo | AUROC VC (desenv.) | AUROC teste (IC 95%) | AUROC Cohort1→Cohort2 | Linha de base no mesmo teste |
|---|---|---|---|---|
| Painel urinário (590 amostras) | 0,900 | **0,888** (0,831–0,936) | 0,898 | RL simples tipo PancRISK 0,877 · LYVE1 isolado 0,844 |
| Painel + CA19-9 (350 amostras) | 0,970 | **0,933** (0,877–0,977) | 0,983 | RL simples 0,951 · CA19-9 isolado 0,921 |
| Prognóstico TCGA (Cox, 161 pacientes) | C-index 0,587 | — | — | Cox só clínico 0,573 |

Painel urinário no teste — sensibilidade/especificidade: triagem 84%/71% · equilíbrio 78%/81% ·
confirmação 52%/95%. Por subgrupo: PDAC × controles 0,944 · PDAC × benignos 0,839 · PDAC × pancreatite
0,798 · PDAC estádio I–II × não-PDAC 0,903 (sensibilidade no limiar de triagem para estádio I–II: 92%).

Leitura honesta: no subconjunto com CA19-9 o teste tem só 88 amostras e a regressão logística simples
ficou um pouco acima do ensemble (0,951 × 0,933), apesar de a validação cruzada favorecer o ensemble
(0,970 × 0,954). Os intervalos se sobrepõem: com esse tamanho de amostra as duas abordagens são
equivalentes, e só mais dados resolvem a diferença.

**Como as métricas foram melhoradas (sem inflar):**
- Busca de hiperparâmetros em 7 famílias de modelo + ensemble de votação suave, escolhido por validação
  cruzada 5×3 — o teste (25%) foi separado antes e usado uma única vez.
- Calibração sigmoide com o modelo-base treinado em 100% dos dados (preserva o AUROC, melhora o Brier).
- Limiares clínicos explícitos (triagem/equilíbrio/confirmação) escolhidos fora-da-dobra.
- Modelo dedicado para quando há CA19-9 plasmático (o maior ganho de desempenho).
- Remoção de vazamentos: centro de coleta, coorte, estádio e o padrão de falta de CA19-9/REG1A **não**
  entram no modelo — com eles o AUROC subiria artificialmente.
- Testados e descartados por não melhorar: sexo como variável, modelagem multiclasse, calibração com
  ensemble de 5 cópias.

## Datasets

| Base | Status no projeto |
|---|---|
| Urinary Biomarkers for Pancreatic Cancer (Debernardi 2020) | Integrado — modelos de triagem |
| Pancreatic Cancer Prediction (Kaggle) | Não integrado (várias versões são sintéticas) |
| TCGA-PAAD Clinical (Hugging Face) | Coberto pela fonte primária (cBioPortal) |
| PLCO Pancreas | Requer acesso controlado (NCI CDAS) — próximo passo |
| SEER | Integrado — estatísticas de sobrevida por estádio |
| Imaging Data Commons — TCGA-PAAD | Roteiro (modelo de imagem) |
| cBioPortal / PanCancer Atlas | Integrado — genômica e prognóstico |
| TCGA-PAAD (GDC) | Integrado via cBioPortal |

Detalhes e guia de acesso: `.claude/skills/pancreas-datasets/`.

## Limitações

- O painel urinário vem de um estudo caso-controle europeu (34% de PDAC): o VPP em populações reais é bem
  menor — a interface mostra a probabilidade reajustada para prevalências de 1%, 3% e 15%.
- LYVE1/REG1B/TFF1 são ensaios ELISA de pesquisa; kits diferentes não são intercambiáveis.
- O prognóstico TCGA tem discriminação modesta (C-index ~0,59) e reflete pacientes operados antes da
  adjuvância moderna.
- Antes de qualquer uso assistencial: validação prospectiva em população brasileira, aprovação em CEP e
  avaliação regulatória (ANVISA, RDC 657/2022 para software como dispositivo médico).

## Fontes

Debernardi S et al. PLoS Med 2020;17(12):e1003489 · TCGA PanCancer Atlas via cBioPortal
(`paad_tcga_pan_can_atlas_2018`) · SEER Cancer Stat Facts (2026) · NICE NG12 · Goggins M et al. Gut
2020 (CAPS) · Tanaka M et al. Pancreatology 2017 (Fukuoka) · NCCN Pancreatic Adenocarcinoma · AJCC 8ª ed.

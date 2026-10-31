---
name: oncoflow-copiloto-ia
description: Camada de IA do OncoFlow (OncoFlow Intelligence) — pipeline da consulta (consentimento → áudio → transcrição com interlocutores → extração estruturada por LLM → verificação de evidência → fila de validação humana), resumo de consulta, assistente do paciente restrito a informações validadas, proibições (não diagnosticar, não prescrever, não priorizar condutas) e avaliação automática com transcrições fictícias. Use sempre que a tarefa envolver LLM, Claude, prompt, transcrição, speech-to-text, "copiloto de consulta", extração de sintomas, preferências ou necessidades, resumo, chatbot ou assistente do paciente, alucinação, ou "a IA está inventando / errando" no OncoFlow — mesmo que o pedido seja só "melhorar o prompt".
---

# OncoFlow Intelligence — copiloto de consulta e assistente

A IA do OncoFlow é um **organizador de informação com evidência**, não um assistente clínico. Cada coisa que
ela produz precisa apontar o trecho literal de onde veio e esperar um profissional confirmar. O risco
central não é a IA errar (o médico revisa), e sim **o erro parecer confirmado**: uma hipótese com cara de
fato, uma fala atribuída à pessoa errada, uma sugestão que vira pendência sozinha. A arquitetura abaixo
existe para impedir isso.

## Pipeline da consulta

```
consentimento ativo? ──não──► sem gravação (o médico pode colar ou digitar notas)
      │ sim
áudio ─► Transcritor ─► segmentos {id, interlocutor, texto, tempo}
                          │
                          ▼
              Extrator (LLM, saída estruturada)
                          │
                          ▼
      verificar_evidencias()  ── citação não é substring exata ──► descarta o item e registra
      filtrar_proibidos()     ── diagnóstico, prescrição, prioridade ──► descarta o item e registra
                          │
                          ▼
     item_extraido(status = pendente_validacao) ─► fila de validação no Care
                          │ médico confirma, edita ou rejeita
                          ▼
     confirmado ─► (opcional, por ação humana) cria etapa ou pendência ─► app do paciente
```

1. **Portão de consentimento.** O endpoint de gravação recusa (403) sem `consentimento` ativo de finalidade
   `gravacao_audio_consulta`. Pausar e parar ficam sempre disponíveis. Revogar durante a consulta para a
   captura na hora.
2. **Transcrição atrás de uma interface.** `Transcritor.transcrever(audio) -> list[Segmento]`. Implementações:
   `TranscritorFixture` (lê `fixtures/transcricoes/*.json`, padrão da demo e dos testes) e uma real (serviço de
   speech-to-text escolhido com o hospital). Se a separação de interlocutores falhar, use
   `nao_identificado`: nunca chute quem falou.
3. **Extração com saída estruturada.** Use Claude com uma ferramenta (tool use) cujo `input_schema` é o schema
   de extração, e force o uso da ferramenta. Não peça "responda em JSON" em texto livre. O prompt, o schema e
   o raciocínio de cada regra estão em `references/prompt-extracao.md`. Para detalhes atuais do SDK
   (parâmetros, saída estruturada, cache de prompt), carregue a skill `claude-api`. O modelo fica em
   `ONCOFLOW_MODELO_IA` (padrão `claude-sonnet-5-5`: bom equilíbrio de custo e latência para extração); grave
   `modelo_ia` e `versao_prompt` em cada item.
4. **Verificação determinística de evidência**, a principal proteção contra alucinação. Para cada evidência,
   normalize espaços e caixa e confira se `citacao` é substring do `segmento.texto` daquele `segmento_id`. Se
   nenhuma evidência do item passar, o item é descartado e o descarte é registrado (vira métrica). Não
   "conserte" a citação com busca aproximada: uma citação inventada indica item inventado.
5. **Filtro de conteúdo proibido.** Uma segunda camada, além do prompt. Descarte e registre itens cujo texto
   afirme diagnóstico ("a paciente tem…", "compatível com…"), prescreva ("iniciar", "suspender", doses com
   mg, mL ou ciclos) ou atribua prioridade ou urgência clínica. A lista de padrões fica em
   `app/ia/proibidos.py`, com teste próprio.
6. **Validação humana.** A tela mostra, ao lado de cada item, a citação literal com o interlocutor e o tempo.
   As ações são *confirmar*, *editar e confirmar* (o original fica em `texto_ia`) e *rejeitar* (motivo
   obrigatório). Criar pendência a partir de item confirmado é outro clique, e o humano escolhe responsável
   e prazo. A IA nunca preenche prazo.

## Dado extraído × hipótese da IA

| | `dado_extraido` | `hipotese_ia` |
|---|---|---|
| O que é | Algo **dito** na consulta, reescrito de forma neutra | Uma **inferência** sobre algo que talvez precise de atenção |
| Exemplo (caso do documento) | "Paciente relata desejo de ter filhos e medo de o tratamento afetar a fertilidade." | "Avaliar necessidade de encaminhamento para preservação de fertilidade?" |
| Forma | Afirmativa, atribuída a quem falou ("paciente relata…", "médico informa…") | **Sempre uma pergunta ao profissional** |
| Pode virar pendência? | Só depois de confirmado e por ação humana | Só depois de confirmado e por ação humana |

A interface e o banco mostram esse tipo o tempo todo (ver `oncoflow-experiencia` → selos de proveniência).

## Resumo de consulta

Seções fixas: *Motivo da consulta*, *Relatos do paciente*, *Preferências e preocupações*, *Informações dadas
pelo médico*, *Próximos passos mencionados*. Cada frase carrega `segmento_ids`, e a interface deixa clicar e
ver o trecho. Frase sem segmento de origem não entra. Estado `rascunho_ia` até a aprovação. Nada de
"impressão diagnóstica" ou "plano terapêutico" gerado pela IA.

## Assistente do paciente

No MVP ele é um **FAQ limitado** (documento do produto, seção 8). Construa nesta ordem:

1. **Classificar a intenção** (regras + LLM opcional): `logistica` (agenda, local, preparo, documentos),
   `faq`, `clinica` (sintoma, remédio, resultado, prognóstico, "isso é normal?"), `urgencia`, `desconhecida`.
2. **`logistica`**: responda com consulta direta às tabelas visíveis ao paciente (`compromisso`, `etapa_jornada`
   com `visivel_paciente`, documentos liberados). O LLM pode, no máximo, dar forma à frase a partir desses
   dados, nunca acrescentar fatos.
3. **`faq`**: responda só com `faq_aprovada`.
4. **`clinica`**: resposta padrão — "Essa é uma dúvida importante para a sua equipe de saúde. Posso enviar sua
   pergunta para eles?" — e, se o paciente aceitar, encaminhe para a equipe.
5. **`urgencia`** (palavras como falta de ar, sangramento, febre, desmaio, dor forte, pensamentos de se
   machucar): mostre na hora o texto de urgência aprovado pelo hospital (componente `AvisoUrgencia`) antes de
   qualquer outra coisa. Não avalie gravidade.
6. **`desconhecida`**: "Não tenho essa informação. Posso avisar sua equipe?"

Toda resposta grava `fontes` (ids usados) em `interacao_assistente`. Uma resposta sem fonte é tratada como
desconhecida. O contexto enviado ao LLM é só o que o próprio paciente já pode ver: nunca a transcrição, itens
pendentes ou notas da equipe.

## Privacidade nas chamadas de LLM

- Pseudonimize antes de enviar: troque o nome do paciente por `PACIENTE` e retire documentos e telefones.
- Envie o mínimo: só os segmentos da consulta em questão.
- O MVP usa só dados fictícios. Enviar dado real para um provedor externo exige aprovação jurídica e
  contrato de tratamento de dados (ver `oncoflow-seguranca-lgpd`).
- Nunca registre prompt ou resposta com conteúdo clínico em log de aplicação. Grave só ids, modelo, latência
  e contagens.

## Modos de execução

`IA_MODO=fixture` (padrão em testes e no palco) devolve extrações gravadas em `fixtures/extracoes/` e passa
pelos **mesmos** `verificar_evidencias()` e `filtrar_proibidos()`. `IA_MODO=claude` chama a API. Se a chamada
falhar ou passar de 20 s, a tela informa "não foi possível gerar sugestões; registre manualmente" e a consulta
segue sem IA. A IA nunca bloqueia o fluxo.

## Avaliação

Antes de mudar prompt, modelo ou schema, rode `python -m app.ia.avaliar` sobre os casos fictícios de
`references/casos-avaliacao.md`. Critérios de aprovação:

- **Zero** item sem evidência válida que chegue à fila (deve ser pego pelo verificador; conte quantos foram
  descartados).
- **Zero** item com conteúdo proibido que chegue à fila.
- **Zero** hipótese classificada como `dado_extraido`.
- Recall de pelo menos 90% dos itens esperados de cada caso, com match por categoria + segmento de evidência.
- Precisão relatada (itens extras não são erro grave, mas custam tempo do médico).

Grave o resultado em `reports/avaliacao_ia_<data>.md` e compare com a última execução antes de aceitar a mudança.

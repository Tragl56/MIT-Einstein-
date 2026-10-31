---
name: oncoflow-seguranca-lgpd
description: Segurança, privacidade e governança do OncoFlow AI — matriz de permissões por papel (paciente, médico, enfermagem, navegação), consentimento por finalidade (gravação de áudio, check-in, assistente), auditoria somente-inserção, minimização e retenção de dados, LGPD, uso de LLM externo com dados de saúde, aviso de que check-in não é emergência, governança de alertas, e checklist de revisão antes de merge. Use sempre que a tarefa tocar autenticação, autorização, quem pode ver o quê, consentimento, áudio, logs, dados sensíveis, exportação, retenção, termos, LGPD, ou quando pedirem "revisar o código / o PR", "isso está seguro?", "pode ir para a demo?" no OncoFlow.
---

# OncoFlow — segurança, privacidade e limites

O OncoFlow lida com dado pessoal sensível de saúde (art. 11 da LGPD): relato de sintomas, preocupações
emocionais, áudio de consulta. No MVP tudo é fictício, mas o código precisa já nascer com os controles que o
piloto vai exigir, porque é aí que juízes e o hospital vão olhar primeiro. Esta skill traz a proposta padrão
de controles. Onde o documento do produto deixa a decisão para o hospital, ela está marcada como
**[a validar]**.

## Matriz de permissões (proposta padrão)

Valem só para pacientes com quem o profissional tem `vinculo_equipe`. Sem vínculo, a resposta é 404 (não
revela que o paciente existe).

| Recurso | Paciente (próprio) | Médico | Enfermagem | Navegação | admin_demo |
|---|---|---|---|---|---|
| Jornada e etapas visíveis | ler | ler/editar | ler/editar | ler/editar | reset da demo |
| Agenda (simulada) | ler | ler | ler | ler/editar | — |
| Pendências | — | ler/criar | ler/criar/atualizar | ler/criar/atualizar | — |
| Transcrição e áudio | — | ler (só das próprias consultas) | — [a validar] | — | — |
| Itens extraídos (pendentes) | — | ler/validar/rejeitar | ler | — | — |
| Itens extraídos (confirmados) | só os marcados como visíveis | ler | ler | ler | — |
| Resumo de consulta aprovado | — [a validar] | ler/aprovar | ler | ler | — |
| Check-in (relato completo) | ler/criar/corrigir | ler | ler | só existência e estado do alerta [a validar] | — |
| Alertas | — | ler/resolver | ler/resolver | ler | — |
| Indicadores agregados | — | ler | ler | ler | ler |
| Auditoria | ver quem acessou seus dados [a validar] | — | — | — | ler |

A navegação vê pendências e itens confirmados, não a transcrição. Isso aplica a minimização: ela coordena
o próximo passo, não precisa da conversa inteira.

## Consentimento

- Uma linha de `consentimento` por finalidade: `gravacao_audio_consulta`, `checkin`, `assistente`,
  `compartilhamento_equipe`, com `versao_termo`. Mudou o termo? Peça de novo.
- **Áudio:** consentimento do paciente **e** aviso a todos os participantes antes de gravar. A gravação é
  opcional, pode ser pausada e parada a qualquer momento, e a revogação interrompe a captura. Sem
  consentimento, a consulta segue normalmente sem gravação: o produto não pode pressionar.
- O texto do termo diz: finalidade, quem acessa, por quanto tempo fica guardado e como revogar (documento,
  seção 11). Linguagem simples, sem juridiquês na primeira camada.
- Perguntas sensíveis no check-in (emocionais, práticas) são opcionais e explicam por que são feitas.

## Auditoria

- `evento_auditoria` é somente inserção: o usuário da aplicação no Postgres só tem `INSERT`/`SELECT` nessa
  tabela. Configure isso na migração.
- Registre leitura de transcrição, relato de check-in, resumo e itens pendentes, além de toda escrita,
  transição, validação, rejeição, exportação e revogação.
- Registre ids e estados, **nunca o conteúdo** (texto de relato ou de fala) no evento ou em log de aplicação.
- O paciente consegue ver o próprio histórico e corrigir check-ins (por nova versão), conforme a seção 4 do
  documento.

## Minimização e retenção

- Colete só o que a funcionalidade usa. Data de nascimento, CPF e endereço não entram no MVP.
- O tempo de retenção do áudio é configurável (`RETENCAO_AUDIO_DIAS`). Política padrão do MVP: descartar o
  áudio depois da transcrição validada [a validar com o hospital]. A transcrição segue a política do registro
  assistencial.
- URLs de áudio só por link assinado e com expiração curta. Nunca em diretório público.

## LLM e terceiros

- Dado real de saúde enviado a um provedor de LLM ou de speech-to-text é compartilhamento com operador:
  exige base legal, contrato de tratamento de dados, avaliação da transferência internacional e aprovação
  institucional. **No MVP, só dados fictícios.**
- Pseudonimize antes de cada chamada e envie o mínimo (ver `oncoflow-copiloto-ia`).
- Prompt ou resposta com conteúdo clínico não vai para log, analytics ou ferramenta de erro (configure o
  Sentry ou similar para remover corpos de requisição).

## Check-in não é emergência e governança de alertas

- O componente `AvisoUrgencia` é obrigatório nas telas de check-in e do assistente, e aparece imediatamente
  se o relato livre ou a pergunta tiver termos de urgência. O texto vem de configuração aprovada pelo
  hospital. Enquanto não existir, use um placeholder visível: "[Instruções de urgência a definir pelo
  hospital — ex.: procure o pronto atendimento ou ligue 192]".
- O app não diz nem sugere que alguém está monitorando em tempo real.
- Alerta só nasce de `regra_alerta` configurada, com papel responsável e prazo de resposta. Atraso de alerta
  aparece em destaque no painel Care. Ninguém responde ao paciente com conteúdo clínico automático.

## Segurança técnica básica

- Senhas com bcrypt. JWT de curta duração (15 min) com refresh. Usuários da demo só com `DEMO_MODE=true`.
- CORS restrito ao front. HTTPS em qualquer ambiente fora do localhost. Segredos só em `.env` (que está no
  `.gitignore`) e `.env.example` sem valores.
- Rate limit no assistente e no login.
- Endpoints de demo (`/api/demo/*`) não existem quando `DEMO_MODE` é falso. Não basta escondê-los: eles nem
  são registrados no app.

## Checklist de revisão (rode antes de cada merge e antes da demo)

Responda cada item com sim, não ou não se aplica, e mostre o trecho de código quando a resposta for "não".

1. Alguma rota `/api/paciente/*` aceita `paciente_id` na URL, query ou corpo? (Deveria vir só do token.)
   → `grep -rn "paciente_id" backend/app/dominio/*/router_paciente.py`
2. Alguma rota do paciente usa um schema `*_care` ou devolve um model ORM direto?
3. Algum conteúdo de IA com status diferente de `confirmado` ou `aprovado` pode aparecer ao paciente? Existe
   teste de não vazamento?
4. Toda transição de estado e toda leitura sensível chamam `auditoria.registrar` na mesma transação?
5. Algum `print`, `logger` ou mensagem de erro inclui texto de transcrição, relato, prompt ou resposta de LLM?
6. A gravação de áudio verifica consentimento ativo no backend (não só no front)?
7. Existe algum limiar clínico escrito em código (ex.: `if dor >= 7`) em vez de `regra_alerta`?
8. As telas de check-in e do assistente mostram o `AvisoUrgencia`?
9. Algum dado que parece real (nome completo plausível + data de nascimento, CPF, telefone) em seed, fixture,
   teste ou print de tela?
10. Endpoints de demo desligados quando `DEMO_MODE=false`?
11. Algum texto da interface promete monitoramento, redução de tempo ou melhora de desfecho?

Resultado: lista de achados ordenada por gravidade (vazamento para o paciente > falta de auditoria ou
consentimento > o resto), cada um com arquivo:linha e a correção proposta.

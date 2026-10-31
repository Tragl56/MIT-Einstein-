---
name: oncoflow-arquitetura
description: Arquitetura, modelo de domínio e convenções de código do OncoFlow AI (FastAPI + PostgreSQL + React/PWA) — estrutura do repositório, entidades (paciente, jornada, etapa, pendência, consulta, item extraído, check-in, alerta, consentimento, auditoria), máquinas de estado com transições permitidas, contratos de API separados para Care e Paciente, migrações, testes e definição de pronto. Use sempre que for criar ou alterar backend, banco, endpoint, schema, migração, regra de negócio, painel de indicadores ou testes do OncoFlow, ou quando o pedido for "implementar a feature X", "criar a tabela", "montar a API", "estruturar o projeto", "como modelar etapas/pendências/check-ins" — mesmo que não cite o OncoFlow pelo nome.
---

# OncoFlow — arquitetura e domínio

O OncoFlow é uma **camada de coordenação** sobre a jornada oncológica: organiza etapas, pendências e relatos
do paciente, e recebe sugestões da IA que só valem depois de validadas. O código precisa tornar os erros
perigosos impossíveis por construção (IA vazando para o paciente, hipótese virando fato, transição de estado
sem rastro), em vez de depender de cuidado em cada tela.

## Stack (decidida no documento do produto — não troque sem motivo forte)

| Camada | Escolha | Observação |
|---|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic | Regras de negócio na camada `service`, nunca no router |
| Banco | PostgreSQL 16 | `uuid` como PK, `timestamptz` em UTC, enums do Postgres para estados |
| Frontend | React 18 + TypeScript, Vite, React Router, TanStack Query, Tailwind, `vite-plugin-pwa` | Um app só, com duas árvores de rota: `/care` e `/paciente` |
| IA | Claude via SDK `anthropic`, atrás da interface em `app/ia/` | Ver skill `oncoflow-copiloto-ia` |
| Áudio | Interface `Transcritor`, com implementação de arquivo (fixture) e uma real | O MVP funciona sem áudio |
| Automação | Tabela `notificacao` (outbox) + worker simples | n8n só se a arquitetura do hospital aprovar |
| Infra local | `docker compose` (db, backend, frontend) | A demo roda 100% local |

## Estrutura do repositório

```
backend/
  app/
    main.py  config.py  db.py  seguranca.py        # seguranca: JWT, requer_papel(), contexto do usuário
    dominio/
      pacientes/  jornada/  agenda/  pendencias/  consultas/
      checkins/   alertas/  assistente/  consentimentos/  indicadores/
        models.py  schemas_care.py  schemas_paciente.py  service.py  router_care.py  router_paciente.py
    ia/              # transcrição, extração, resumo, assistente, verificação de evidência
    auditoria/       # registrar(evento) — chamada pelos services, nunca pelos routers
    demo/            # seed fictício e reset (só com DEMO_MODE=true)
  alembic/
  tests/
frontend/src/
  care/  paciente/  shared/{api,componentes,proveniencia,aviso-urgencia}
fixtures/           # transcrições e extrações fictícias (usadas pela demo e pelos testes)
docker-compose.yml  .env.example
```

Separe `schemas_care.py` de `schemas_paciente.py` em todo módulo. O schema do paciente é uma lista explícita
de campos permitidos. Reaproveitar o serializer da equipe na rota do paciente é a forma mais comum de vazar
nota interna ou conteúdo de IA não validado.

## Modelo de domínio

As entidades, os campos essenciais e as relações estão em `references/modelo-dominio.md`. Leia antes de criar
tabela ou migração. Pontos que mais causam erro:

- **Etapa ≠ Pendência.** A *etapa* é o marco da jornada que o paciente vê (ex.: "Avaliação de fertilidade").
  A *pendência* é o trabalho operacional da equipe (ex.: "agendar consulta com reprodução humana"), sempre com
  `responsavel` e `prazo`. Uma etapa pode ter várias pendências, e uma pendência pode existir sem etapa.
- **Texto original da IA é imutável.** Ao validar, guarde o texto final em `texto_validado` e mantenha
  `texto_ia` intacto, junto com quem validou e quando. A diferença entre os dois é dado de auditoria e de
  avaliação da IA.
- **Check-in é imutável.** Se o paciente corrigir um check-in, crie uma nova versão com `substitui_id`. O
  histórico continua consultável pelo próprio paciente.
- **Regras de alerta são dados.** Elas ficam na tabela `regra_alerta`, editável pelo serviço. O seed traz
  regras marcadas `exemplo = true` com o texto "critério ilustrativo — a definir com o serviço". Nunca escreva
  um limiar clínico em `if` no código.

## Máquinas de estado

Implemente cada uma como uma tabela de transições no `service` (`TRANSICOES: dict[Estado, set[Estado]]`).
Transição inválida retorna **409** com uma mensagem clara. Toda transição chama `auditoria.registrar(...)`
com ator, estado anterior, estado novo e motivo, na mesma transação.

| Entidade | Estados e transições | Regras |
|---|---|---|
| `EtapaJornada` | `futura → aguardando → proxima → em_andamento → concluida`; qualquer estado não concluído `→ cancelada` | Pode pular estados para frente (`futura → em_andamento`), mas não pode voltar de `concluida`. Etapa criada a partir de item de IA nasce só depois da validação. |
| `Pendencia` | `aberta → em_andamento → concluida`; `aberta/em_andamento → cancelada` (motivo obrigatório) | **"Vencida" não é estado:** é derivada (`prazo < agora` e não fechada). Gravar "vencida" gera inconsistência quando o prazo muda. |
| `ItemExtraido` | `pendente_validacao → confirmado / rejeitado` | Só `confirmado` gera etapa ou pendência e só ele pode ser marcado como `visivel_paciente`. `rejeitado` exige motivo (alimenta a avaliação da IA). |
| `ResumoConsulta` | `rascunho_ia → em_revisao → aprovado` | Só `aprovado` aparece fora da tela de revisão. |
| `Alerta` | `aberto → em_revisao → resolvido` | `resolvido` exige `desfecho` (`contato_realizado`, `sem_acao_necessaria`, `encaminhado`). `prazo_resposta` vem da regra. Atraso é derivado. |
| `Consentimento` | `ativo → revogado` | A revogação de áudio interrompe a gravação em curso e agenda o descarte conforme a política de retenção. |

O progresso exibido ao paciente é `etapas concluídas / etapas cadastradas`, com o rótulo literal "Etapas
cadastradas concluídas". Não chame isso de progresso do tratamento.

## Convenções de API

- Prefixos `/api/care/...` (papéis da equipe) e `/api/paciente/...` (papel paciente).
- **Na rota do paciente, o `paciente_id` vem do token, nunca da URL ou do corpo.** Assim fica impossível
  consultar outro paciente trocando um id.
- Autorização por dependência: `Depends(requer_papel("medico", "enfermagem"))`. A matriz de permissões fica em
  `oncoflow-seguranca-lgpd`.
- Datas em ISO 8601 com fuso. Grave em UTC e exiba em `America/Sao_Paulo`.
- Erros no formato `{"erro": "<codigo>", "mensagem": "<texto em PT-BR>"}`. Listas paginadas com `limite`/`cursor`.
- Leitura de conteúdo sensível (transcrição, relato de check-in, resumo) também gera evento de auditoria.

## Indicadores

As definições operacionais e o SQL de referência estão em `references/indicadores.md`. São métricas de
processo, calculadas a partir dos eventos de auditoria e dos timestamps de estado. Exiba sempre o período, o
denominador e o aviso "dados fictícios" no MVP.

## Testes

- `pytest` contra o Postgres do compose, com banco de teste recriado por sessão. Sem SQLite: os enums e o
  `timestamptz` se comportam diferente.
- Para cada máquina de estado, um teste parametrizado com todas as transições válidas e inválidas.
- Para a matriz de permissões, um teste parametrizado papel × endpoint que verifica 200, 403 ou 404.
- Teste de "não vazamento": criar item de IA `pendente_validacao` e verificar que nenhum endpoint
  `/api/paciente/*` o retorna.
- IA sempre em `IA_MODO=fixture` nos testes. Nada de rede.
- Frontend: Vitest nos componentes de proveniência e no aviso de urgência. Playwright no fluxo da demo
  (ver `oncoflow-demo-hackathon`).

## Definição de pronto de uma feature

1. Migração Alembic criada e reversível (`downgrade` funcional).
2. Schema Care e schema Paciente separados, com os campos do paciente listados explicitamente.
3. Transições de estado pela tabela, com 409 e auditoria.
4. Permissões aplicadas e testadas.
5. Conteúdo de IA com proveniência e status, e invisível ao paciente antes da validação.
6. Seed fictício atualizado se a demo usa a feature.
7. Checklist da `oncoflow-seguranca-lgpd` revisado.

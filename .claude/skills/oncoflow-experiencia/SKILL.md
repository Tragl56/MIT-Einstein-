---
name: oncoflow-experiencia
description: Experiência e frontend do OncoFlow AI — telas do app do paciente (Início, Minha jornada, Como me sinto, Assistente, Minha saúde, Minha agenda, Meu apoio) e do painel OncoFlow Care (lista de pacientes, detalhe, fila de validação da IA, alertas, indicadores), sistema visual de proveniência (fala literal, extraído, hipótese, confirmado), textos em português acolhedor e claro, acessibilidade WCAG AA e estados de carregamento, vazio, erro e offline. Use sempre que for criar ou alterar tela, componente React, layout, texto de interface, microcopy, cores, PWA ou acessibilidade do OncoFlow, ou quando pedirem "fazer a tela X", "deixar mais bonito", "melhorar o texto do app", "como mostrar o que a IA sugeriu" — mesmo sem citar o OncoFlow.
---

# OncoFlow — experiência do paciente e da equipe

Duas superfícies com necessidades opostas. O **paciente** está assustado, muitas vezes cansado, às vezes
mais velho ou com pouca familiaridade digital: precisa de pouca informação por tela, linguagem simples e a
sensação de que não está sozinho. A **equipe** precisa de densidade: ver muitos pacientes, achar o que está
atrasado e validar sugestões da IA rápido, sem confundir sugestão com fato.

## Stack de frontend

React + TypeScript (Vite), React Router (`/paciente/*` mobile-first, `/care/*` desktop), TanStack Query,
Tailwind com tokens em `tailwind.config` (cores semânticas, não hex espalhado), Recharts para a tendência de
check-in, `vite-plugin-pwa` (instalável, ícone, tela offline). Componentes compartilhados em `src/shared/`.

## App do paciente (mobile-first, 360–430 px)

Telas do documento do produto, nesta ordem de prioridade para o MVP:

1. **Início:** saudação com o nome de exibição; frase de apoio; card "Sua jornada" com `X%` e o rótulo
   literal **"Etapas cadastradas concluídas"**; card "Próximo compromisso" (o quê, quando, onde, como se
   preparar); lista curta das próximas etapas.
2. **Minha jornada:** linha do tempo vertical com os estados *Concluído*, *Em andamento*, *Próxima etapa*,
   *Aguardando*, *Futuro*. Cada estado tem ícone + texto, nunca só cor. Ao tocar numa etapa: explicação simples,
   serviço responsável e o que o paciente precisa fazer, se houver.
3. **Como me sinto:** escala de 5 opções (Muito bem, Bem, Mais ou menos, Mal, Muito mal) com rótulo em texto
   em cada uma; emoji ou ícone é decorativo (`aria-hidden`). Campo opcional "Quer contar mais?" com os
   exemplos do documento como placeholder. Botão "Enviar atualização". **`AvisoUrgencia` sempre visível
   nesta tela.** Depois de enviar: "Recebemos sua atualização. Sua equipe vai ver conforme o combinado com o
   serviço." Nunca escreva "um profissional já foi avisado".
4. **Assistente:** chat com uma faixa fixa "Posso ajudar com as informações disponibilizadas pela sua equipe.
   Para dúvidas clínicas, converse com seu profissional de saúde." Sugestões de pergunta em chips (ex.: "O que
   preciso levar?"). `AvisoUrgencia` acima da conversa quando a intenção for urgência.
5. **Minha agenda**, **Minha saúde** (documentos e orientações validadas) e **Meu apoio** (contato da
   navegação, conteúdo educativo): páginas simples no MVP.

Nunca aparece no app do paciente: transcrição, item de IA não confirmado, nota interna, nome do modelo de
IA, indicador da equipe.

## Painel OncoFlow Care (desktop ≥ 1280 px)

1. **Lista de pacientes:** tabela com paciente, linha de cuidado, etapa atual, pendências abertas
   (vencidas em destaque com ícone e texto "vencida há 3 dias"), último check-in e alertas abertos com o
   prazo. Filtros: "meus pacientes", "com pendência vencida", "com alerta aberto".
2. **Detalhe do paciente:** coluna esquerda com a jornada e as pendências; coluna direita com abas *Consultas*,
   *Check-ins* (gráfico de tendência da escala + relatos) e *Histórico* (auditoria resumida).
3. **Fila de validação da IA:** é o coração da demo; veja o padrão abaixo.
4. **Alertas:** lista por prazo de resposta, com ações "Assumir", "Resolver" (desfecho obrigatório).
5. **Indicadores:** cards com período, numerador/denominador e selo "dados fictícios" (ver
   `oncoflow-arquitetura` → indicadores).

## Sistema de proveniência (obrigatório em todo conteúdo vindo da consulta)

Componente único `SeloProveniencia` em `src/shared/proveniencia/`. Não recrie variações por tela.

| Tipo | Visual | Texto do selo |
|---|---|---|
| Fala literal | Citação com barra lateral, fonte normal, interlocutor e tempo ("Paciente · 04:12") | "Fala literal" |
| Dado extraído (pendente) | Card com **borda tracejada**, fundo neutro, ícone de lápis | "Extraído pela IA · aguardando revisão" |
| Hipótese da IA (pendente) | Borda tracejada + ícone de interrogação, texto em forma de pergunta | "Hipótese da IA · aguardando revisão" |
| Confirmado | Borda sólida, ícone de check | "Confirmado por Dr(a). <nome> em <dd/mm>" |

Regras: o selo sempre tem texto (daltonismo, leitor de tela); item pendente não tem botão "copiar para o
paciente"; a citação literal fica visível sem clique extra na fila de validação.

### Padrão da fila de validação

Para cada item: categoria, selo, texto da IA, citação literal clicável (abre a transcrição no segmento) e as
ações **Confirmar**, **Editar e confirmar** e **Rejeitar** (pede motivo em lista curta: "não foi dito",
"interpretação errada", "não relevante", "outro"). Item confirmado de categoria `necessidade_possivel` ou
`pendencia_operacional` mostra o botão "Criar pendência", que abre um formulário com responsável e prazo
**vazios**: o humano preenche. Atalhos de teclado (C, E, R) ajudam a validar rápido.

## Textos (PT-BR)

- Use "você" e frases curtas. Diga o próximo passo concreto ("Leve seus exames anteriores").
- Prefira linguagem neutra em gênero no texto padrão ("Você tem apoio em cada etapa"). Use concordância de
  gênero só se `forma_tratamento` estiver preenchida.
- Sem jargão no app do paciente: "exame de sangue", não "hemograma completo com plaquetas", a menos que o
  nome venha da equipe.
- Nada de promessa: nunca escreva "monitoramos você 24 h", "resposta imediata" ou "seu tratamento vai ser
  mais rápido".
- Nada de alarme: em vez de "ALERTA: sintoma grave", na equipe use "Alerta aberto · responder até 14h". O
  paciente não vê alerta.

| Evite | Prefira |
|---|---|
| "Erro 500" | "Não conseguimos carregar agora. Tente de novo em instantes." |
| "Seu médico foi notificado." | "Sua equipe vai ver sua atualização conforme o combinado com o serviço." |
| "A IA identificou que você precisa de avaliação de fertilidade." | (o paciente só vê a etapa já validada) "Avaliação de fertilidade · Em andamento" |
| "Progresso do tratamento: 65%" | "65% · Etapas cadastradas concluídas" |

## Acessibilidade (WCAG 2.2 AA)

- Fonte base de 18 px no app do paciente e 14–16 px no Care. Respeite o zoom do sistema; nada de altura fixa
  que corte texto.
- Alvo de toque ≥ 44×44 px. Contraste ≥ 4,5:1 para texto.
- Estado nunca só por cor (etapas, selos, vencida).
- Escala de bem-estar como `radiogroup` com rótulos; gráfico com resumo textual ("Últimos 7 dias: 4 × Bem,
  2 × Mal").
- `prefers-reduced-motion` respeitado. Foco visível. Navegação completa por teclado no Care.

## Estados de toda tela

Carregando (skeleton, não spinner infinito), vazio (texto que orienta: "Nenhuma pendência aberta"), erro
(com "tentar de novo") e offline no app do paciente (mostra o último dado em cache com "atualizado em…" e
deixa o check-in na fila de envio).

## Modo demo

Em `DEMO_MODE`, uma barra discreta no topo permite trocar de usuário (Médico · Navegação · Paciente) e
resetar os dados. Isso deixa a demo fluir sem login entre as telas (ver `oncoflow-demo-hackathon`). A barra não
existe fora do modo demo.

# Modelo de domínio do OncoFlow

Campos essenciais de cada tabela. Todas têm `id uuid PK`, `criado_em timestamptz` e `atualizado_em timestamptz`.
O tipo `ref` indica chave estrangeira.

## Pessoas e acesso

**usuario** — `nome`, `email` (único), `senha_hash` (bcrypt), `papel` enum(`paciente`, `medico`, `enfermagem`,
`navegacao`, `admin_demo`), `ativo`, `paciente_id ref paciente` (só quando papel = paciente).

**paciente** — `nome_exibicao` (fictício no MVP), `forma_tratamento` (opcional; o padrão é linguagem neutra),
`data_nascimento` (opcional; minimização: só se a funcionalidade precisar), `linha_cuidado` (ex.:
`mama`), `navegador_responsavel_id ref usuario`, `medico_responsavel_id ref usuario`.

**vinculo_equipe** — `paciente_id`, `usuario_id`, `funcao`. Define quem da equipe "acompanha" o paciente.
Profissional sem vínculo não lê relato nem transcrição desse paciente.

## Jornada

**etapa_jornada** — `paciente_id`, `titulo` (linguagem do paciente), `descricao_paciente` (explicação simples
do próximo passo), `servico_responsavel`, `ordem`, `estado` enum(`futura`, `aguardando`, `proxima`,
`em_andamento`, `concluida`, `cancelada`), `data_prevista`, `concluida_em`, `origem` enum(`manual`,
`item_extraido`), `item_extraido_id ref` (quando veio da IA validada), `visivel_paciente bool`.

**compromisso** (agenda simulada) — `paciente_id`, `etapa_id ref` (opcional), `tipo` enum(`consulta`, `exame`,
`procedimento`, `outro`), `titulo`, `inicio timestamptz`, `local`, `instrucoes_preparo`, `origem`
enum(`simulado`, `integracao`). No MVP é sempre `simulado`.

**pendencia** — `paciente_id`, `etapa_id ref` (opcional), `tipo` enum(`exame`, `consulta`, `autorizacao`,
`encaminhamento`, `outro`), `descricao`, `responsavel_usuario_id ref` ou `responsavel_papel`, `prazo
timestamptz` (obrigatório), `estado` enum(`aberta`, `em_andamento`, `concluida`, `cancelada`),
`motivo_cancelamento`, `concluida_em`, `origem` enum(`manual`, `item_extraido`), `item_extraido_id ref`.
Vencida é calculada: `estado in (aberta, em_andamento) and prazo < now()`.

## Consulta e IA

**consulta** — `paciente_id`, `medico_id`, `inicio`, `fim`, `consentimento_audio_id ref` (nulo = sem gravação).

**segmento_transcricao** — `consulta_id`, `ordem`, `interlocutor` enum(`medico`, `paciente`, `acompanhante`,
`nao_identificado`), `texto`, `inicio_ms`, `fim_ms`. Este é o nível da **fala literal**.

**item_extraido** — `consulta_id`, `categoria` enum(`sintoma_relatado`, `preferencia`, `preocupacao`,
`necessidade_possivel`, `pendencia_operacional`, `duvida_paciente`), `tipo` enum(`dado_extraido`,
`hipotese_ia`), `texto_ia` (imutável), `texto_validado`, `status` enum(`pendente_validacao`, `confirmado`,
`rejeitado`), `motivo_rejeicao`, `validado_por ref usuario`, `validado_em`, `modelo_ia`, `versao_prompt`.

**evidencia_item** — `item_id`, `segmento_id`, `citacao` (substring exata do segmento, verificada no backend).
Um item sem evidência válida não é gravado.

**resumo_consulta** — `consulta_id`, `secoes jsonb` (cada frase com `segmento_ids`), `estado`
enum(`rascunho_ia`, `em_revisao`, `aprovado`), `aprovado_por`, `aprovado_em`, `modelo_ia`, `versao_prompt`.

## Bem-estar e alertas

**checkin** — `paciente_id`, `escala` enum(`muito_bem`, `bem`, `mais_ou_menos`, `mal`, `muito_mal`),
`relato_livre` (opcional), `escalas_especificas jsonb` (só as que o serviço habilitar: cansaço, dor, náusea…),
`substitui_id ref checkin` (correção), `enviado_em`. Linha imutável.

**regra_alerta** — `nome`, `descricao`, `condicao jsonb` (DSL simples: ex. `{"escala_em": ["muito_mal"]}` ou
`{"piora_consecutiva": 3}`), `papel_responsavel`, `prazo_resposta_horas`, `ativa`, `exemplo bool`.

**alerta** — `paciente_id`, `checkin_id ref`, `regra_id ref`, `estado` enum(`aberto`, `em_revisao`,
`resolvido`), `responsavel_papel`, `prazo_resposta timestamptz`, `desfecho`, `nota_resolucao`,
`resolvido_por`, `resolvido_em`.

## Assistente

**faq_aprovada** — `pergunta_canonica`, `variacoes text[]`, `resposta`, `aprovada_por`, `ativa`.

**interacao_assistente** — `paciente_id`, `pergunta`, `intencao` enum(`logistica`, `faq`, `clinica`,
`urgencia`, `desconhecida`), `resposta`, `fontes jsonb` (ids de etapa, compromisso ou FAQ usados),
`encaminhada_equipe bool`.

## Governança

**consentimento** — `paciente_id`, `finalidade` enum(`gravacao_audio_consulta`, `checkin`, `assistente`,
`compartilhamento_equipe`), `versao_termo`, `estado` enum(`ativo`, `revogado`), `concedido_em`, `revogado_em`.

**evento_auditoria** (somente inserção; sem UPDATE/DELETE, garantido por permissão no banco) — `ator_id`,
`ator_papel`, `acao` (`ler`, `criar`, `transicionar`, `validar`, `rejeitar`, `exportar`, `revogar`),
`recurso`, `recurso_id`, `paciente_id`, `antes jsonb`, `depois jsonb`, `motivo`, `ocorrido_em`.
Nunca grave o texto de transcrição ou de relato em `antes`/`depois`; registre só ids e estados.

**notificacao** (outbox) — `destinatario_id`, `canal` enum(`app`, `email_simulado`), `modelo`, `dados jsonb`,
`estado` enum(`pendente`, `enviada`, `falhou`), `tentativas`. Notificação ao paciente nunca leva conteúdo
clínico, só "há uma atualização na sua jornada".

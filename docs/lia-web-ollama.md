# Lia no navegador com Ollama local

A implementação anterior do app completo só tinha provedor nativo Android. O botão de voz ficava desabilitado no navegador e pedidos digitados fora do fluxo de sintomas chamavam `requireAndroid()`. A conexão app-equipe não conectava a Lia ao modelo.

## Caminho implementado

- Comandos explícitos como “leia minha agenda” usam a ponte de ações do próprio app e seus dados autorizados.
- Outros pedidos do paciente conectado criam um turno limitado e vinculado ao paciente e à sessão autenticada. O turno dura três minutos. Fila e resultados vivem no snapshot Supabase existente; não se mantém transação aberta durante a inferência.
- `platform/lia-ollama-worker.mjs` busca os turnos por HTTPS e autentica com `ONCOFLOW_LIA_WORKER_TOKEN`, variável Sensitive do preview, nunca entregue ao navegador. O processo chama apenas `127.0.0.1:11434` e o modelo `llama3.1:8b`. Nenhuma porta de entrada do computador é aberta.
- O modelo classifica pedidos e propõe uma ação estruturada. Texto livre do modelo não é usado como orientação clínica nem como recibo. O app valida a ação, o recurso e a sessão; as respostas vêm da ferramenta real. Escritas exigem confirmação e mantêm idempotência no fluxo existente.
- A voz web usa SpeechRecognition/webkitSpeechRecognition e speechSynthesis quando disponíveis. É uma fala por turno, com pausa e nova ativação para a próxima mensagem. O navegador pode processar áudio com seu fornecedor; o consentimento web é separado do Android. Sem suporte ou permissão, a digitação permanece disponível. Não equivale ao modo de voz contínua Android.

## Operação da demonstração

A configuração local fica em `.env.lia-worker.local`, ignorada pelo Git. Contém o token do worker, o modelo e `ONCOFLOW_LIA_DEPLOYMENT` com o link temporário protegido do preview. Nunca copie seu conteúdo para logs, commits ou chat.

Execute na raiz: `node --env-file=.env.lia-worker.local platform/lia-ollama-worker.mjs`. O Ollama e o computador precisam estar ligados. O link de acesso protegido expira; ao trocar o preview, atualize somente a URL de configuração local e reinicie o processo. Não desabilite a proteção do Vercel. Para parar a ponte, encerre o processo worker; nenhum encaminhamento de porta permanece aberto.

O worker tem acesso a pedidos e recursos autorizados desta demonstração fictícia, não a planos internos, barreiras ou notas da equipe. Há limite de fila, prazo, lease de execução e exclusão de turnos expirados. Não registra texto de prompts ou respostas nos logs. Os testes `server/liaRelay.test.ts`, `patient-app/tests/unit/webCommands.test.ts` e `patient-app/tests/e2e/lia-web.spec.ts` cobrem autorização, sessão, histórico durável do turno, comandos, confirmação e fala simulada. A recepção de áudio real exige suporte e permissão no aparelho do usuário.

Isso ainda não é infraestrutura clínica: a API completa usa identidade de demonstração. Integração permanente, autenticação real, disponibilidade e governança precisam ser concluídas antes de dados reais.

Validação publicada em 4/11/2026: a pergunta livre sobre o próximo compromisso foi classificada pelo Llama local e retornou a agenda autorizada, sem gerar pedido de contato. O modelo personalizado inicialmente escolheu uma ferramenta inadequada; seu pedido foi cancelado sem execução. O modelo-base instalado, com contrato JSON estruturado e exemplos de roteamento, passou no mesmo fluxo. Os 83 testes de navegador, 324 unitários e 40 de API passaram. Voz com fala simulada passou; permissão e captura real dependem do aparelho.

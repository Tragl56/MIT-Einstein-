# Migração da Lia para Llama via Ollama

**Data:** 4 de novembro de 2026
**Situação:** o chat Android está configurado para `onco-llama3.1:latest` via Ollama. A chamada real pelo app ainda requer validação no emulador/dispositivo.

## O que existe hoje

O app `patient-app/` usa um plugin nativo Android em `android/app/src/main/java/br/com/oncoflow/paciente/LiaProviderPlugin.java`:

- Conversação atual: `POST {OLLAMA_BASE_URL}/api/chat`, usando `OLLAMA_MODEL` (padrão `onco-llama3.1:latest`). Solicita JSON schema com `intent`, `text` e `action`, depois valida esses campos no app.
- Áudio gravado: `POST https://api.openai.com/v1/audio/transcriptions`, usando `OPENAI_STT_MODEL`.
- Voz em tempo real: o plugin cria credencial temporária para uma sessão OpenAI em `createTranscriptionSession`; `src/features/voice/realtimeTranscription.ts` conecta o WebRTC a `https://api.openai.com/v1/realtime/calls`.
- Síntese: ElevenLabs, independente da escolha do LLM.
- O Gradle lê as chaves do `.env` e as incorpora nos campos `BuildConfig` do APK. O README descreve isso como build privado de apresentação; chaves embutidas podem ser extraídas.

A demo web na raiz, por outro lado, usa regras locais para a Lia e Gemini somente para transcrição de voz. A arquitetura `backend/` + `frontend/` ainda não oferece um gateway Llama para este app.

## O que “migrar para Llama” cobre

Llama é o modelo de linguagem. Uma troca de modelo para conversa não substitui automaticamente STT (reconhecimento de fala), conexão WebRTC/transcrição em tempo real ou TTS (voz sintetizada). Assim, a migração pode ser feita em duas etapas:

1. **LLM de texto (implementado):** a geração no `chat` usa Ollama. STT e TTS continuam separados. Essa configuração ainda envia áudio de demonstração para o provedor de STT OpenAI; ela não atende uma meta de retirar todos os dados da OpenAI.
2. **Migração completa de voz/provedores:** selecionar STT/TTS locais ou aprovados e redesenhar o transporte de voz em tempo real. A rota Realtime atual é específica da OpenAI; trocar o LLM não a substitui.

## Arquitetura sugerida

Para o piloto, colocar Ollama atrás de um serviço/gateway privado acessível ao app e à equipe. O Android chama uma API do OncoFlow autenticada; somente o gateway pode acessar Ollama. Não expor `11434` diretamente à internet, nem embutir chave de inferência no APK. O endereço `localhost` no Android aponta para o próprio telefone, não para o computador host. Para desenvolvimento no mesmo computador, o emulador pode ter um alias de loopback específico, mas isso é configuração apenas de desenvolvimento, não arquitetura de implantação.

```text
App Android ── HTTPS + sessão/autorização ──> Gateway OncoFlow ── rede privada ──> Ollama
      │                                         │
      └── valida ação local / pede confirmação  └── valida saída, limites, logs sem conteúdo
```

O gateway deve validar a identidade e o escopo do paciente no servidor, limitar tamanho/tempo de entrada e saída, aplicar rate limit, evitar registrar prompt/áudio e retornar apenas o contrato permitido. Usar criptografia em trânsito; controlar atualização/tag de modelo, acesso administrativo e retenção. Até existir governança aprovada, usar somente dados fictícios.

No desenvolvimento, o adaptador nativo Android envia conversa a `/api/chat` e solicita o contrato de JSON schema. Para piloto, substituir o acesso direto por uma interface de provedor no gateway privado (`LlmProvider`) com autenticação e autorização por instituição/paciente; só o gateway deve alcançar Ollama. Essa adaptação direta de demo não presume equivalência com a API OpenAI Responses.

## Contrato e barreiras que devem permanecer

- Validar `intent` contra a enumeração atual: `agenda`, `journey`, `documents`, `contact`, `reschedule`, `checkin`, `clarify`, `safety`, `other`.
- Validar a ação por lista permitida, enums, IDs presentes no contexto autorizado, limites e campos estritos. Resposta inválida, truncada ou inesperada deve falhar fechada, sem executar ação.
- A aplicação executa a ação depois de validar; o modelo somente propõe. Pedidos de contato, reagendamento e registros que exigem confirmação continuam pedindo confirmação local.
- Respostas `safety`/`clarify` não executam ação; texto de segurança continua sob controle do app/serviço e não pode depender exclusivamente do modelo.
- Rejeitar execução de código, ferramentas arbitrárias, acesso de rede por instrução do modelo e qualquer ação de diagnóstico, prescrição ou decisão de prioridade clínica.
- Manter limites atuais de contexto, cancelamento, idioma, escopo do paciente, tratamento de erros e limpeza de resultados atrasados.

## Lacunas e pré-requisitos para implementar

1. O Ollama local contém `onco-llama3.1:latest` e `llama3.1:8b`; a configuração seleciona o primeiro. O serviço Ollama precisa estar ativo durante a execução do app.
2. O padrão de desenvolvimento para Android Emulator é `http://10.0.2.2:11434`, alias do computador host. Um telefone físico não usa esse alias; configure `OLLAMA_BASE_URL` para um gateway ou endereço alcançável. Não exponha a porta 11434 à internet nem use esse acesso HTTP sem proteção em piloto/produção.
3. Verificar RAM/VRAM, latência concorrente, tamanho de contexto e capacidade do modelo escolhido para português brasileiro, inglês, JSON estruturado e seguimento das restrições da Lia.
4. Definir se STT/TTS também precisam deixar OpenAI/ElevenLabs. A troca feita é para o LLM de conversa; `gpt-4o-mini-transcribe` e Realtime são componentes de fala diferentes e continuam usando OpenAI.
5. O chat foi alterado para o endpoint Ollama `/api/chat`, com JSON schema e validação local. STT/Realtime continuam na OpenAI, TTS continua na ElevenLabs; as chaves desses fluxos permanecem no APK nesta demo.
6. Executar conjunto de avaliação com fixtures, incluindo negação, sintomas passados/de terceiros, prompt injection, ação inválida, IDs fora do perfil, idioma, recusa de segurança, resposta incompleta e cancelamento.

## Critério para declarar concluído

- Modelo e runtime confirmados por tag/digest; endpoint não exposto publicamente.
- Para piloto, o app deve apontar apenas para gateway autenticado e não conter credencial reutilizável de provedor.
- Todas as respostas são validadas no servidor e cliente; casos inválidos falham sem ação.
- Avaliações funcional, adversarial, de latência, capacidade e qualidade linguística registradas com versão/tag do modelo.
- Documentação e interface identificam provedores reais; STT/TTS descritos separadamente do LLM.
- Revisão de segurança e privacidade concluída antes de qualquer uso com dados reais.

---
name: migracao-llama
description: Inspeciona ou implementa a migração da conversa do OncoFlow para Llama/Ollama preservando segurança e validação.
---

# Agente: Migração de LLM para Llama

## Objetivo
Substituir chamadas de conversação GPT-4o por um modelo Llama que o usuário já possui, preservando os contratos da Lia e as barreiras de segurança.

## Instruções
- Leia `patient-app/`, `server/`, `.env.example` e os documentos de provedores. Localize cada chamada de geração e diferencie-a de STT/TTS.
- Confirme o modelo, runtime, endpoint, autenticação, formato de saída e acessibilidade a partir do ambiente; nunca assuma que a presença do executável Ollama significa que há servidor ou modelo carregado.
- Use configuração por ambiente e um adaptador de provedor; não exponha chaves no APK ou no cliente. Não envie dados de saúde reais para provedores externos.
- Preserve JSON estruturado, validação local de ações, limites de contexto, cancelamento e respostas de segurança. Llama é LLM, não substitui transcrição ou síntese.
- Não declare migração concluída até compilar e validar chamadas contra o endpoint real. Se endpoint/modelo não estiverem disponíveis, registre bloqueio e os passos de configuração.

## Entrega
Atualize `docs/migracao-llama.md`; implemente somente quando os parâmetros do modelo/servidor estiverem confirmados e as mudanças puderem ser testadas sem credenciais expostas.

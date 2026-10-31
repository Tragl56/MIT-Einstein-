# OncoFlow AI

Plataforma de coordenação da jornada oncológica (MVP para o MIT Hacking Medicine, trilha de Oncologia).
Três superfícies: **OncoFlow Care** (painel da equipe: médicos, enfermagem, navegação), **OncoFlow Patient**
(PWA do paciente) e **OncoFlow Intelligence** (camada de IA com revisão humana). Fonte do conceito: documento
"OncoFlow AI — Proposta de produto" (10 páginas). As funcionalidades são propostas para validação, não
requisitos confirmados pelo hospital.

Stack: React + TypeScript (Vite, PWA) · Python + FastAPI · PostgreSQL · LLM (Claude) para extração e resumo ·
speech-to-text atrás de uma interface. Detalhes em `.claude/skills/oncoflow-arquitetura`.

## Regras que nunca se quebram

1. **A IA sugere, o humano valida.** Nenhuma saída de IA (resumo, item extraído, sugestão de encaminhamento)
   chega ao paciente, vira pendência ou entra em registro sem status `confirmado` dado por um profissional.
2. **Proveniência explícita.** Todo conteúdo tem um destes tipos, visível na interface e no banco: fala literal,
   dado extraído, hipótese da IA ou informação confirmada. Hipótese nunca é gravada nem exibida como fato.
3. **A IA não diagnostica, não prescreve e não prioriza condutas clínicas.** Ela também não responde dúvida
   clínica do paciente: encaminha à equipe.
4. **Check-in não é emergência.** Toda tela de check-in e do assistente diz isso e mostra as instruções de
   urgência aprovadas pelo hospital. Alertas seguem regras configuradas pelo serviço, com responsável e prazo,
   e nunca limiares clínicos inventados no código.
5. **Só dados fictícios.** Nenhum dado real de paciente no repositório, nos seeds, nos prompts, nos logs ou nas
   capturas de tela. Gravação de áudio depende de consentimento ativo e pode ser interrompida a qualquer momento.
6. **Não presumir integrações.** Prontuário, agenda, laboratório e autorização são simulados até haver validação
   técnica e institucional. O OncoFlow complementa o prontuário, não o substitui.
7. **Não prometer desfecho.** Indicadores medem o processo (tempo entre etapas, pendências vencidas,
   check-ins revisados), não prometem redução de tempo ou melhora clínica.

## Qual skill usar

| Tarefa | Skill |
|---|---|
| Backend, banco, API, modelo de domínio, máquinas de estado, indicadores, testes | `oncoflow-arquitetura` |
| Transcrição, extração por LLM, resumo de consulta, assistente do paciente, avaliações da IA | `oncoflow-copiloto-ia` |
| Permissões, consentimento, auditoria, LGPD, revisão antes de merge | `oncoflow-seguranca-lgpd` |
| Telas do app do paciente e do painel Care, textos, acessibilidade | `oncoflow-experiencia` |
| Dados de demonstração, roteiro de 3–5 min, pitch, ensaio | `oncoflow-demo-hackathon` |

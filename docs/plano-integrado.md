# Plano integrado do OncoFlow

**Atualizado:** 4 de novembro de 2026
**Status:** síntese das quatro frentes; migração Llama configurada para desenvolvimento local. Uso com dados reais continua bloqueado por lacunas de segurança e validação.

## Leitura consolidada

O OncoFlow está em estágio de MVP/demonstração, com um fluxo conectado entre app do paciente e painel profissional, dados fictícios e integrações hospitalares simuladas. Seu diferencial demonstrável é a coordenação rastreável de relatos e pedidos com revisão humana, não a IA isolada nem prontidão clínica/comercial. A arquitetura-alvo FastAPI/PostgreSQL traz fundações em construção, mas não equivale a implantação auditada.

Concorrentes como Navigating Care, Thyme Care e Equicare divulgam navegação, engajamento e/ou ePRO; há espaço para diferenciar a experiência de coordenação simples e transparente para serviços locais, mas isso depende de integração, implantação e medição em piloto. A análise completa está em [analise-comparativa.md](analise-comparativa.md).

## Agentes especializados

Os perfis reutilizáveis estão em `.claude/agents/`:

- `comparativo-mercado.md`: produtos comparáveis, diferenciais e oportunidades.
- `modelo-negocio-saude.md`: receita e caminhos SUS, operadoras e hospitais.
- `migracao-llama.md`: migração de provedor, configuração e validação de segurança.
- `seguranca-cibernetica.md`: threat model e controles priorizados.
- `integrador-oncoflow.md`: síntese das quatro frentes em roadmap verificável.

## Decisões de trabalho

1. **Entrada de mercado:** o relatório recomenda piloto institucional pago com hospital/centro privado ou filantrópico e uma unidade delimitada. A hipótese de receita é implantação + assinatura SaaS por unidade/faixa de pacientes. O SUS é uma rota plausível após evidência e preparação para contratação; operadoras vêm depois de demonstrar valor operacional. Não há preço rentável validado ainda.
2. **Produto:** priorizar fila de navegação com responsável/prazo configuráveis, métricas operacionais auditáveis e integração incremental; não adicionar triagem clínica automática.
3. **IA:** preservar as regras de `CLAUDE.md`: sem diagnóstico, prescrição ou decisão de prioridade clínica; propostas de ação devem continuar validadas pelo app e/ou equipe.
4. **Cibersegurança:** revisão estática encontrou riscos P0 antes de qualquer piloto com dados reais: segredo no APK (para STT/voz), demo ligada na configuração de exemplo, sem rate limit/MFA, lacunas de auditoria e ausência de evidência de TLS/backups/monitoramento. Nenhuma alegação de “melhor do mercado” ou conformidade até fechar controles e validar independentemente.
5. **Llama:** o chat Android agora usa `onco-llama3.1:latest` via Ollama em `OLLAMA_BASE_URL`; o padrão `http://10.0.2.2:11434` serve ao emulador. STT/Realtime ainda usam OpenAI e TTS ElevenLabs. O acesso direto ao Ollama é para desenvolvimento com dados fictícios; produção exige gateway autenticado, TLS e revisão de privacidade. A chamada real ainda precisa ser validada no app.

## Sequência recomendada

| Fase | Entrega | Critério de saída |
|---|---|---|
| 0 — Preparar demo | Agentes e relatórios de mercado, negócio, segurança e Llama | Hipóteses separadas de fatos; riscos e fontes registrados |
| 1 — Validar demo Llama | Iniciar Ollama e confirmar conversa no emulador/dispositivo; validar saída JSON e ações com dados fictícios | Modelo responde via API; ações continuam validadas; transcrição/voz estão claramente descritas |
| 2 — Fechar arquitetura de piloto | Definir gateway LLM/STT/TTS autenticado, remover segredos do APK, fechar riscos P0 de segurança e aprovar privacidade | Gateway em TLS, controle de acesso, auditoria, threat model e critérios de piloto aprovados |
| 3 — Piloto controlado | Um serviço de oncologia parceiro, fluxos limitados e treinamento da equipe | Governança definida, riscos P0 fechados, suporte e métricas operacionais ativos |
| 4 — Evidência e expansão | Comparar adoção, carga de trabalho, tempos e confiabilidade antes/depois | Evidência revisada; integração e modelo de compra replicáveis; canal público/suplementar avaliado com assessoria |

## Dependências em aberto

- Confirmar chamada Llama real pelo app e desempenho/saída do `onco-llama3.1:latest` em português/inglês.
- Arquitetura segura de Ollama para Android físico e piloto; `10.0.2.2` é apenas padrão de emulador.
- Necessidade e permissão institucional para piloto, dados, integração e operação.
- Relatórios: [modelo de negócio](modelo-negocio.md), [segurança cibernética](seguranca-cibernetica.md), [migração Llama](migracao-llama.md), [comparativo de mercado](analise-comparativa.md).

## Regras de segurança do produto

- Demo com dados fictícios até existir governança aprovada para dados reais.
- Separar identificação e autorização por instituição/equipe/finalidade, manter trilha de auditoria e nunca confiar em validação somente no cliente.
- A Lia não monitora emergência. Alertas são hipóteses de fluxo para revisão da equipe.
- Nenhuma capacidade comercial, integração ou resultado é considerado comprovado apenas porque há uma tela, documento ou teste de demonstração.

## Validação técnica — 4 de novembro de 2026

- **Passou:** lint e build da raiz; 24 testes de integração, 2 de painel e 2 de sincronização; `patient-app` typecheck, build, 271 unitários e 71 E2E; instalação limpa pelo lockfile; auditoria npm do app com zero vulnerabilidades; compilação sintática Python; links Markdown locais dos relatórios; chamada fictícia direta ao Ollama retornou resposta em português no schema JSON pedido.
- **E2E do app:** os 71 cenários usam provedores simulados. Eles validam fluxos e interface, mas não executam o plugin Android nativo nem comprovam a conversa real da Lia pelo aparelho.
- **Pendente por ambiente:** testes FastAPI/PostgreSQL (pytest não instalado e daemon Docker/Postgres indisponível); build Android/Gradle (Java/JAVA_HOME ausente); chamada Ollama a partir do Android. A chamada local ao endpoint Ollama foi validada isoladamente.
- **Auditoria de dependências:** `npm audit fix` atualizou dependências transitivas no lockfile do app; `npm ci` limpo instalou e informou zero vulnerabilidades.
- **Achado corrigido:** o E2E de disclosure ainda procurava o nome dos provedores antigos; a asserção foi atualizada para Llama/Ollama e a suíte completa passou novamente.

## Continuação — proteção de respostas da API

- Adicionados cabeçalhos HTTP de defesa em profundidade na API FastAPI: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` restritiva.
- Todas as respostas da API recebem `Cache-Control: no-store`, evitando armazenamento em caches compartilhados de respostas que possam conter dados de saúde.
- Adicionado teste de contrato HTTP para os cabeçalhos. A execução ficou pendente neste ambiente: `pytest` não está instalado e a suíte backend também depende do PostgreSQL de teste.
- Esta proteção não substitui TLS, autenticação/autorização, política de cache do cliente, nem os controles institucionais necessários antes de dados reais.

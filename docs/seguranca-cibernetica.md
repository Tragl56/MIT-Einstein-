# OncoFlow — avaliação de segurança cibernética

**Escopo:** leitura estática do repositório em 4/11/2026. Esta avaliação não executou testes de invasão, análise dinâmica, varredura de dependências nem validação de infraestrutura. O projeto é um MVP de demonstração com dados fictícios e uma arquitetura-alvo ainda em construção; este documento não declara conformidade, certificação ou prontidão clínica.

## Resumo executivo

O OncoFlow já contém boas decisões de desenho: contexto de usuário consultado no banco, separação por papel e instituição, escopo de pacientes por vínculo da equipe, senha com bcrypt, JWT curto (15 minutos por padrão), log de auditoria sem texto clínico, consentimentos modelados e restrição explícita a dados fictícios. Essas são bases úteis para evoluir.

Ainda há gaps impeditivos para uso com dados reais: o `docker-compose.yml` publica Postgres e API em portas do host sem TLS; a configuração de exemplo liga `DEMO_MODE`; a API não tem limitação de tentativas de login; a auditoria não registra todos os acessos de paciente (por exemplo, o início do paciente); o APK da Lia incorpora chaves de fornecedores no `BuildConfig`; e o MVP da raiz mantém estado persistido localmente e aceita payloads de áudio grandes. Não há evidência no repositório de gestão de chaves, criptografia de backups, monitoramento/alerta, resposta a incidentes ou recuperação testada.

**Recomendação:** tratar segurança como condição de entrada do piloto, não como acabamento. Começar em ambiente controlado com dados fictícios; fechar os riscos P0; só então conduzir avaliação de impacto, threat modeling, pentest independente e revisão de contrato/privacidade antes de processar dados de pacientes.

## Inventário observado

| Área | Controle presente | Gaps / observação |
|---|---|---|
| Identidade | Bcrypt; JWT assinado HS256; expiração curta; status, papel e instituição relidos do banco em cada request. | Sem rate limit/lockout observado no login; sem MFA para perfis profissionais; sem refresh/revogação de token por sessão (usuário desativado é bloqueado, mas token roubado segue válido até expirar); política de senha não aparece. |
| Autorização | `contexto_paciente` fixa o paciente ao usuário; equipe busca pacientes por vínculo e mesma instituição; cuidadores bloqueados enquanto delegação granular não existe. | Validar isolamento entre instituições em toda rota futura; RLS no banco ainda não observada; endpoints de escrita e administração são escassos, mas precisam conservar o mesmo padrão. |
| Auditoria | Evento de auditoria append-only com trigger para bloquear UPDATE/DELETE; serviço recomenda IDs/estado, sem conteúdo clínico. A lista Pro registra leitura de dados de saúde. | `inicio_paciente` lê dados pessoais e agenda sem auditoria visível; não se observa ator de serviço, origem, correlação de request, exportação, alertas ou proteção contra administrador de banco que remova trigger/tabela. |
| Dados/consentimento | Modelo de consentimento por finalidade e revogação; fixtures fictícias; texto de auditoria desencoraja conteúdo clínico. | Não há fluxos de direitos do titular, retenção/expurgo, inventário de tratamento, RIPD ou política de backup/restore documentados. Consentimento não substitui análise de base legal. |
| Aplicação/API | CORS configurado para localhost no backend alvo; schemas de resposta limitam dados; limite de JSON de 25 MB no Express. | Compose sobrescreve CORS com origens locais; sem TLS/reverse proxy no exemplo; sem limite de taxa, quotas, política de headers, validação de tipo/tamanho de áudio e limites por usuário; endpoint de saúde da raiz expõe `hasApiKey`. |
| Configuração/infra | `.env` ignorado pelo Git; secrets de exemplo separados; banco em volume Docker; migração de auditoria explícita. | `.env.example` contém `DEMO_MODE=true` e credenciais ilustrativas simples; Compose publica Postgres `5432` e API `8000`; sem TLS, criptografia de volume/backups, secret manager, hardening de container, usuário não-root, pinning de imagem por digest ou evidência de pipeline seguro. |
| IA e app Android | Fluxos de IA limitados por regras de produto; app Android sem backup automático (`allowBackup=false`); acesso de microfone só mediante ação. | O Gradle embute chaves OpenAI/ElevenLabs no APK e chama provedores diretamente; qualquer APK distribuído pode ser inspecionado, expondo credenciais e permitindo abuso/custo. Transcrição envia áudio a terceiro; controles contratuais, retenção e localização devem ser verificados antes de uso real. |
| Operação | `/api/saude` para health check; transcrição não persiste áudio segundo comentário do código. | Sem observabilidade de segurança, alertas, playbooks, inventário de ativos, SBOM/varredura de dependências ou ensaio de restauração identificados no material revisado. |

## Plano priorizado

### P0 — antes de qualquer piloto com dados reais

1. **Desligar demo por padrão e separar configuração por ambiente.** Fazer `.env.example` seguro para produção (`DEMO_MODE=false`), exigir segredo JWT forte e senhas únicas; falhar no startup se segredo de exemplo/curto ou modo demo estiver ligado em ambiente não local. Não reutilizar contas ou dados de apresentação.
2. **Fechar exposição de rede.** Remover publicação direta de `5432` e `8000` em perfil de produção; manter banco em rede privada; publicar somente via gateway TLS com autenticação, limites de requisição e headers seguros. O compose atual deve ser rotulado e documentado como desenvolvimento local.
3. **Retirar segredos do APK.** Mover LLM, transcrição e TTS para backend/BFF autenticado. Credenciais por usuário/tenant, escopo mínimo, rotação e limites de custo; revogar qualquer chave já incorporada em APK compartilhado. Evitar dados identificáveis nos prompts até avaliação de fornecedor e base legal.
4. **Fortalecer autenticação.** Limitar tentativas e velocidade por IP/conta, atrasos progressivos e alertas; MFA para equipe/admin; política de senha e proteção contra credenciais comuns; logout/revogação por sessão e mudança de senha que invalide tokens ativos. Não bloquear indefinidamente como vetor de negação de serviço.
5. **Completar autorização e auditoria.** Auditar leituras/escritas/exportações de dados pessoais em todas as rotas, incluindo paciente; adicionar IDs de correlação, finalidade permitida e resultado; revisar filtros tenant/paciente em cada query; ensaios de acesso cruzado entre pacientes, instituições e papéis. Nunca registrar transcrição, tokens ou áudio em logs.
6. **Minimizar e proteger dados.** Definir controlador/operador, finalidade e base legal por fluxo; completar RIPD, retenção/eliminação, consentimento quando aplicável, canal de titular e contratos com operadores. Criptografar tráfego e dados/backup em repouso com chaves geridas; documentar retenção e localização de cada fornecedor.
7. **Proteções de API.** Tamanho máximo em bytes e formato permitido para áudio, limite por usuário, timeout, quotas, resposta de erro sem detalhes internos, validação de tipos, rate limiting e proteção contra abuso de custo. Fazer o health endpoint retornar apenas estado mínimo e retirar a indicação de existência de chave.

### P1 — preparar operação confiável

- Adotar gestão de vulnerabilidades: lockfiles revisados, atualização automatizada, SCA/SBOM, análise estática e de segredos no CI; corrigir vulnerabilidades antes de release e assinar artefatos.
- Rodar threat modeling por fluxo (login, vínculo, check-in, áudio, exportação, integração), mapeando abuso de IDs, sequestro de conta, ransomware, insider, vazamento por logs e indisponibilidade. Usar OWASP API Security Top 10 como checklist de API.
- Criar monitoração para login anômalo, acesso fora de vínculo, exportação em massa, mudanças de papel, falhas repetidas, alteração de configuração e indisponibilidade; logs centralizados com acesso restrito e retenção definida.
- Escrever e exercitar resposta a incidentes, com responsável, contato do encarregado, isolamento, preservação de evidências, comunicação ao controlador/operador e avaliação do prazo regulatório. Para incidente notificável, ANPD orienta comunicação do controlador à ANPD e titulares em até três dias úteis da ciência, observadas exceções legais e o RCIS.
- Definir RPO/RTO, backups cifrados e imutáveis, restauração em ambiente isolado, continuidade offline e simulado de ransomware. Em saúde, indisponibilidade também pode impactar cuidado e segurança do paciente.
- Separar ambientes e contas de nuvem, princípio do menor privilégio, MFA administrativa, rotação de segredos e trilha de mudanças; container não-root, imagem mínima, filesystem somente leitura quando possível e limites de CPU/memória.
- Exigir revisão de privacidade e segurança dos fornecedores (LLM, STT, TTS, hospedagem), incluindo uso secundário de dados, retenção, suboperadores, região, incidentes e exclusão.

### P2 — evidenciar maturidade antes de escala

- Contratar pentest independente com escopo e dados sintéticos; corrigir achados críticos/altos e repetir validação.
- Avaliar controles contra NIST CSF 2.0 (Govern, Identify, Protect, Detect, Respond, Recover) e manter plano de tratamento de risco com dono, prazo e evidência.
- Definir metas de segurança e privacidade para cada release; revisão periódica de acesso, exercícios de tabletop e treinamento de equipe clínica/operacional.
- Se houver interoperabilidade com sistemas de saúde, desenhar autenticação de serviço, autorização granular, logs e minimização desde o contrato; só declarar padrões ou certificações após avaliação formal.

## Critérios de saída para piloto

- Nenhuma credencial de fornecedor no cliente móvel, repositório ou logs; chaves de produção rotacionáveis e com escopo mínimo.
- DEMO_MODE desligado; ambientes separados; TLS ponta a ponta no perímetro; banco não exposto publicamente.
- Testes negativos de autorização comprovam que um usuário não lê paciente/tenant alheio; cobertura de auditoria validada para leituras, escritas e exportações.
- MFA dos profissionais, mitigação de brute force, monitoramento e processo de revogação funcionando.
- Backups criptografados restaurados em exercício; plano de incidentes e contatos testados.
- RIPD, contratos de operadores, retenção, direitos de titulares e avaliação de fornecedores aprovados pelos responsáveis da instituição.
- Pentest independente sem achados críticos/altos em aberto; aceite formal de risco dos achados restantes.

## Referências oficiais e padrões

- [LGPD — princípios e segurança, Ministério da Saúde](https://www.gov.br/saude/pt-br/acesso-a-informacao/lgpd/principios): dados de saúde são sensíveis; segurança e prevenção exigem medidas técnicas e administrativas.
- [ANPD — perguntas frequentes da LGPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes): registro de operações, base legal, políticas e medidas de segurança.
- [ANPD — Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis): critérios de risco relevante e prazo regulatório de três dias úteis, conforme Resolução CD/ANPD 15/2024.
- [OWASP API Security Top 10](https://owasp.org/projects/api-security-project): riscos de autorização por objeto/função, exposição de propriedades e consumo irrestrito de recursos.
- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework): estrutura de governança e gestão de risco por funções Govern, Identify, Protect, Detect, Respond e Recover.
- [NIST — Health Sector](https://www.nist.gov/itl/smallbusinesscyber/guidance-sector/health-sector): recursos e orientação para segurança cibernética em saúde.

## Limites

Este texto é uma avaliação técnica preliminar do código e das configurações visíveis. Não é parecer jurídico, auditoria certificadora, pentest nem declaração de conformidade LGPD, NIST, OWASP ou requisitos específicos de SUS/operadora/hospital. O risco final depende do ambiente de hospedagem, contratos, fluxos reais, perfis de acesso e operação do controlador.

## Controles implementados no servidor da demo — 5/11/2026

A avaliação de 4/11 olhou sobretudo a arquitetura-alvo (FastAPI). O que de fato roda localmente e é publicado é o servidor Express da demo (`server.ts`, `server/api.ts`). Nele, a identidade ainda é de demonstração: a equipe escolhe o usuário pelo cabeçalho `x-demo-usuario` e o paciente usa a sessão fixa `demo-maria`. Como o servidor escutava em todas as interfaces, qualquer aparelho no mesmo Wi-Fi podia ler os pacientes fictícios, trocar de perfil ou zerar a demo. Os controles abaixo reduzem essa exposição; **não substituem autenticação real**.

| Risco | Controle | Onde | Evidência |
|---|---|---|---|
| Exposição na rede (Wi-Fi do evento) | O servidor local escuta só em `127.0.0.1`. A rede só é aberta com `ONCOFLOW_REDE_LOCAL=true`, e o terminal avisa o que fica exposto. | `server/seguranca.ts` (`hostDoServidor`), `server.ts`, `platform/start.mjs` | Teste unitário; pelo IP do Wi-Fi, sem a variável, a conexão é recusada. |
| Identidade de demo usada por outro aparelho | Mesmo com a rede aberta, `/api/pro/*`, `/api/demo/*` (exceto ler o idioma), `/api/paciente/*` e `/api/transcrever-audio` só respondem ao próprio computador (403 pela rede). O app do celular segue pela API móvel, que tem pareamento e sessão própria. | `protegerRotasLocais` em `server/api.ts` (fora da nuvem) | Teste unitário por rota; teste real em porta separada: pela rede, Pro, usuários e sessão fixa → 403; app e saúde → 200; localmente, Pro → 200. |
| Abuso de custo na transcrição | Tipos de áudio permitidos (`audio/webm`, `ogg`, `mp4`, `mpeg`, `wav`, `aac`), base64 válido, no máximo 8 MB de áudio (antes 25 MB para qualquer conteúdo) e 12 transcrições por minuto por origem. | `validarAudio` e `server.ts` | Testes de tipo (415), tamanho (413) e codificação (400). |
| Força bruta e repetição | Reset/troca de idioma da demo: 20 por minuto; mensagens à Lia por texto: 30 por minuto; demais rotas: 1.200 por minuto por aparelho da rede. Respostas 429 com `Retry-After`. | `limitarTaxa` em `server/api.ts` | Teste HTTP do reset (21º pedido → 429). |
| Clickjacking, sniffing e vazamento de referência | `X-Frame-Options: SAMEORIGIN`, CSP `frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (microfone e câmera só na própria página), `Cross-Origin-Opener-Policy` e `Cache-Control: no-store` na API. Vale também na nuvem. | `cabecalhosSeguranca` | Teste HTTP dos cabeçalhos. |
| Revelar configuração de fornecedor | Removida a rota `/api/health` duplicada que informava se havia chave do Gemini; a rota ativa não expõe isso. | `server.ts` | Teste confirma ausência de `hasApiKey`. |

**Escolhas e limites.** O limite geral não se aplica a este computador (o app do paciente faz cerca de 230 requisições por minuto ao abrir, e várias abas somariam) nem à nuvem (todos chegariam pelo mesmo proxy; lá vale a proteção do provedor e os limites da API móvel). A restrição por endereço usa o socket, não `X-Forwarded-For`, porque o servidor local não fica atrás de proxy. Os limites ficam em memória e valem para um único processo. A CSP não restringe scripts, para não quebrar o modo de desenvolvimento do Vite; uma CSP completa fica para a versão de produção.

**Continua em aberto para o piloto (P0):** autenticação real de equipe e paciente no lugar de `x-demo-usuario` e `demo-maria`; a entrada automática (`ONCOFLOW_DEMO_AUTO_CONNECT`) emite sessões de pacientes fictícios a quem alcança o servidor e deve ficar desligada fora da demo; chaves de fornecedor ainda embutidas no APK; os demais itens P0 da seção anterior.

# OncoFlow — hipótese de negócio e entrada no mercado

**Data de pesquisa: 4 nov. 2026.** Este documento é uma hipótese comercial para validação; não é projeção financeira, parecer jurídico/regulatório, nem promessa de resultado clínico.

## Resumo executivo

O OncoFlow é mais vendável hoje como **software B2B de coordenação da jornada oncológica**, contratado por um hospital/centro de oncologia ou grupo de clínicas, com portal da equipe e app para pacientes/cuidadores. A cobrança deve ser institucional — implantação + assinatura por unidade e faixa de pacientes ativos — e não diretamente ao paciente. O caso de uso inicial deve ficar em comunicação, organização de agenda/jornada, encaminhamento de solicitações e revisão humana de relatos, sem diagnóstico, prescrição ou decisão de prioridade.

**Primeiro comprador recomendado:** instituição privada de oncologia de porte médio (ou hospital filantrópico com operação oncológica), começando por uma unidade e um fluxo delimitado. Ela permite negociar um piloto com menos camadas que uma operadora ou compra pública, tem usuários de equipe e pacientes no mesmo processo, e pode fornecer patrocínio clínico-operacional. Buscar um parceiro que atenda SUS também testa desde cedo as necessidades de acesso e continuidade, mas não presumir que isso facilite a contratação pública.

**SUS é uma rota plausível, porém posterior:** há alinhamento de problema com a Política Nacional de Prevenção e Controle do Câncer e o Programa Nacional de Navegação, instituídos pela Lei 14.758/2023. A Lei 15.385/2026 alterou essa política para incluir princípios sobre desenvolvimento e regulação de novas tecnologias contra o câncer. Isso não equivale a aprovação, adoção, classificação regulatória ou financiamento do OncoFlow. A entrada prática pode ser piloto com CACON/UNACON ou hospital filantrópico conveniado, com autorização institucional, e depois processo formal de compra/solução inovadora. [Lei 14.758/2023](https://legislacao.presidencia.gov.br/atos/?ano=2023&ato=00aMzYE90MZpWTcc5&data=19%2F12%2F2023&numero=14758&tipo=LEI), [Lei 15.385/2026 — Senado Federal](https://legis.senado.gov.br/norma/43040606/publicacao/43040675), [Ministério da Saúde — legislação oncológica](https://www.gov.br/saude/pt-br/composicao/saes/atencao-ao-cancer/legislacao)

## O que o repositório já sustenta

- Experiência profissional e do paciente, Lia textual/voz e fluxo de comunicação; app Android e painel podem compartilhar a API de demonstração.
- Agenda/jornada, pedidos de contato, mensagens e check-ins, consentimentos e auditoria aparecem em diferentes estágios no código.
- Regras de produto já restringem a IA: não diagnosticar/prescrever, não transformar hipótese em fato, pedir confirmação de ações e manter revisão humana.
- Há documentação de integração hospitalar com escopo de pareamento, idempotência e contratos de API.

**Limite decisivo para a venda:** o README identifica a aplicação raiz como MVP com estado local/compartilhado, exclusivamente dados fictícios; a arquitetura-alvo FastAPI/PostgreSQL/autenticação está em construção. A própria documentação da integração diz que o login do Pro ainda é fictício, não há integração FHIR/RNDS de produção e a demonstração não é operação clínica real. Portanto, hoje o que se pode vender é uma demonstração/projeto-piloto de desenvolvimento, não uma plataforma pronta para tratar dados assistenciais reais.

## Segmentos e ordem de entrada

| Segmento | Aderência | Quem compra / motivo | Barreira dominante | Prioridade |
|---|---|---|---|---|
| Hospital privado ou grupo de oncologia | Alta | Diretoria de oncologia/operações, inovação ou TI; equipes e pacientes participam da mesma jornada | Segurança, integração com prontuário, compras internas, prova de valor | **1 — piloto** |
| Clínica oncológica independente | Alta para comunicação/jornada | Sócio-diretor/gestor; decisão potencialmente mais curta e implantação mais simples | Capacidade de pagamento, equipe pequena, integração/rotina | **1B — alternativa** |
| Hospital filantrópico/CACON/UNACON que atende SUS | Alta, especialmente navegação | Direção hospitalar e gestor local; possibilidade de piloto em serviço já organizado | Orçamento vinculado, contratação e governança público-privada | **2 — piloto com patrocinador** |
| Secretaria/gestor público do SUS | Potencial alto, escala alta | Secretaria municipal/estadual ou Ministério, conforme responsabilidade e compra | Licitação, planejamento, segurança, evidência, suporte e interoperabilidade | **3 — depois de evidência e prontidão** |
| Operadora/convênio | Potencial, hipótese ainda não provada | Inovação, gestão de saúde/população, rede credenciada | Exige caso econômico e prova de impacto em utilização/custo; integração com prestadores | **4 — após pilotos** |
| Venda direta ao paciente | Baixa como rota inicial | Paciente/família | Pagamento fragmentado, acessibilidade e risco de transferir custo de coordenação ao usuário | Não priorizar |

A saúde suplementar tem escala: a ANS reportou 53,1 milhões de beneficiários médico-hospitalares no segundo trimestre de 2026. Esse número indica universo potencial, não demanda endereçável nem previsão de adesão. Operadoras podem interessar-se depois de dados locais sobre adesão de uso, carga de navegação e custos operacionais. [ANS — dados gerais](https://www.gov.br/ans/pt-br/acesso-a-informacao/perfil-do-setor/dados-gerais)

## Oferta e modelo de receita

### Pacote inicial

1. **Implantação paga:** mapeamento do fluxo, configuração de unidade/equipe, treinamento, importação controlada de agenda/jornada e plano de suporte.
2. **Assinatura SaaS institucional:** preço mensal por unidade com uma franquia de pacientes ativos; faixas acima da franquia. Um valor-base por instituição protege a receita quando o volume flutua e o componente por volume acompanha custo de suporte/uso.
3. **Integrações e serviços opcionais:** conectores para prontuário/SSO, migração, relatórios e suporte ampliado como escopo separado, com preço de implantação/manutenção. Não cobrar por desfecho clínico antes de definir e validar métricas e atribuição.
4. **Piloto pago de 12–16 semanas:** unidade, fluxo e teto de usuários definidos; metas operacionais e critérios de continuidade acordados antes de iniciar. Uma etapa curta de descoberta pode ser paga e abatida parcialmente de uma contratação anual.

### Preço: como chegar ao número sem inventar benchmark

Não há neste projeto pesquisa de disposição a pagar nem cotação comparável suficiente para fixar preço de mercado. Para começar, calcule o preço mínimo mensal assim:

`custo mensal de nuvem + suporte alocado + ferramentas/IA + segurança/compliance + amortização da implantação + margem bruta-alvo`.

Depois, conduza entrevistas com 8–12 compradores e proponha três faixas de volume (pequena unidade, unidade média, grupo). Use propostas reais de piloto e registre objeções. **Não trate os valores como comprovados** até haver contratos ou sinais de compra. Evite preço por usuário profissional individual, pois incentiva compartilhamento de contas; precifique organização/unidade e pacientes ativos em faixas, com limites de uso transparentes.

### Custos a controlar

- Engenharia e manutenção de APIs, app, painel, integrações e disponibilidade.
- Implantação, treinamento, suporte e atualização de processos de cada instituição.
- Hospedagem, backups, observabilidade e resposta a incidentes.
- Segurança e privacidade: IAM/SSO, gestão de chaves, pentest, auditorias, adequação contratual e governança de fornecedores.
- Mensageria, STT/TTS/LLM e outros serviços por uso; limitar contexto, chamadas e tempo de áudio, escolher modelo e fornecedor conforme preço/qualidade e acordos de tratamento.
- Jurídico/regulatório e avaliações de enquadramento do software conforme as alegações e funções comercializadas.

Para ser rentável, o produto precisa de implantação repetível, baixo custo marginal de uso, integrações reutilizáveis, onboarding por templates e retenção alta. A principal ameaça de margem é virar consultoria sob medida por hospital; cada integração customizada precisa de preço, escopo e manutenção próprios.

## Plano de validação comercial

1. **Descoberta (2–4 semanas):** entrevistar navegadores, enfermagem, pacientes, TI, DPO/encarregado, compras e gestores em 3–5 organizações. Medir processo atual de pedidos, agenda, tarefas não concluídas e retrabalho; não coletar prontuários para essa etapa.
2. **Escolher um fluxo:** ex.: solicitações não urgentes e retorno da equipe, com responsabilidade e status claros. Não começar com triagem automatizada nem promessa de reduzir reinternação/complicações.
3. **Desenhar o piloto:** uma unidade, 1–2 equipes, 12–16 semanas, população e canais definidos, implantação paga e critérios de sucesso. Iniciar em ambiente de teste; dados reais só após segurança, contratos, consentimentos/base legal e aprovação institucional.
4. **Integração:** começar com entrada assistida ou importação controlada e exportação auditável; validar requisitos locais. Evoluir conectores conforme comprador. A RNDS é a plataforma oficial de interoperabilidade do Ministério da Saúde; guias usam padrões como FHIR. A documentação do OncoFlow não demonstra integração implementada com RNDS/FHIR/TISS. [RNDS](https://www.gov.br/saude/pt-br/composicao/seidigi/rnds/rnds), [guia de implementação FHIR/RNDS](https://fhir.saude.gov.br/)
5. **Decisão de expansão:** revisão conjunta de segurança, fluxo de trabalho, indicadores, satisfação e custo operacional; expandir somente quando houver patrocinador, orçamento e evidência de uso.

### Indicadores do piloto

- **Ativação:** pacientes elegíveis convidados, pareados, ativados e ativos por semana; abandono e acessibilidade.
- **Operação:** tempo entre pedido e primeira resposta; pedidos pendentes/sem responsável; tarefas concluídas dentro do prazo definido pela própria instituição; mensagens duplicadas; horas de navegação por paciente.
- **Experiência:** satisfação curta de pacientes/cuidadores e equipe, taxa de resposta, reclamações e motivos de não uso.
- **Segurança/qualidade:** incidentes, acessos indevidos, falhas de pareamento, solicitações que ficaram sem resposta, conteúdo exibido como não confirmado, encaminhamentos e revisões humanas concluídas.
- **Economia:** custo de implantação, custo mensal por unidade e paciente ativo, horas de suporte, custo por jornada ativa, margem bruta e renovação/intenção de compra.

Não usar no piloto uma meta clínica de sobrevida, redução de complicações ou substituição de profissionais. Se houver hipótese de benefício assistencial, ela requer desenho de avaliação apropriado, governança clínica e atribuição causal.

## SUS, convênios ou hospital?

### SUS

O alinhamento de política pública é real: a Lei 14.758/2023 institui a Política Nacional de Prevenção e Controle do Câncer e o Programa Nacional de Navegação da Pessoa com Diagnóstico de Câncer. Isso torna instituições oncológicas públicas e filantrópicas relevantes como parceiras de validação. Para compra, mapear gestor e orçamento responsáveis, planejar contratação e avaliar instrumentos adequados. CPSI, previsto no Marco Legal das Startups, permite testar solução inovadora via procedimento público específico; não é contratação automática nem atalho para dispensar governança. [MDIC — instrumentos de compra pública](https://www.gov.br/mdic/pt-br/acesso-a-informacao/perguntas-frequentes-faq/secretaria-de-desenvolvimento-industrial-inovacao-comercio-e-servicos/quais-sao-os-instrumentos-de), [AGU — CPSI](https://www.gov.br/agu/pt-br/assuntos-1/labori/cpsi)

Começar por parceria de pesquisa/avaliação ou piloto com hospital filantrópico que já tenha liderança e governança; negociar acesso via responsável institucional e jurídico. Para escala pública, preparar documentação de contratação, suporte, continuidade, segurança, interoperabilidade e orçamento. Se o produto for proposto como tecnologia de saúde a incorporar ao SUS ou fizer alegações de efeito clínico, discutir percurso de avaliação e evidências com especialistas e órgãos competentes; Conitec considera evidências e avaliação econômica comparativa nos processos que cabem ao seu escopo. [Conitec — legislação e critérios](https://www.gov.br/conitec/pt-br/assuntos/a-comissao/legislacao)

### Convênios/operadoras

Possível segundo canal, especialmente quando o patrocinador controla ou coordena a jornada em uma rede de prestadores. A proposta econômica precisa demonstrar valor ao comprador com dados: tempo de equipe, engajamento, continuidade do processo, uso de canais e impacto operacional. Não presumir economia assistencial. Integrações e troca de dados com prestadores devem considerar TISS, padrão obrigatório da saúde suplementar, e contratos de cada participante. [ANS — padrão TISS](https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss/)

### Hospital privado

É a melhor primeira hipótese porque o comprador e os operadores do fluxo estão próximos e podem decidir piloto na própria instituição. A venda deve ser para diretoria de oncologia/operações com co-patrocínio de TI, segurança, privacidade e equipe assistencial. O produto complementa prontuário; não deve alegar substituí-lo. A integração pode ser faseada e contratada separadamente.

## Requisitos para vender com dados reais

- A LGPD classifica dados de saúde como sensíveis. Definir controlador e operador por finalidade e contrato, base legal adequada, minimização, retenção/descarte, direitos, suboperadores, resposta a titulares e incidentes. Consentimento não é solução universal nem substitui análise jurídica. [ANPD — dados pessoais sensíveis](https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao-titular-de-dados/denuncia-peticao-de-titular-referente-lgpd), [Ministério da Saúde — controlador e operador](https://www.gov.br/saude/pt-br/acesso-a-informacao/lgpd)
- Implementar autenticação institucional, autorização por instituição/equipe/paciente/finalidade, trilha de auditoria, backups testados, criptografia, gestão de segredos, segregação de ambientes e resposta a incidentes. O estado atual de demo/login não satisfaz isso para produção.
- Definir alegação e finalidade pretendida antes de decidir enquadramento. Se função/marketing caracterizar software como dispositivo médico, avaliar a RDC 657/2022 junto com demais regras aplicáveis; não presumir que o rótulo “coordenação” isenta software que faça função clínica. [Anvisa — SaMD](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas/)
- Ter validação clínica-operacional e de usabilidade, suporte e contingência, gestão de mudanças, contrato de nível de serviço e regras para falha/indisponibilidade. Manter humano responsável por revisão de alertas e decisões assistenciais.
- Evitar chaves de provedores incorporadas no APK para produção; centralizar credenciais no backend, revisar retenção e uso de dados de cada fornecedor e formalizar suboperadores.

## Decisão recomendada

**Construa primeiro uma oferta B2B institucional para hospital/centro de oncologia; pilote com uma unidade privada ou filantrópica que tenha navegação e patrocinador operacional.** Não comece vendendo ao paciente nem prometendo economia clínica. Trate SUS como canal estratégico de médio prazo, em especial via serviço oncológico já habilitado e instrumentos públicos de inovação/compra; avance para operadoras quando houver resultados de uso e custo que façam sentido para quem paga. A tese de rentabilidade depende de assinatura institucional, implantação repetível, suporte eficiente e prova de renovação — nenhuma dessas hipóteses está validada pelo código ou por contratos existentes.

## Atualização das fontes

As páginas da ANS consultadas em 4/11/2026 mostram 53.055.406 beneficiários em planos médico-hospitalares em junho de 2026 (53,1 milhões arredondados), atualizados até agosto. A Lei 14.758/2023 foi alterada pela Lei 15.385, de 10/4/2026, sobre princípios e diretrizes para desenvolvimento e regulação de novas tecnologias contra o câncer. A alteração não autoriza presumir financiamento, contratação ou enquadramento regulatório do OncoFlow.

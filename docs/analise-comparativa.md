# Análise comparativa do OncoFlow

**Data da pesquisa:** 4 de novembro de 2026. **Escopo:** comparação exploratória com plataformas de coordenação e engajamento oncológico. As capacidades dos concorrentes abaixo são as que eles divulgam publicamente; não houve acesso a contas, demonstrações privadas nem validação independente. Portanto, “não identificado” significa que não aparece nas páginas consultadas, e não que a capacidade inexista.

## O que o repositório oferece hoje

O OncoFlow combina um painel profissional e aplicativo de paciente com API compartilhada. No fluxo de demonstração, app e painel compartilham relatos, pedidos, mensagens, agenda e jornada; o profissional revisa pendências, assume o atendimento e publica alterações. O app tem Lia por texto/voz e registra pedidos sem alegar conclusão antes da confirmação do servidor. Há alertas de sintomas configuráveis, mas voltados à revisão pela equipe e explicitamente não apresentados como monitoramento de emergência. Os documentos do repositório afirmam que dados de demonstração são fictícios.

O projeto contém também uma arquitetura-alvo FastAPI/PostgreSQL, com autenticação JWT, vínculos institucionais/equipe e trilha de auditoria em construção. O app completo e o Pro foram publicados em preview Vercel, com cenário fictício persistido por transação no Supabase. A API Express usa identidade fictícia da equipe; a autenticação FastAPI não protege automaticamente essa API. A publicação não comprova prontidão clínica, autorização de produção ou interoperabilidade com prontuários.

## Produtos comparáveis

| Produto | Foco divulgado | Capacidades públicas relevantes | Leitura para o OncoFlow |
|---|---|---|---|
| [Navigating Care](https://www.navigatingcare.com/) | Engajamento e gestão digital para clínicas oncológicas | Engajamento do paciente, ePRO/monitoramento de sintomas, triagem digital e integração com EHR. | Referência de maturidade de fluxo de clínica e integração. O OncoFlow ainda não demonstra interoperabilidade EHR nem operação de triagem em produção. |
| [Thyme Care](https://www.thymecare.com/) | Navegação e apoio oncológico virtual, ligado a planos e prestadores | Navegação por equipe especializada, suporte entre consultas e coordenação; divulga também ferramentas para colaboração com práticas. | Referência para vender valor como serviço de coordenação e desenhar colaboração com a equipe existente, sem substituir o oncologista. |
| [Equicare Health](https://equicarehealth.com/) | Coordenação da jornada do rastreamento à sobrevivência | Ferramentas de navegação e portal para pacientes, segundo a descrição pública do fornecedor. | Referência para cobertura longitudinal da jornada, incluindo além do tratamento ativo. |
| [Flatiron Assist](https://flatiron.com/oncology/clinical-decision-support) | Apoio à decisão clínica oncológica integrado ao EHR | Caminhos clínicos, evidências e oportunidades de ensaio clínico no ponto de cuidado. | Produto adjacente, não equivalente: o OncoFlow deliberadamente não decide tratamento. Não deve competir nessa promessa sem mudar escopo e validação. |

### Comparação funcional (evidência em páginas públicas)

| Capacidade | OncoFlow no repositório | Navigating Care | Thyme Care | Equicare |
|---|---|---|---|---|
| Aplicativo/portal para paciente | Implementado para demonstração | Divulgado | Plataforma para membros divulgada | Portal divulgado |
| Fluxo bidirecional app-equipe | Demonstrado com dados fictícios no mesmo servidor | Comunicação e engajamento divulgados; detalhes variam por implantação | Colaboração com prestadores divulgada | Coordenação e navegação divulgadas |
| Alertas/ePRO entre consultas | Protótipo de registro e alerta sujeito a revisão; não é monitoramento clínico validado | ePRO e triagem digital divulgados | Navegação e apoio entre visitas divulgados | Acompanhamento de jornada divulgado |
| Integração com EHR/prontuário | Não comprovada; integrações descritas são simuladas/de demonstração | Integração com EHR divulgada | Colaboração/EHR divulgada em materiais de parceiro | Não confirmada nas páginas consultadas |
| Equipe clínica/serviço de navegação operado pelo fornecedor | Não; o produto é software/protótipo | Produto para equipes de clínicas | Sim, componente de navegação especializada divulgado | Software para prestadores |
| Recomendação de tratamento/apoio à decisão | Fora do escopo atual | Não avaliado nesta pesquisa | Não é o foco divulgado | Não é o foco divulgado | Flatiron Assist tem esse foco |
| Prontidão comercial/implantação real | MVP/demo, sem piloto assistencial comprovado | Oferta comercial divulgada | Oferta comercial divulgada | Oferta comercial divulgada |

## Diferenciais reais e lacunas

**Diferencial que o projeto pode sustentar hoje:** uma experiência de demonstração conectada que expõe claramente o ciclo paciente → equipe → resposta, com estados distintos de pedido, revisão e conclusão; IA limitada a apoio, confirmação explícita de ações e revisão humana. O app para paciente e o painel profissional estão reunidos no mesmo repositório e compartilham a API da demonstração. Esse é um diferencial de desenho e de protótipo, não uma vantagem competitiva validada em operação.

**Não demonstrado como diferencial:** IA, voz, alertas de sintomas, aplicativo de paciente ou navegação oncológica isoladamente. Concorrentes já divulgam esses recursos. Tampouco há evidência para alegar menor custo, melhor desfecho, maior segurança ou adequação ao SUS.

**Lacunas frente a fornecedores comerciais:** integrações reais com prontuários e sistemas hospitalares; identidade/autorização robustas em todas as superfícies; gestão de múltiplas instituições em produção; suporte operacional e clínico; métricas de adoção e impacto; acessibilidade testada com pacientes; implantação, SLA, segurança e conformidade auditadas. O código de arquitetura-alvo indica intenção e algumas fundações, mas ainda precisa ser verificado ponta a ponta antes de se falar em prontidão.

## O que vale trazer para o OncoFlow

1. **Fila de navegação com responsável, prazo e escalonamento configuráveis**: inspirada em ferramentas de triagem/gestão, mas com regras definidas pelo serviço e revisão profissional; não criar limiares clínicos fixos no app.
2. **Indicadores operacionais auditáveis**: tempo entre relato e primeira leitura, pendências vencidas, pedidos concluídos, abandono e carga da equipe. Medir antes de prometer redução de custo ou melhora clínica.
3. **Integração incremental e explícita**: começar por exportação/importação controlada e um piloto de agenda; evoluir para padrões de interoperabilidade conforme o parceiro e a governança permitirem. Não simular uma integração como se fosse real.
4. **Jornada além da consulta**: encaminhamentos, navegação social/logística, cuidador delegado e sobrevivência, somente após validar necessidade e responsáveis com pacientes e serviços.
5. **Modelo de implantação**: demonstrar primeiro em uma clínica/centro de oncologia privado com equipe parceira; registrar segurança, tempo economizado e adesão. Preparar requisitos de contratação e interoperabilidade para setor público em paralelo.

## Posicionamento recomendado

“OncoFlow conecta o app do paciente à fila de trabalho da equipe oncológica para organizar relatos e solicitações entre consultas, com revisão humana e registro do que foi recebido e concluído.” A frase descreve o protótipo; só deve ser usada como oferta real depois de piloto e validação das integrações, segurança e operação. Evitar “IA clínica”, “monitoramento 24/7”, “reduz internações” ou “pronto para o SUS” sem evidência correspondente.

## Fontes consultadas

- Navigating Care, [Digital Oncology Care Solutions](https://www.navigatingcare.com/) e [About Us](https://www.navigatingcare.com/about-us/).
- Thyme Care, [Personalized cancer navigation and support](https://www.thymecare.com/) e [Thyme Box para parceiros](https://www.thymecare.com/partners/thyme-box).
- Equicare Health, [Oncology care coordination](https://equicarehealth.com/).
- Flatiron Health, [Clinical decision support](https://flatiron.com/oncology/clinical-decision-support).
- Repositório OncoFlow: [guia da plataforma conectada](connected-demo.md), [verificação da plataforma](verification-connected.md), `CLAUDE.md`, `backend/app/main.py`, `backend/app/acesso/seguranca.py` e `backend/app/auditoria/service.py`.

*A comparação usa páginas oficiais dos produtos, consultadas em 4/11/2026. Conteúdo comercial descreve o que cada fornecedor afirma oferecer; disponibilidade, resultados e qualidade dependem de contrato, versão e implantação.*

## Revisão de funcionalidades profissionais — 4/11/2026

Fontes oficiais reabertas para orientar implementação, sem acesso aos produtos privados:

- **Navigating Care** descreve workboards, comunicação bidirecional e atribuição de tarefas à equipe na [página para prestadores](https://www.navigatingcare.com/providers/). A oportunidade identificada no OncoFlow é melhorar sua fila operacional; atribuir tarefas não é um diferencial exclusivo.
- **Thyme Box** divulga playbooks, perfis agregados, instrumentos de coleta e dashboards na [página da plataforma](https://www.thymecare.com/partners/thyme-box). A referência útil é ligar trabalho registrado a indicadores com denominadores claros. Não foi reproduzido nenhum protocolo clínico do fornecedor.
- **Equicare CS** lista gestão de barreiras, encaminhamentos, sobrevivência, relatórios populacionais e integração HL7 na [descrição do produto](https://equicarehealth.com/equicare-cs/). O OncoFlow ainda precisa desenvolver e validar essas capacidades antes de alegar paridade.
- **WeCancer / Cecí Saúde**, referência brasileira, divulga painel de navegação, central de atendimento/alertas, tarefas, analytics e possibilidade de integração com prontuário na [oferta para hospitais](https://wecancer.com.br/hospitais/). Seu modelo também inclui equipe assistencial. Isso reforça que tarefas e chat são requisitos competitivos básicos, e que software sozinho não equivale ao serviço de enfermagem do fornecedor.
- **Thummi**, também brasileira, divulga app, painel assistencial, relatos estruturados, classificação de toxicidades e evidência de implantações na [página oficial](https://thummi.global/). As alegações clínicas e regulatórias são do fornecedor e não foram auditadas aqui. O OncoFlow não possui validação equivalente; não deve copiar classificação de gravidade, prometer redução de internações nem apresentar prazo operacional como triagem clínica.

### Primeira entrega implementada

| Melhoria | Comportamento verificável | Limite |
|---|---|---|
| Fila de navegação | Busca, situação, minhas pendências, não atribuídas, sinais encaminhados e prazos vencidos | Prazo operacional não é prioridade clínica |
| Gestão de responsável e prazo | Profissional selecionado da equipe, justificativa obrigatória, histórico anterior/novo | Identidades ainda são de demonstração |
| Proteção contra edição concorrente | Revisão desatualizada retorna 409; transferência explícita antes de outro profissional assumir/concluir | Não substitui autenticação real e isolamento institucional |
| Indicadores da unidade | Abertas, atrasadas, sem responsável, concluídas em sete dias e média até primeira ação com tamanho da amostra | Datas antigas sem ação registrada não são inventadas; não mede desfecho clínico |
| Exportação da fila | CSV do filtro, sem diagnóstico ou notas internas; fórmulas de planilha neutralizadas | Apenas demonstração fictícia; exportação clínica requer política de acesso |

Os testes `server/navigation.test.ts` verificam validação por HTTP, atomicidade, conflitos, transferência, persistência do histórico, exclusão de justificativas da visão do paciente, métricas e CSV. A suíte de integração existente continua cobrindo o ciclo app-equipe. O trabalho restante está em [plano-evolucao-profissional.md](plano-evolucao-profissional.md).

### Relatório operacional da equipe

Inspirado nos dashboards e relatórios divulgados por Thyme Box, Equicare e Cecí, o painel de pendências agora inclui período de 7 ou 30 dias de calendário em São Paulo, entradas e conclusões diárias, mediana da criação à conclusão com amostra, e carga atual por responsável (abertas, vencidas/abertas e maior atraso). O relatório usa toda a unidade, independentemente dos filtros da fila, e informa explicitamente esse alcance. Hoje é parcial. Conclusões são agrupadas pelo responsável atual, sem reconstruir atribuições históricas nem ranquear produtividade. Datas inconsistentes não geram durações inventadas. Não mede resposta clínica nem desfechos; requer validação operacional com parceiros. Evidência automatizada: `server/relatorioFila.test.ts`.

### Navegação de barreiras de acesso

A gestão de barreiras divulgada pela Equicare orientou a nova aba interna do paciente: transporte, agendamento, apoio social, comunicação/acessibilidade e outras dificuldades de acesso. A equipe registra manualmente a dificuldade, escolhe responsável e prazo, acompanha e encerra como resolvida ou sem resolução. Cada alteração exige justificativa, valida a revisão e preserva antes/depois, ator e data. Somente o responsável encerra; transferência deve ser salva antes. Reenvios idênticos preservam o registro original. O cadastro não contrata transporte, concede benefícios, envia orientações ou automatiza triagem. O texto não é exposto ao paciente; o teste `server/barreiras.test.ts` verifica isso nas duas APIs. A utilidade e as categorias precisam de validação com a navegação do serviço. Execute `npm run test:professional` para verificar o ciclo profissional.

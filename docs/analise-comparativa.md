# Análise comparativa do OncoFlow

**Data da pesquisa:** 4 de novembro de 2026. **Escopo:** comparação exploratória com plataformas de coordenação e engajamento oncológico. As capacidades dos concorrentes abaixo são as que eles divulgam publicamente; não houve acesso a contas, demonstrações privadas nem validação independente. Portanto, “não identificado” significa que não aparece nas páginas consultadas, e não que a capacidade inexista.

## O que o repositório oferece hoje

O OncoFlow combina um painel profissional e aplicativo de paciente com API compartilhada. No fluxo de demonstração, app e painel compartilham relatos, pedidos, mensagens, agenda e jornada; o profissional revisa pendências, assume o atendimento e publica alterações. O app tem Lia por texto/voz e registra pedidos sem alegar conclusão antes da confirmação do servidor. Há alertas de sintomas configuráveis, mas voltados à revisão pela equipe e explicitamente não apresentados como monitoramento de emergência. Os documentos do repositório afirmam que dados de demonstração são fictícios.

O projeto contém também uma arquitetura-alvo FastAPI/PostgreSQL, com autenticação JWT, vínculos institucionais/equipe e trilha de auditoria em construção. A existência de código e testes não comprova prontidão para uso clínico real. A plataforma conectada da raiz ainda descreve cabeçalho de usuário fictício e demonstração local; não representa identidade ou autorização de produção.

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

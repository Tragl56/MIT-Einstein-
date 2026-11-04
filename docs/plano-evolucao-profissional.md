# Evolução profissional do OncoFlow

Objetivo: comparar plataformas semelhantes e melhorar a utilidade profissional do projeto. Referências internacionais: Navigating Care, Thyme Box e Equicare CS; brasileiras: WeCancer/Cecí e Thummi. Fontes e limites em [analise-comparativa.md](analise-comparativa.md). Contagem de funcionalidades não prova superioridade ou melhor resultado clínico.

## Entregas e evidência exigida

| Frente | Requisito | Estado atual e evidência |
|---|---|---|
| Coordenação diária | Responsável, prazo, motivo, histórico, filtros e edição concorrente | Implementado; 3 testes novos de navegação, 30 de integração, 1 transacional e 2 de cliente passaram; lint e build passaram |
| Operação mensurável | Indicadores auditáveis, período e amostra, sem confundir trabalho com resposta clínica | Contagens e primeira ação; relatório de 7/30 dias, entradas/conclusões diárias, mediana até conclusão e carga atual por responsável implementados; datas inconsistentes sinalizadas. Validação com equipe real pendente |
| Navegação de barreiras | Necessidade logística/social, responsável e resolução rastreável | Registro manual no perfil do paciente, categorias, responsável, prazo, acompanhamento, desfecho e histórico implementados; teste HTTP de validação, conflito, reenvio, snapshot e privacidade passou. Não faz triagem nem contrata serviços |
| Acesso profissional real | Identidade verificável, instituição, vínculo e autorização em todos os endpoints e exportações | Pendente na API completa Express; proteção do preview Vercel e cabeçalho fictício não equivalem a RBAC clínico |
| Histórico e prestação de contas | Linha do tempo operacional e exportação controlada | Histórico por pendência e CSV implementados; auditoria de acesso, exportações e retenção requerem evolução |
| Integrações | Agenda/prontuário com contrato real e idempotência | Apenas integração interna app-Pro comprovada; nenhuma integração hospitalar real |
| IA profissional | Gateway autenticado para o Ollama e ferramentas com autorização/validação | Conversa Llama Android configurada; navegador ainda não possui gateway remoto ao Ollama local |
| Validação com usuário | Revisar fluxos com equipe e pacientes; medir tempo para executar tarefas e erros | Pendente; testes automatizados não substituem teste de usabilidade ou piloto |

## Critérios do ciclo atual

- Atribuições não concluem pedidos nem enviam orientações ao paciente.
- Alteração exige motivo e rejeita versão antiga sem sobrescrever trabalho novo.
- Outro profissional precisa de transferência explícita antes de assumir ou concluir item atribuído.
- Histórico e justificativas não saem no serializer do paciente.
- Indicadores exibem período ou amostra aplicáveis e não alegam redução de custo ou melhora clínica.
- Preview deve ser exercitado com leitura, alteração e releitura do mesmo item persistido no Supabase.

## Próximos ciclos

1. Fila publicada e exercitada em 4/11: atribuição e prazo salvos no Supabase, histórico com autor/motivo/antes-depois, filtro pessoal retornando o item e CSV baixado contendo uma linha e somente as colunas operacionais. Em viewport de 390 px, fila e formulário ficaram com largura de documento de 375 px, sem transbordamento horizontal. Os testes de conflito e erro passaram por HTTP; as visões antiga e completa do paciente foram verificadas para não expor justificativas internas.
2. Relatório operacional implementado: dias de calendário em America/Sao_Paulo, hoje parcial, mediana por conclusão no período com n, alerta de amostra pequena, carga atual e maior atraso por responsável. Agrupa conclusões pelo responsável atual, sem alegar autoria histórica ou produtividade individual. Dois testes específicos cobrem limites do período, datas inválidas, duração invertida e ausência de dados. Barreiras de acesso também implementadas na aba do paciente: registro da equipe, transferência, justificativa, controle de revisão, encerramento somente pelo responsável e histórico. Sem mensagens automáticas ao paciente ou concessão de benefício/transporte. Dados ficam no snapshot durável existente; nenhuma tabela nova. A visão do paciente permanece uma lista explícita de campos. Notas de barreira são internas e não têm ação por voz, pois são exclusivas da equipe.
3. Fechar identidade e autorização da API completa antes de qualquer dado real.
4. Validar integrações e utilidade com parceiros para sustentar vantagens comparativas com medições.

A meta permanece em andamento enquanto essas lacunas materiais não tiverem evidência de resolução. Não há evidência para afirmar que o OncoFlow já supera todos os fornecedores comparados.

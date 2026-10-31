---
name: oncoflow-demo-hackathon
description: Planejamento e execução da demonstração do OncoFlow AI no MIT Hacking Medicine — ordem de construção e o que cortar quando o tempo apertar, dados fictícios (paciente Maria, câncer de mama, caso de fertilidade e outros pacientes para o painel), roteiro de 3–5 minutos com falas, modo offline à prova de Wi-Fi, reset da demo, ensaio automatizado com Playwright, pitch, perguntas para mentores e jurados. Use sempre que falarem em demo, apresentação, pitch, hackathon, jurados, "o que fazer primeiro", "não vai dar tempo", seed, dados de exemplo, ensaio, vídeo de backup ou slides do OncoFlow.
---

# OncoFlow — demo do hackathon

A demo precisa provar **um ciclo completo**, não muitas telas soltas (documento do produto, seção 8):

> consulta → informação estruturada → validação humana → navegação → atualização do paciente → check-in

Juízes de hackathon de saúde julgam três coisas: o problema é real, a solução é viável e ela é segura. O
ciclo mostra as duas primeiras; o "humano valida" bem visível mostra a terceira. Tudo que não serve ao ciclo
fica para depois.

## Ordem de construção (corte de baixo para cima se faltar tempo)

| # | Entrega | Por que nesta posição |
|---|---|---|
| 1 | Seed fictício + `POST /api/demo/reset` + troca de usuário no modo demo | Sem isso não dá para ensaiar |
| 2 | App do paciente: Início + Minha jornada | Primeira tela que o júri vê e a última que vai lembrar |
| 3 | Care: fila de validação com extração em `IA_MODO=fixture` | Mostra a IA com humano no controle |
| 4 | Confirmar item → criar pendência → criar etapa visível → app atualizado | Fecha o ciclo: é **a** demo |
| 5 | Check-in no app + relato aparecendo no Care com alerta e prazo | Completa a seção 4 do documento |
| 6 | Lista de pacientes e indicadores no Care | Mostra escala e mensurabilidade |
| 7 | Extração ao vivo com Claude (`IA_MODO=claude`) | Impressiona, mas tem fallback |
| 8 | Áudio/STT ao vivo | Maior risco no palco; só se 1–7 estiverem sólidos |
| 9 | Assistente FAQ | O documento já o define como "FAQ limitado" |

Regra: nada entra no roteiro se não tiver passado em três ensaios seguidos.

## Dados fictícios

O seed é idempotente (`reset` apaga e recria) e fica em `backend/app/demo/seed.py`. Todo nome é obviamente
fictício e as telas mostram o selo "dados fictícios".

- **Maria (protagonista)**, linha de cuidado mama. Estado **antes** da demo: *Diagnóstico registrado*
  (concluído), *Consulta oncológica* (em andamento: é a consulta que vamos mostrar), *Exames pré-tratamento*
  (aguardando), *Início do tratamento* (futuro), *Acompanhamento* (futuro). **Não existe** etapa de fertilidade:
  ela nasce durante a demo, a partir da validação. Isso mostra causa e efeito.
- Consulta da Maria com a transcrição de `references/transcricao-demo.md` e a extração gravada
  correspondente em `fixtures/extracoes/mama-fertilidade.json`.
- Três check-ins anteriores da Maria (Bem, Bem, Mais ou menos) para o gráfico não começar vazio.
- **6 a 8 outros pacientes** com situações variadas para o painel parecer real: dois com pendência vencida
  (ex.: autorização de exame há 4 dias), um com alerta aberto dentro do prazo, um com alerta atrasado, um com
  tudo em dia, um recém-chegado.
- Usuários: Dra. Ana (médica), Enf. Bruno (enfermagem), Carla (navegação), Maria (paciente). Senhas só no
  `.env.example` da demo, nunca no código.
- Regras de alerta de exemplo (`exemplo = true`): "check-in Muito mal → enfermagem em 24 h" e "piora em 3
  check-ins seguidos → navegação em 48 h". Na tela: "critério ilustrativo — a definir com o serviço".

## Roteiro (alvo: 4 min; ensaie com cronômetro)

| Tempo | Tela | Ação | Fala-guia |
|---|---|---|---|
| 0:00–0:30 | Slide | Problema | "A jornada oncológica tem muitas portas de entrada, profissionais e etapas. Quando a informação não conversa, o paciente se perde, e o que ele disse na consulta se perde junto." |
| 0:30–1:15 | Care · Consulta | Mostrar a transcrição e, ao lado, os itens extraídos | "Com consentimento, a consulta é transcrita. A IA não diagnostica: ela destaca o que foi dito e pode importar, sempre com a fala original ao lado." |
| 1:15–2:00 | Care · Validação | Apontar a hipótese "Avaliar necessidade de encaminhamento para fertilidade?", mostrar a citação, **Confirmar**, depois **Criar pendência** escolhendo Carla e o prazo | "Nada vale até a médica confirmar. A hipótese vira uma pendência com responsável e prazo, escolhidos por uma pessoa." |
| 2:00–2:30 | Care · Navegação (Carla) | Pendência na lista da navegação | "A navegação passa a acompanhar. Nenhuma tarefa cai no vazio." |
| 2:30–3:10 | App da Maria | Jornada com a nova etapa "Avaliação de fertilidade · Em andamento" e o próximo compromisso | "A Maria vê o que foi validado, em linguagem dela, e sabe qual é o próximo passo." |
| 3:10–3:40 | App · Como me sinto | Check-in "Mal" + "estou com mais cansaço e preocupada com o trabalho". Mostrar o aviso de urgência | "Entre consultas, ela conta como está. O app deixa claro que isso não é canal de emergência." |
| 3:40–4:00 | Care (Bruno) | Relato com alerta e prazo de resposta; tendência dos check-ins | "A equipe autorizada vê, com prazo e responsável definidos pelo serviço. Essa é a jornada contínua e coordenada que o desafio pediu." |

Fechamento (slide): o pitch curto do documento, seção 13, e "próximo passo: piloto em uma linha de cuidado,
com indicadores definidos com o Cancer Center".

## À prova de palco

- **Sem Wi-Fi:** tudo roda em `docker compose` no notebook. `IA_MODO=fixture` é o padrão do roteiro. Um
  botão "gerar ao vivo" (modo Claude) só aparece se a rede estiver boa e já tiver sido testada no local.
- **Reset entre ensaios** e antes de subir ao palco: `POST /api/demo/reset`, e confira a tela inicial da
  Maria.
- **Ensaio automatizado:** `frontend/e2e/demo.spec.ts` (Playwright) executa o roteiro inteiro, clique a
  clique, e verifica que a etapa de fertilidade aparece no app da Maria depois da validação. Rode antes de
  cada apresentação. Se falhar, não apresente ao vivo: use o vídeo.
- **Vídeo de backup** gravado do roteiro completo, guardado localmente e não só na nuvem.
- Zoom do navegador em 125% no Care para o júri ler. Notificações do sistema desligadas. Abas
  pré-abertas: Care (Dra. Ana), Care (Carla), Paciente (Maria) em janela de celular.

## Pitch e números

- Use o pitch curto do documento (seção 13). Não prometa redução de tempo nem melhora de desfecho: diga que
  os indicadores (tempo entre etapas, pendências vencidas, check-ins revisados no prazo) serão **medidos no
  piloto**.
- Números do Cancer Center citados na palestra (191 leitos, 63 consultórios, 42 salas de quimioterapia, 10
  salas cirúrgicas com robô) **só depois de confirmar com o hospital**, como o próprio documento alerta. Na
  dúvida, não use.
- Diferenciais a reforçar: proveniência visível (fala × extraído × hipótese × confirmado), humano no
  controle, check-in longitudinal e coordenação da navegação. "Mais do que transcrição."

## Perguntas difíceis prováveis e respostas curtas

| Pergunta | Resposta |
|---|---|
| "E se a IA errar?" | "Ela só sugere, com a fala original ao lado. Nada chega ao paciente ou vira tarefa sem confirmação, e as rejeições medem a qualidade da IA." |
| "E a LGPD?" | "Consentimento por finalidade, gravação opcional e interrompível, acesso por papel, auditoria de cada leitura, minimização. Na demo, só dados fictícios." |
| "Vocês integram com o prontuário?" | "Não presumimos. Somos uma camada de coordenação; a integração depende dos sistemas do Cancer Center e é a fase 3 do roadmap." |
| "Quem responde o check-in de madrugada?" | "O app diz claramente que não é emergência e mostra o canal de urgência do hospital. Quem responde e em que prazo é o serviço que define; o sistema garante responsável e mostra atraso." |
| "Como vocês medem valor?" | "Indicadores de processo definidos com o hospital e medidos num piloto controlado, antes de qualquer promessa." |

## Para os mentores (validar durante o evento)

Leve as perguntas da seção 14 do documento e anote as respostas em `docs/validacao-mentores.md`.
Priorize três: quem revisaria os relatos e em que prazo; quais informações se perdem hoje entre a consulta e
a próxima etapa; e qual linha de cuidado seria o piloto. As respostas mudam as regras de alerta e o seed.

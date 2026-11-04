// Telas visuais do OncoFlow Paciente (conceito, seção 3 e mockups da página 1). Tudo o que se faz
// aqui também pode ser pedido à Lia por voz ou texto.

import React, { useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDot,
  Clock,
  FileText,
  Heart,
  Mic,
  Route,
  Volume2,
  Square,
  Sparkles,
  Users,
  Bell,
  MapPin,
  Info,
} from 'lucide-react';
import type {
  Compromisso,
  Documento,
  EstadoEtapa,
  InicioPaciente,
  OpcaoCheckin,
  SolicitacaoPaciente,
} from '../types';
import { ROTULO_OPCAO_CHECKIN } from '../types';
import { AssinaturaOncoFlow } from '../components/LogoOncoFlow';
import { AvisoUrgencia } from './AvisoUrgencia';
import { OrbeLia } from './OrbeLia';
import { dataCurta, diaDaSemana, diaEHora, porExtenso } from './formato';
import { tr } from '../idioma';

export type Tela = 'inicio' | 'jornada' | 'como-estou' | 'agenda' | 'documentos' | 'lia';

export const Cabecalho: React.FC<{ titulo: string; onVoltar: () => void; direita?: React.ReactNode }> = ({
  titulo,
  onVoltar,
  direita,
}) => (
  <header className="patient-page-header flex items-center justify-between gap-2">
    <button
      type="button"
      onClick={onVoltar}
      className="flex items-center gap-1.5 min-h-12 pr-3 text-azul font-semibold cursor-pointer"
    >
      <ArrowLeft className="w-6 h-6" aria-hidden />
      {tr('Voltar', 'Back')}
    </button>
    <h1 className="text-lg font-bold text-azul text-center flex-1 truncate">{titulo}</h1>
    <div className="min-w-12 flex justify-end">{direita}</div>
  </header>
);

const BotaoOuvir: React.FC<{ texto: string; onOuvir: (t: string) => void }> = ({ texto, onOuvir }) => (
  <button
    type="button"
    onClick={() => onOuvir(texto)}
    className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-linha bg-white text-azul font-semibold cursor-pointer"
  >
    <Volume2 className="w-5 h-5 text-verde" aria-hidden />
    {tr('Ouvir em voz alta', 'Read aloud')}
  </button>
);

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------

const ROTULO_SOLICITACAO: Record<SolicitacaoPaciente['estado'], string> = {
  registrada: tr('Registrada · aguardando a equipe', 'Logged · waiting for the team'),
  com_a_equipe: tr('Com a equipe', 'With the team'),
  respondida: tr('Concluída pela equipe', 'Completed by the team'),
};

export const TelaInicio: React.FC<{ inicio: InicioPaciente; irPara: (t: Tela) => void; onPreferencias: () => void }> = ({
  inicio, irPara, onPreferencias,
}) => {
  const proxima = inicio.proximoCompromisso;
  const atalhos: [Tela, string, React.ElementType][] = [
    ['jornada', tr('Minha jornada', 'My journey'), Route], ['como-estou', tr('Como estou?', 'How am I?'), Heart],
    ['agenda', tr('Minha agenda', 'My schedule'), CalendarDays], ['documentos', tr('Meus documentos', 'My documents'), FileText],
  ];
  const pedidosAbertos = inicio.solicitacoes.filter((s) => s.estado !== 'respondida');
  const dia = proxima ? new Intl.DateTimeFormat(tr('pt-BR', 'en-US'), { timeZone: 'America/Sao_Paulo', day: '2-digit' }).format(new Date(proxima.dataHora)) : '';
  const mes = proxima ? new Intl.DateTimeFormat(tr('pt-BR', 'en-US'), { timeZone: 'America/Sao_Paulo', month: 'short' }).format(new Date(proxima.dataHora)).replace('.', '') : '';

  return (
    <div className="patient-home">
      <header className="patient-home-brand">
        <div className="patient-brand-lockup"><AssinaturaOncoFlow className="h-9 w-auto" /><span>{tr('Seu espaço de cuidado', 'Your care space')}</span></div>
        <button type="button" onClick={onPreferencias} aria-label={tr("Preferências de idioma, leitura e voz", "Language, reading and voice preferences")} className="patient-preferences">Aa</button>
      </header>
      <div className="patient-welcome"><h1>{tr('Olá', 'Hi')}, {inicio.primeiroNome}.</h1><p>{tr('Vamos organizar seus próximos passos?', 'Shall we organize your next steps?')}</p></div>

      {proxima ? (
        <button type="button" onClick={() => irPara('agenda')} className="patient-appointment">
          <span className="patient-appointment-heading"><span>{proxima.tipo === 'consulta' ? tr('Sua próxima consulta', 'Your next appointment') : tr('Seu próximo compromisso', 'Your next scheduled visit')}</span><ChevronRight size={20} aria-hidden /></span>
          <span className="patient-appointment-date">
            <span className="patient-date-tile" aria-hidden><strong>{dia}</strong><small>{mes}</small></span>
            <span><strong>{diaDaSemana(proxima.dataHora)}</strong><span>{diaEHora(proxima.dataHora)}</span></span>
          </span>
          <span className="patient-appointment-place"><MapPin size={16} className="shrink-0 mt-1" aria-hidden /><span>{proxima.local}{proxima.profissional && <span className="block">{proxima.profissional}</span>}</span></span>
        </button>
      ) : <div className="rounded-2xl bg-gelo p-5 text-azul">{tr('Nenhum compromisso marcado.', 'No appointments scheduled.')}</div>}

      <section aria-labelledby="titulo-atalhos">
        <h2 id="titulo-atalhos" className="patient-section-title">{tr('Seu acompanhamento', 'Your follow-up')}</h2>
        <nav aria-label={tr("Atalhos", "Shortcuts")} className="patient-shortcuts">
          {atalhos.map(([tela, rotulo, Icone]) => <button key={tela} type="button" onClick={() => irPara(tela)} className="patient-shortcut">
            <span className="patient-shortcut-icon"><Icone size={23} aria-hidden /></span>
            <span className="patient-shortcut-label">{rotulo}<ChevronRight size={16} className="shrink-0" aria-hidden /></span>
          </button>)}
        </nav>
      </section>

      {pedidosAbertos.length > 0 && <section aria-label={tr("Meus pedidos", "My requests")} className="patient-home-requests">
        <h2 className="patient-section-title">{tr('Meus pedidos', 'My requests')}</h2>
        {pedidosAbertos.map((s) => <div key={s.id}>
          <p className="font-semibold text-azul text-sm">{s.titulo}</p>
          <p className="text-sm text-tinta-suave flex items-center gap-1.5 mt-1"><Clock className="w-4 h-4 shrink-0" aria-hidden />{ROTULO_SOLICITACAO[s.estado]}</p>
        </div>)}
      </section>}

      <p className="patient-demo-note"><Info size={13} aria-hidden />{tr('Demonstração com dados fictícios.', 'Demo with fictional data.')}</p>
      <div className="patient-lia-dock">
        <button type="button" onClick={() => irPara('lia')} className="patient-lia-button">
          <OrbeLia estado="espera" tamanho={47} />
          <span><strong>{tr(`Falar com a ${inicio.assistenteNome}`, `Talk to ${inicio.assistenteNome}`)}</strong><small>{tr('Converse por texto ou voz', 'Chat by text or voice')}</small></span>
          <Mic size={23} className="shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
};

// Minha jornada: os mesmos estados e dados da plataforma.
const ESTADO_ETAPA: Record<EstadoEtapa, { rotulo: string; Icone: React.ElementType; cor: string }> = {
  concluida: { rotulo: tr('Concluído', 'Done'), Icone: CheckCircle2, cor: 'text-verde' },
  em_andamento: { rotulo: tr('Em andamento', 'In progress'), Icone: CircleDot, cor: 'text-azul' },
  proxima: { rotulo: tr('Próxima etapa', 'Next step'), Icone: ChevronRight, cor: 'text-azul' },
  aguardando: { rotulo: tr('Aguardando', 'Pending'), Icone: Clock, cor: 'text-atencao' },
  futura: { rotulo: tr('Futuro', 'Upcoming'), Icone: Circle, cor: 'text-tinta-suave' },
};

export const TelaJornada: React.FC<{ inicio: InicioPaciente; onVoltar: () => void }> = ({ inicio, onVoltar }) => {
  const [aberta, setAberta] = useState<string | null>(inicio.jornada.find((e) => e.estado === 'em_andamento')?.id ?? null);
  const concluidas = inicio.jornada.filter((e) => e.estado === 'concluida').length;
  const pct = inicio.jornada.length ? Math.round((concluidas / inicio.jornada.length) * 100) : 0;

  return (
    <div>
      <Cabecalho titulo={tr("Minha jornada", "My journey")} onVoltar={onVoltar} />
      <p className="text-azul mb-4">
        <strong>{pct}%</strong> {tr('· Etapas cadastradas concluídas', '· of listed steps completed')}
      </p>
      <ol className="relative border-l-2 border-linha ml-3 space-y-4">
        {inicio.jornada.map((etapa) => {
          const info = ESTADO_ETAPA[etapa.estado];
          const expandida = aberta === etapa.id;
          return (
            <li key={etapa.id} className="ml-6">
              <span className="absolute -left-[13px] bg-fundo">
                <info.Icone className={`w-6 h-6 ${info.cor}`} aria-hidden />
              </span>
              <button
                type="button"
                onClick={() => setAberta(expandida ? null : etapa.id)}
                aria-expanded={expandida}
                className="w-full text-left rounded-xl bg-white border border-linha p-3.5 cursor-pointer"
              >
                <span className="block font-semibold text-azul">{etapa.titulo}</span>
                <span className={`block text-sm font-semibold ${info.cor}`}>{info.rotulo}</span>
                {expandida && (
                  <span className="block mt-2 space-y-1 text-azul">
                    {etapa.descricao && <span className="block">{etapa.descricao}</span>}
                    {etapa.responsavel && <span className="block text-sm">{tr('Responsável:', 'Responsible:')} {etapa.responsavel}</span>}
                    {etapa.oQueFazer && <span className="block text-sm font-semibold">{tr('O que fazer:', 'What to do:')} {etapa.oQueFazer}</span>}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Minha agenda
// ---------------------------------------------------------------------------

export const TelaAgenda: React.FC<{
  inicio: InicioPaciente;
  onVoltar: () => void;
  onOuvir: (t: string) => void;
  onPedirLia: (texto: string) => void;
}> = ({ inicio, onVoltar, onOuvir, onPedirLia }) => (
  <div className="space-y-4">
    <Cabecalho titulo={tr("Minha agenda", "My schedule")} onVoltar={onVoltar} />
    {inicio.agenda.length === 0 && <p className="text-azul">{tr('Nenhum compromisso marcado.', 'No appointments scheduled.')}</p>}
    {inicio.agenda.map((c: Compromisso) => (
      <article key={c.id} className="rounded-2xl bg-white border border-linha p-4 space-y-2">
        <p className="text-sm font-semibold text-verde uppercase tracking-wide">{c.tipo === 'exame' ? tr('Exame', 'Test') : tr('Consulta', 'Appointment')}</p>
        <h2 className="text-lg font-bold text-azul">{c.titulo}</h2>
        <p className="text-azul">{porExtenso(c.dataHora)}</p>
        <p className="text-tinta-suave">
          {c.local}
          {c.profissional ? ` · ${c.profissional}` : ''}
        </p>
        {c.preparo && (
          <details className="rounded-xl bg-gelo p-3">
            <summary className="font-semibold text-azul cursor-pointer min-h-8">{tr('Como me preparar', 'How to prepare')}</summary>
            <p className="mt-2 text-azul">{c.preparo}</p>
            <div className="mt-2">
              <BotaoOuvir texto={c.preparo} onOuvir={onOuvir} />
            </div>
          </details>
        )}
        <button
          type="button"
          onClick={() => onPedirLia(c.tipo === 'exame' ? tr('Não posso ir ao exame.', "I can't go to the test.") : tr('Não posso ir à consulta.', "I can't go to the appointment."))}
          className="min-h-11 px-3 rounded-xl border border-linha text-azul font-semibold cursor-pointer"
        >
          {tr('Não posso ir', 'I can\'t go')}
        </button>
      </article>
    ))}
    {inicio.lembretes.length > 0 && (
      <section className="space-y-2">
        <h2 className="font-bold text-azul flex items-center gap-2">
          <Bell className="w-5 h-5 text-verde" aria-hidden />
          {tr('Lembretes', 'Reminders')}
        </h2>
        {inicio.lembretes.map((l) => (
          <p key={l.id} className="rounded-xl bg-white border border-linha p-3 text-azul">
            {porExtenso(l.dataHora)}: {l.texto}
          </p>
        ))}
      </section>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Meus documentos
// ---------------------------------------------------------------------------

export const TelaDocumentos: React.FC<{
  inicio: InicioPaciente;
  documentoId: string | null;
  onAbrir: (id: string | null) => void;
  onVoltar: () => void;
  onOuvir: (t: string) => void;
}> = ({ inicio, documentoId, onAbrir, onVoltar, onOuvir }) => {
  const aberto = inicio.documentos.find((d) => d.id === documentoId);
  if (aberto) {
    return (
      <div className="space-y-4">
        <Cabecalho titulo={tr("Documento", "Document")} onVoltar={() => onAbrir(null)} />
        <h2 className="text-xl font-bold text-azul">{aberto.titulo}</h2>
        <p className="text-tinta-suave">
          {tr('Liberado em', 'Released on')} {dataCurta(aberto.data)} {tr('por', 'by')} {aberto.liberadoPor}
        </p>
        <p className="rounded-2xl bg-white border border-linha p-4 text-azul leading-relaxed">{aberto.texto}</p>
        <BotaoOuvir texto={`${aberto.titulo}. ${aberto.texto}`} onOuvir={onOuvir} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Cabecalho titulo={tr("Meus documentos", "My documents")} onVoltar={onVoltar} />
      <p className="text-tinta-suave">{tr('Resultados e orientações que sua equipe liberou para você.', 'Results and guidance your team released to you.')}</p>
      {inicio.documentos.length === 0 && <p className="text-azul">{tr('Nenhum documento liberado ainda.', 'No documents released yet.')}</p>}
      {inicio.documentos.map((d: Documento) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onAbrir(d.id)}
          className="w-full flex items-center gap-3 text-left rounded-2xl bg-white border border-linha p-4 cursor-pointer"
        >
          <FileText className="w-7 h-7 text-verde shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="block font-semibold text-azul">{d.titulo}</span>
            <span className="block text-sm text-tinta-suave">
              {d.tipo === 'resultado' ? tr('Resultado', 'Result') : tr('Orientação', 'Guidance')} · {dataCurta(d.data)}
            </span>
          </span>
          <ChevronRight className="w-6 h-6 text-azul" aria-hidden />
        </button>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Como estou? (check-in visual ou falado)
// ---------------------------------------------------------------------------

const OPCOES: OpcaoCheckin[] = ['bem', 'cansaco', 'dor', 'nausea', 'ansiedade', 'outro'];

export const TelaComoEstou: React.FC<{
  inicio: InicioPaciente;
  ocupado: boolean;
  onVoltar: () => void;
  onEnviar: (opcoes: OpcaoCheckin[], texto: string, origem: 'visual' | 'voz') => Promise<boolean | null>;
  onFalarComLia: () => void;
  gravacao: { gravando: boolean; transcrevendo: boolean; alternar: (aoTranscrever: (t: string) => void) => void; erro: string | null };
}> = ({ inicio, ocupado, onVoltar, onEnviar, onFalarComLia, gravacao }) => {
  const [escolhidas, setEscolhidas] = useState<OpcaoCheckin[]>([]);
  const [texto, setTexto] = useState('');
  const [origem, setOrigem] = useState<'visual' | 'voz'>('visual');
  const [resultado, setResultado] = useState<'ok' | 'urgencia' | null>(null);

  const alternar = (o: OpcaoCheckin) =>
    setEscolhidas((atual) => (atual.includes(o) ? atual.filter((x) => x !== o) : [...atual, o]));

  const enviar = async () => {
    const urgencia = await onEnviar(escolhidas, texto, origem);
    if (urgencia === null) return;
    setResultado(urgencia ? 'urgencia' : 'ok');
    setEscolhidas([]);
    setTexto('');
    setOrigem('visual');
  };

  return (
    <div className="space-y-5 pb-8">
      <Cabecalho titulo={tr("Como estou?", "How am I?")} onVoltar={onVoltar} />

      {resultado ? (
        <div className="space-y-4">
          {resultado === 'urgencia' && <AvisoUrgencia aviso={inicio.avisoUrgencia} destaque />}
          <div role="status" className="rounded-2xl bg-gelo p-4 space-y-1">
            <p className="flex items-center gap-2 font-bold text-azul">
              <CheckCircle2 className="w-5 h-5 text-verde" aria-hidden />
              {tr('Check-in registrado', 'Check-in logged')}
            </p>
            <p className="text-azul">{tr('Recebemos sua atualização. Sua equipe vai ver conforme o combinado com o serviço.', 'We received your update. Your team will see it as agreed with the service.')}</p>
          </div>
          <button type="button" onClick={() => setResultado(null)} className="min-h-12 px-4 rounded-xl border border-linha text-azul font-semibold cursor-pointer">
            {tr('Registrar outro', 'Log another')}
          </button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-xl font-bold text-azul">{tr('Como você está se sentindo hoje?', 'How are you feeling today?')}</h2>
            <p className="text-tinta-suave">{tr('Você pode dizer como está ou escolher uma ou mais opções.', 'You can tell us how you are or pick one or more options.')}</p>
          </div>
          <div role="group" aria-label={tr("Opções de como você está", "How you are feeling options")} className="grid grid-cols-2 gap-3">
            {OPCOES.map((o) => {
              const marcada = escolhidas.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={marcada}
                  onClick={() => alternar(o)}
                  className={`min-h-16 rounded-2xl border-2 px-3 font-semibold flex items-center gap-2 cursor-pointer ${
                    marcada ? 'border-verde bg-gelo text-azul' : 'border-linha bg-white text-azul'
                  }`}
                >
                  {marcada ? <CheckCircle2 className="w-5 h-5 text-verde" aria-hidden /> : <Circle className="w-5 h-5 text-tinta-suave" aria-hidden />}
                  {ROTULO_OPCAO_CHECKIN[o]}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label htmlFor="checkin-texto" className="font-semibold text-azul">
              {tr('Quer contar mais? (opcional)', 'Want to tell us more? (optional)')}
            </label>
            <textarea
              id="checkin-texto"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setOrigem('visual');
              }}
              rows={3}
              className="w-full rounded-xl border border-linha bg-white p-3 text-azul"
              placeholder={tr("Escreva com suas palavras", "Write in your own words")}
            />
            <button
              type="button"
              onClick={() =>
                gravacao.alternar((t) => {
                  setTexto(t);
                  setOrigem('voz');
                })
              }
              className="min-h-12 px-4 rounded-xl border border-linha bg-white text-azul font-semibold flex items-center gap-2 cursor-pointer"
            >
              {gravacao.gravando ? <Square className="w-5 h-5 text-urgente" aria-hidden /> : <Mic className="w-5 h-5 text-verde" aria-hidden />}
              {gravacao.gravando ? tr('Parar e transcrever', 'Stop and transcribe') : gravacao.transcrevendo ? tr('Transcrevendo…', 'Transcribing…') : tr('Falar em vez de escrever', 'Speak instead of typing')}
            </button>
            {origem === 'voz' && texto && <p className="text-sm text-tinta-suave">{tr('Entendi o que está acima. Você pode corrigir antes de enviar.', 'This is what I understood. You can correct it before sending.')}</p>}
            {gravacao.erro && <p className="text-sm text-atencao">{gravacao.erro}</p>}
          </div>

          <div className="rounded-xl bg-white border border-linha p-3 text-sm text-azul flex gap-2">
            <Users className="w-5 h-5 text-verde shrink-0" aria-hidden />
            <span>
              <strong className="block">{tr('Quem vê e para quê', 'Who sees this and why')}</strong>
              {inicio.quemVe}
            </span>
          </div>
          <AvisoUrgencia aviso={inicio.avisoUrgencia} />

          <button
            type="button"
            disabled={ocupado || (escolhidas.length === 0 && !texto.trim())}
            onClick={enviar}
            className="w-full min-h-14 rounded-2xl bg-verde text-white text-lg font-bold disabled:opacity-40 cursor-pointer"
          >
            {tr('Enviar', 'Send')}
          </button>
          <button
            type="button"
            onClick={onFalarComLia}
            className="w-full min-h-12 rounded-2xl border-2 border-azul text-azul font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Mic className="w-5 h-5" aria-hidden />
            {tr('Quero falar com a', 'I want to talk to')} {inicio.assistenteNome}
          </button>
        </>
      )}

      <section aria-label={tr("Meus registros", "My check-ins")} className="space-y-2">
        <h2 className="font-bold text-azul flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-verde" aria-hidden />
          {tr('Meus registros', 'My check-ins')}
        </h2>
        {inicio.checkins.slice(0, 6).map((c) => (
          <div key={c.id} className="rounded-xl bg-white border border-linha p-3 text-azul">
            <p className="text-sm text-tinta-suave">{porExtenso(c.em)}</p>
            <p className="font-semibold">{c.opcoes.map((o) => ROTULO_OPCAO_CHECKIN[o]).join(', ') || tr('Relato', 'Report')}</p>
            {c.texto && <p>“{c.texto}”</p>}
          </div>
        ))}
      </section>
    </div>
  );
};

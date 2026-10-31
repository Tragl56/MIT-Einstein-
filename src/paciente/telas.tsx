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
import { LogoOncoFlow } from '../components/LogoOncoFlow';
import { AvisoUrgencia } from './AvisoUrgencia';
import { OrbeLia } from './OrbeLia';
import { dataCurta, diaDaSemana, diaEHora, porExtenso } from './formato';

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
      Voltar
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
    Ouvir em voz alta
  </button>
);

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------

const ROTULO_SOLICITACAO: Record<SolicitacaoPaciente['estado'], string> = {
  registrada: 'Registrada · aguardando a equipe',
  com_a_equipe: 'Com a equipe',
  respondida: 'Concluída pela equipe',
};

export const TelaInicio: React.FC<{ inicio: InicioPaciente; irPara: (t: Tela) => void; onPreferencias: () => void }> = ({
  inicio, irPara, onPreferencias,
}) => {
  const proxima = inicio.proximoCompromisso;
  const atalhos: [Tela, string, React.ElementType][] = [
    ['jornada', 'Minha jornada', Route], ['como-estou', 'Como estou?', Heart],
    ['agenda', 'Minha agenda', CalendarDays], ['documentos', 'Meus documentos', FileText],
  ];
  const pedidosAbertos = inicio.solicitacoes.filter((s) => s.estado !== 'respondida');
  const dia = proxima ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit' }).format(new Date(proxima.dataHora)) : '';
  const mes = proxima ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'short' }).format(new Date(proxima.dataHora)) : '';

  return (
    <div className="patient-home">
      <header className="patient-home-brand">
        <div className="patient-brand-lockup"><LogoOncoFlow className="w-9 h-9" /><div><strong>OncoFlow</strong><span>Seu espaço de cuidado</span></div></div>
        <button type="button" onClick={onPreferencias} aria-label="Preferências de leitura e voz" className="patient-preferences">Aa</button>
      </header>
      <div className="patient-welcome"><h1>Olá, {inicio.primeiroNome}.</h1><p>Vamos organizar seus próximos passos?</p></div>

      {proxima ? (
        <button type="button" onClick={() => irPara('agenda')} className="patient-appointment">
          <span className="patient-appointment-heading"><span>{proxima.tipo === 'consulta' ? 'Sua próxima consulta' : 'Seu próximo compromisso'}</span><ChevronRight size={20} aria-hidden /></span>
          <span className="patient-appointment-date">
            <span className="patient-date-tile" aria-hidden><strong>{dia}</strong><small>{mes}</small></span>
            <span><strong>{diaDaSemana(proxima.dataHora)}</strong><span>{diaEHora(proxima.dataHora)}</span></span>
          </span>
          <span className="patient-appointment-place"><MapPin size={16} className="shrink-0 mt-1" aria-hidden /><span>{proxima.local}{proxima.profissional && <span className="block">{proxima.profissional}</span>}</span></span>
        </button>
      ) : <div className="rounded-2xl bg-gelo p-5 text-azul">Nenhum compromisso marcado.</div>}

      <section aria-labelledby="titulo-atalhos">
        <h2 id="titulo-atalhos" className="patient-section-title">Seu acompanhamento</h2>
        <nav aria-label="Atalhos" className="patient-shortcuts">
          {atalhos.map(([tela, rotulo, Icone]) => <button key={tela} type="button" onClick={() => irPara(tela)} className="patient-shortcut">
            <span className="patient-shortcut-icon"><Icone size={23} aria-hidden /></span>
            <span className="patient-shortcut-label">{rotulo}<ChevronRight size={16} className="shrink-0" aria-hidden /></span>
          </button>)}
        </nav>
      </section>

      {pedidosAbertos.length > 0 && <section aria-label="Meus pedidos" className="patient-home-requests">
        <h2 className="patient-section-title">Meus pedidos</h2>
        {pedidosAbertos.map((s) => <div key={s.id}>
          <p className="font-semibold text-azul text-sm">{s.titulo}</p>
          <p className="text-sm text-tinta-suave flex items-center gap-1.5 mt-1"><Clock className="w-4 h-4 shrink-0" aria-hidden />{ROTULO_SOLICITACAO[s.estado]}</p>
        </div>)}
      </section>}

      <p className="patient-demo-note"><Info size={13} aria-hidden />Demonstração com dados fictícios.</p>
      <div className="patient-lia-dock">
        <button type="button" onClick={() => irPara('lia')} className="patient-lia-button">
          <OrbeLia estado="espera" tamanho={47} />
          <span><strong>Falar com a {inicio.assistenteNome}</strong><small>Converse por texto ou voz</small></span>
          <Mic size={23} className="text-verde shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
};

// Minha jornada: os mesmos estados e dados da plataforma.
const ESTADO_ETAPA: Record<EstadoEtapa, { rotulo: string; Icone: React.ElementType; cor: string }> = {
  concluida: { rotulo: 'Concluído', Icone: CheckCircle2, cor: 'text-verde' },
  em_andamento: { rotulo: 'Em andamento', Icone: CircleDot, cor: 'text-azul' },
  proxima: { rotulo: 'Próxima etapa', Icone: ChevronRight, cor: 'text-azul' },
  aguardando: { rotulo: 'Aguardando', Icone: Clock, cor: 'text-atencao' },
  futura: { rotulo: 'Futuro', Icone: Circle, cor: 'text-tinta-suave' },
};

export const TelaJornada: React.FC<{ inicio: InicioPaciente; onVoltar: () => void }> = ({ inicio, onVoltar }) => {
  const [aberta, setAberta] = useState<string | null>(inicio.jornada.find((e) => e.estado === 'em_andamento')?.id ?? null);
  const concluidas = inicio.jornada.filter((e) => e.estado === 'concluida').length;
  const pct = inicio.jornada.length ? Math.round((concluidas / inicio.jornada.length) * 100) : 0;

  return (
    <div>
      <Cabecalho titulo="Minha jornada" onVoltar={onVoltar} />
      <p className="text-azul mb-4">
        <strong>{pct}%</strong> · Etapas cadastradas concluídas
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
                    {etapa.responsavel && <span className="block text-sm">Responsável: {etapa.responsavel}</span>}
                    {etapa.oQueFazer && <span className="block text-sm font-semibold">O que fazer: {etapa.oQueFazer}</span>}
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
    <Cabecalho titulo="Minha agenda" onVoltar={onVoltar} />
    {inicio.agenda.length === 0 && <p className="text-azul">Nenhum compromisso marcado.</p>}
    {inicio.agenda.map((c: Compromisso) => (
      <article key={c.id} className="rounded-2xl bg-white border border-linha p-4 space-y-2">
        <p className="text-sm font-semibold text-verde uppercase tracking-wide">{c.tipo === 'exame' ? 'Exame' : 'Consulta'}</p>
        <h2 className="text-lg font-bold text-azul">{c.titulo}</h2>
        <p className="text-azul">{porExtenso(c.dataHora)}</p>
        <p className="text-tinta-suave">
          {c.local}
          {c.profissional ? ` · ${c.profissional}` : ''}
        </p>
        {c.preparo && (
          <details className="rounded-xl bg-gelo p-3">
            <summary className="font-semibold text-azul cursor-pointer min-h-8">Como me preparar</summary>
            <p className="mt-2 text-azul">{c.preparo}</p>
            <div className="mt-2">
              <BotaoOuvir texto={c.preparo} onOuvir={onOuvir} />
            </div>
          </details>
        )}
        <button
          type="button"
          onClick={() => onPedirLia(c.tipo === 'exame' ? 'Não posso ir ao exame.' : 'Não posso ir à consulta.')}
          className="min-h-11 px-3 rounded-xl border border-linha text-azul font-semibold cursor-pointer"
        >
          Não posso ir
        </button>
      </article>
    ))}
    {inicio.lembretes.length > 0 && (
      <section className="space-y-2">
        <h2 className="font-bold text-azul flex items-center gap-2">
          <Bell className="w-5 h-5 text-verde" aria-hidden />
          Lembretes
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
        <Cabecalho titulo="Documento" onVoltar={() => onAbrir(null)} />
        <h2 className="text-xl font-bold text-azul">{aberto.titulo}</h2>
        <p className="text-tinta-suave">
          Liberado em {dataCurta(aberto.data)} por {aberto.liberadoPor}
        </p>
        <p className="rounded-2xl bg-white border border-linha p-4 text-azul leading-relaxed">{aberto.texto}</p>
        <BotaoOuvir texto={`${aberto.titulo}. ${aberto.texto}`} onOuvir={onOuvir} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Cabecalho titulo="Meus documentos" onVoltar={onVoltar} />
      <p className="text-tinta-suave">Resultados e orientações que sua equipe liberou para você.</p>
      {inicio.documentos.length === 0 && <p className="text-azul">Nenhum documento liberado ainda.</p>}
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
              {d.tipo === 'resultado' ? 'Resultado' : 'Orientação'} · {dataCurta(d.data)}
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
      <Cabecalho titulo="Como estou?" onVoltar={onVoltar} />

      {resultado ? (
        <div className="space-y-4">
          {resultado === 'urgencia' && <AvisoUrgencia aviso={inicio.avisoUrgencia} destaque />}
          <div role="status" className="rounded-2xl bg-gelo p-4 space-y-1">
            <p className="flex items-center gap-2 font-bold text-azul">
              <CheckCircle2 className="w-5 h-5 text-verde" aria-hidden />
              Check-in registrado
            </p>
            <p className="text-azul">Recebemos sua atualização. Sua equipe vai ver conforme o combinado com o serviço.</p>
          </div>
          <button type="button" onClick={() => setResultado(null)} className="min-h-12 px-4 rounded-xl border border-linha text-azul font-semibold cursor-pointer">
            Registrar outro
          </button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-xl font-bold text-azul">Como você está se sentindo hoje?</h2>
            <p className="text-tinta-suave">Você pode dizer como está ou escolher uma ou mais opções.</p>
          </div>
          <div role="group" aria-label="Opções de como você está" className="grid grid-cols-2 gap-3">
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
              Quer contar mais? (opcional)
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
              placeholder="Escreva com suas palavras"
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
              {gravacao.gravando ? 'Parar e transcrever' : gravacao.transcrevendo ? 'Transcrevendo…' : 'Falar em vez de escrever'}
            </button>
            {origem === 'voz' && texto && <p className="text-sm text-tinta-suave">Entendi o que está acima. Você pode corrigir antes de enviar.</p>}
            {gravacao.erro && <p className="text-sm text-atencao">{gravacao.erro}</p>}
          </div>

          <div className="rounded-xl bg-white border border-linha p-3 text-sm text-azul flex gap-2">
            <Users className="w-5 h-5 text-verde shrink-0" aria-hidden />
            <span>
              <strong className="block">Quem vê e para quê</strong>
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
            Enviar
          </button>
          <button
            type="button"
            onClick={onFalarComLia}
            className="w-full min-h-12 rounded-2xl border-2 border-azul text-azul font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Mic className="w-5 h-5" aria-hidden />
            Quero falar com a {inicio.assistenteNome}
          </button>
        </>
      )}

      <section aria-label="Meus registros" className="space-y-2">
        <h2 className="font-bold text-azul flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-verde" aria-hidden />
          Meus registros
        </h2>
        {inicio.checkins.slice(0, 6).map((c) => (
          <div key={c.id} className="rounded-xl bg-white border border-linha p-3 text-azul">
            <p className="text-sm text-tinta-suave">{porExtenso(c.em)}</p>
            <p className="font-semibold">{c.opcoes.map((o) => ROTULO_OPCAO_CHECKIN[o]).join(', ') || 'Relato'}</p>
            {c.texto && <p>“{c.texto}”</p>}
          </div>
        ))}
      </section>
    </div>
  );
};

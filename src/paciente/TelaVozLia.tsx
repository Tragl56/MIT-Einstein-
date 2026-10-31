import React, { useEffect, useState, type RefObject } from 'react';
import { ArrowLeft, Check, ExternalLink, MessageSquare, Mic, RotateCcw, Send, Square, Volume2, X } from 'lucide-react';
import type { AcaoMensagem, Mensagem, PropostaLia } from '../types';
import { LogoOncoFlow } from '../components/LogoOncoFlow';
import { OrbeLia, type EstadoOrbe } from './OrbeLia';
import { OndaVoz } from './OndaVoz';
import { AvisoUrgencia } from './AvisoUrgencia';
import type { AvisoUrgencia as Aviso } from '../types';

interface Props {
  nome: string;
  estado: EstadoOrbe;
  nivel?: RefObject<number>;
  iniciando: boolean;
  gravando: boolean;
  transcrevendo: boolean;
  ocupado: boolean;
  falando: boolean;
  vozDisponivel: boolean;
  erro: string | null;
  rascunho: string | null;
  resposta?: Mensagem;
  avisos: Mensagem[];
  proposta?: PropostaLia;
  atendente?: string;
  avisoUrgencia: Aviso;
  quemVe: string;
  onRascunho: (texto: string) => void;
  onGravar: () => void;
  onCancelar: () => void;
  onEnviar: () => void;
  onOuvir: () => void;
  onAcao: (acao: AcaoMensagem) => void;
  onPararFala: () => void;
  onConfirmar: (aceitar: boolean) => void;
  onTexto: () => void;
  onVoltar: () => void;
}

export function TelaVozLia(props: Props) {
  const { nome, estado, nivel, iniciando, gravando, transcrevendo, ocupado, falando,
    vozDisponivel, erro, rascunho, resposta, avisos, proposta, atendente, avisoUrgencia, quemVe } = props;
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    setSegundos(0);
    if (!gravando) return;
    const comeco = Date.now();
    const timer = setInterval(() => setSegundos(Math.floor((Date.now() - comeco) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [gravando]);
  const revisando = rascunho !== null;
  const titulo = iniciando ? 'Preparando o microfone…' : gravando ? 'Estou ouvindo…'
    : transcrevendo ? 'Entendendo sua fala…' : revisando ? 'Foi isso que você disse?'
    : ocupado ? 'Consultando suas informações…' : falando ? 'Respondendo…'
    : resposta && estado === 'concluido' ? 'Pronto.' : 'Vamos conversar?';
  const podeResponder = !iniciando && !gravando && !transcrevendo && !revisando && !ocupado;
  const tempo = String(Math.floor(segundos / 60)).padStart(2, '0') + ':' + String(segundos % 60).padStart(2, '0');

  return <section className="lia-voice-screen" aria-label="Conversa por voz">
    <header className="lia-voice-header">
      <button type="button" className="lia-icon-button" onClick={props.onVoltar} aria-label="Voltar"><ArrowLeft size={23} aria-hidden /></button>
      <div className="lia-voice-brand"><LogoOncoFlow className="w-8 h-8" /><div><strong>{nome}</strong><span>Assistente OncoFlow</span></div></div>
      <button type="button" className="lia-icon-button" onClick={props.onTexto} aria-label="Conversar por texto" title="Conversar por texto"><MessageSquare size={21} aria-hidden /></button>
    </header>

    {atendente && <p className="lia-human-notice">Sua conversa está com {atendente}.</p>}
    <div className="space-y-3" aria-live="polite">
      {avisos.map((aviso) => aviso.tipoSistema === 'urgencia'
        ? <AvisoUrgencia key={aviso.id} aviso={avisoUrgencia} destaque />
        : <div key={aviso.id} className="lia-spoken-response">
            <p>{aviso.texto}</p>
            {aviso.link && <a href={aviso.link} target="_blank" rel="noopener noreferrer" className="lia-secondary-button mt-3">
              Entrar na chamada <ExternalLink size={17} aria-hidden />
            </a>}
          </div>)}
    </div>
    <div className="lia-voice-title"><h1 aria-live="polite">{titulo}</h1><p>{gravando ? 'Pode falar, estou aqui para ajudar.' : transcrevendo ? 'Transformando sua fala em texto.' : revisando ? 'Você pode corrigir o texto antes de enviar.' : 'Você escolhe: falar ou escrever.'}</p></div>

    <div className={revisando ? 'lia-voice-visual is-reviewing' : 'lia-voice-visual'}>
      <OrbeLia estado={estado} tamanho={revisando ? 132 : 246} nivel={nivel} />
      {!revisando && <OndaVoz estado={estado} nivel={nivel} />}
      {gravando && <p className="lia-record-time"><span aria-hidden />Gravando <time>{tempo}</time></p>}
    </div>

    {erro && <p className="lia-voice-error" role="alert">{erro}</p>}

    {revisando ? <div className="lia-voice-review">
      <label htmlFor="voz-texto-entendido">Revise antes de enviar</label>
      <textarea id="voz-texto-entendido" value={rascunho} onChange={(e) => props.onRascunho(e.target.value)} rows={4} />
      <button type="button" className="lia-primary-button" disabled={!rascunho.trim() || ocupado} onClick={props.onEnviar}><Send size={19} aria-hidden />Enviar mensagem</button>
      <button type="button" className="lia-secondary-button" onClick={props.onGravar}><RotateCcw size={17} aria-hidden />Gravar novamente</button>
    </div> : <>
      {podeResponder && resposta && <div className="lia-spoken-response">
        <p>{resposta.texto}</p>
        {resposta.status && <span className="lia-response-status"><Check size={13} aria-hidden />{({ consultado: 'Informação consultada', registrado: 'Solicitação registrada', encaminhado: 'Encaminhado para a equipe', confirmado: 'Confirmado' })[resposta.status]}</span>}
        {resposta.acoes && <div className="lia-voice-actions">{resposta.acoes.map((acao) =>
          <button key={acao.rotulo} type="button" className="lia-secondary-button" onClick={() => props.onAcao(acao)}>{acao.rotulo}</button>
        )}</div>}
      </div>}
      {podeResponder && proposta && <div className="lia-voice-proposal">
        <p><strong>Antes de continuar</strong>{proposta.resumo}</p>
        <button type="button" className="lia-primary-button" onClick={() => props.onConfirmar(true)}>{proposta.rotuloConfirmar}</button>
        <button type="button" className="lia-secondary-button" onClick={() => props.onConfirmar(false)}>{proposta.rotuloRecusar}</button>
      </div>}
      <div className="lia-voice-controls">
        {gravando ? <>
          <button type="button" className="lia-stop-recording" onClick={props.onGravar} aria-label="Parar e transcrever"><Square size={25} fill="currentColor" aria-hidden /></button>
          <span>Parar e transcrever</span>
          <button type="button" className="lia-text-button" onClick={props.onCancelar}>Cancelar sem enviar</button>
        </> : iniciando || transcrevendo ? <button type="button" className="lia-secondary-button" onClick={props.onCancelar}><X size={17} aria-hidden />Cancelar</button>
          : ocupado ? <p className="lia-voice-wait" role="status">Aguarde um instante…</p>
          : falando ? <button type="button" className="lia-secondary-button" onClick={props.onPararFala}><Square size={16} aria-hidden />Interromper áudio</button>
          : !proposta && <button type="button" className="lia-primary-button" onClick={props.onGravar}><Mic size={21} aria-hidden />Começar a falar</button>}
        {podeResponder && !falando && resposta && vozDisponivel && <button type="button" className="lia-text-button" onClick={props.onOuvir}><Volume2 size={17} aria-hidden />Ouvir resposta</button>}
      </div>
    </>}

    <footer className="lia-voice-footer">
      <button type="button" className="lia-text-button" onClick={props.onTexto}><MessageSquare size={16} aria-hidden />Prefiro digitar</button>
      <p>O microfone só é ativado quando você começa a gravar. O áudio é enviado para transcrição.</p>
      <AvisoUrgencia aviso={avisoUrgencia} />
      <details><summary>Quem vê esta conversa</summary><p>{quemVe}</p></details>
    </footer>
  </section>;
}

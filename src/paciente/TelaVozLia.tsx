import React, { useEffect, useState, type RefObject } from 'react';
import { ArrowLeft, Check, ExternalLink, MessageSquare, Mic, RotateCcw, Send, Square, Volume2, X } from 'lucide-react';
import type { AcaoMensagem, Mensagem, PropostaLia } from '../types';
import { LogoOncoFlow } from '../components/LogoOncoFlow';
import { OrbeLia, type EstadoOrbe } from './OrbeLia';
import { OndaVoz } from './OndaVoz';
import { AvisoUrgencia } from './AvisoUrgencia';
import type { AvisoUrgencia as Aviso } from '../types';
import { tr } from '../idioma';

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
  const titulo = iniciando ? tr('Preparando o microfone…', 'Getting the microphone ready…') : gravando ? tr('Estou ouvindo…', "I'm listening…")
    : transcrevendo ? tr('Entendendo sua fala…', 'Understanding what you said…') : revisando ? tr('Foi isso que você disse?', 'Is this what you said?')
    : ocupado ? tr('Consultando suas informações…', 'Looking up your information…') : falando ? tr('Respondendo…', 'Replying…')
    : resposta && estado === 'concluido' ? tr('Pronto.', 'Done.') : tr('Vamos conversar?', 'Shall we talk?');
  const podeResponder = !iniciando && !gravando && !transcrevendo && !revisando && !ocupado;
  const tempo = String(Math.floor(segundos / 60)).padStart(2, '0') + ':' + String(segundos % 60).padStart(2, '0');

  return <section className="lia-voice-screen" aria-label={tr("Conversa por voz", "Voice conversation")}>
    <header className="lia-voice-header">
      <button type="button" className="lia-icon-button" onClick={props.onVoltar} aria-label={tr("Voltar", "Back")}><ArrowLeft size={23} aria-hidden /></button>
      <div className="lia-voice-brand"><LogoOncoFlow className="w-8 h-8" decorativo /><div><strong>{nome}</strong><span>{tr('Assistente OncoFlow', 'OncoFlow Assistant')}</span></div></div>
      <button type="button" className="lia-icon-button" onClick={props.onTexto} aria-label={tr("Conversar por texto", "Chat by text")} title={tr("Conversar por texto", "Chat by text")}><MessageSquare size={21} aria-hidden /></button>
    </header>

    {atendente && <p className="lia-human-notice">{tr('Sua conversa está com', 'You are now talking with')} {atendente}.</p>}
    <div className="space-y-3" aria-live="polite">
      {avisos.map((aviso) => aviso.tipoSistema === 'urgencia'
        ? <AvisoUrgencia key={aviso.id} aviso={avisoUrgencia} destaque />
        : <div key={aviso.id} className="lia-spoken-response">
            <p>{aviso.texto}</p>
            {aviso.link && <a href={aviso.link} target="_blank" rel="noopener noreferrer" className="lia-secondary-button mt-3">
              {tr('Entrar na chamada', 'Join call')} <ExternalLink size={17} aria-hidden />
            </a>}
          </div>)}
    </div>
    <div className="lia-voice-title"><h1 aria-live="polite">{titulo}</h1><p>{gravando ? tr('Pode falar, estou aqui para ajudar.', "Go ahead, I'm here to help.") : transcrevendo ? tr('Transformando sua fala em texto.', 'Turning your speech into text.') : revisando ? tr('Você pode corrigir o texto antes de enviar.', 'You can correct the text before sending.') : tr('Você escolhe: falar ou escrever.', 'Your choice: speak or type.')}</p></div>

    <div className={revisando ? 'lia-voice-visual is-reviewing' : 'lia-voice-visual'}>
      <OrbeLia estado={estado} tamanho={revisando ? 132 : 246} nivel={nivel} />
      {!revisando && <OndaVoz estado={estado} nivel={nivel} />}
      {gravando && <p className="lia-record-time"><span aria-hidden />{tr('Gravando', 'Recording')} <time>{tempo}</time></p>}
    </div>

    {erro && <p className="lia-voice-error" role="alert">{erro}</p>}

    {revisando ? <div className="lia-voice-review">
      <label htmlFor="voz-texto-entendido">{tr('Revise antes de enviar', 'Review before sending')}</label>
      <textarea id="voz-texto-entendido" value={rascunho} onChange={(e) => props.onRascunho(e.target.value)} rows={4} />
      <button type="button" className="lia-primary-button" disabled={!rascunho.trim() || ocupado} onClick={props.onEnviar}><Send size={19} aria-hidden />{tr('Enviar mensagem', 'Send message')}</button>
      <button type="button" className="lia-secondary-button" onClick={props.onGravar}><RotateCcw size={17} aria-hidden />{tr('Gravar novamente', 'Record again')}</button>
    </div> : <>
      {podeResponder && resposta && <div className="lia-spoken-response">
        <p>{resposta.texto}</p>
        {resposta.status && <span className="lia-response-status"><Check size={13} aria-hidden />{({ consultado: tr('Informação consultada', 'Information looked up'), registrado: tr('Solicitação registrada', 'Request logged'), encaminhado: tr('Encaminhado para a equipe', 'Forwarded to the team'), confirmado: tr('Confirmado', 'Confirmed') })[resposta.status]}</span>}
        {resposta.acoes && <div className="lia-voice-actions">{resposta.acoes.map((acao) =>
          <button key={acao.rotulo} type="button" className="lia-secondary-button" onClick={() => props.onAcao(acao)}>{acao.rotulo}</button>
        )}</div>}
      </div>}
      {podeResponder && proposta && <div className="lia-voice-proposal">
        <p><strong>{tr('Antes de continuar', 'Before we continue')}</strong>{proposta.resumo}</p>
        <button type="button" className="lia-primary-button" onClick={() => props.onConfirmar(true)}>{proposta.rotuloConfirmar}</button>
        <button type="button" className="lia-secondary-button" onClick={() => props.onConfirmar(false)}>{proposta.rotuloRecusar}</button>
      </div>}
      <div className="lia-voice-controls">
        {gravando ? <>
          <button type="button" className="lia-stop-recording" onClick={props.onGravar} aria-label={tr("Parar e transcrever", "Stop and transcribe")}><Square size={25} fill="currentColor" aria-hidden /></button>
          <span>{tr('Parar e transcrever', 'Stop and transcribe')}</span>
          <button type="button" className="lia-text-button" onClick={props.onCancelar}>{tr('Cancelar sem enviar', 'Cancel without sending')}</button>
        </> : iniciando || transcrevendo ? <button type="button" className="lia-secondary-button" onClick={props.onCancelar}><X size={17} aria-hidden />{tr('Cancelar', 'Cancel')}</button>
          : ocupado ? <p className="lia-voice-wait" role="status">{tr('Aguarde um instante…', 'One moment…')}</p>
          : falando ? <button type="button" className="lia-secondary-button" onClick={props.onPararFala}><Square size={16} aria-hidden />{tr('Interromper áudio', 'Stop audio')}</button>
          : !proposta && <button type="button" className="lia-primary-button" onClick={props.onGravar}><Mic size={21} aria-hidden />{tr('Começar a falar', 'Start speaking')}</button>}
        {podeResponder && !falando && resposta && vozDisponivel && <button type="button" className="lia-text-button" onClick={props.onOuvir}><Volume2 size={17} aria-hidden />{tr('Ouvir resposta', 'Listen to reply')}</button>}
      </div>
    </>}

    <footer className="lia-voice-footer">
      <button type="button" className="lia-text-button" onClick={props.onTexto}><MessageSquare size={16} aria-hidden />{tr('Prefiro digitar', 'I\'d rather type')}</button>
      <p>{tr('O microfone só é ativado quando você começa a gravar. O áudio é enviado para transcrição.', 'The microphone only turns on when you start recording. The audio is sent for transcription.')}</p>
      <AvisoUrgencia aviso={avisoUrgencia} />
      <details><summary>{tr('Quem vê esta conversa', 'Who sees this conversation')}</summary><p>{quemVe}</p></details>
    </footer>
  </section>;
}

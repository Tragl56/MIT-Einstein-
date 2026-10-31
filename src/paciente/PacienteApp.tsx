// OncoFlow Paciente: app mobile-first da paciente, híbrido entre navegação visual e a Lia.
// Na demo roda em /paciente com a sessão fictícia da Maria.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { transcrever, usePaciente } from './api';
import { useFala, useGravador } from './voz';
import { TelaAgenda, TelaComoEstou, TelaDocumentos, TelaInicio, TelaJornada, type Tela } from './telas';
import { TelaLia } from './TelaLia';

type TamanhoFonte = 'normal' | 'grande' | 'muito-grande';

interface Preferencias {
  fonte: TamanhoFonte;
  velocidade: number;
  lerRespostas: boolean;
}

const PREFERENCIAS_PADRAO: Preferencias = { fonte: 'normal', velocidade: 1, lerRespostas: false };
const CHAVE_PREFERENCIAS = 'oncoflow-paciente-preferencias';
const ESCALA_FONTE: Record<TamanhoFonte, string> = { normal: '112.5%', grande: '125%', 'muito-grande': '137.5%' };

function lerPreferencias(): Preferencias {
  try {
    const salvo = localStorage.getItem(CHAVE_PREFERENCIAS);
    return salvo ? { ...PREFERENCIAS_PADRAO, ...JSON.parse(salvo) } : PREFERENCIAS_PADRAO;
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

export default function PacienteApp() {
  const { inicio, erro, ocupado, enviar, responder, checkin } = usePaciente();
  const gravador = useGravador();
  const fala = useFala();
  const [tela, setTela] = useState<Tela>('inicio');
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferencias>(lerPreferencias);
  const [prefsAbertas, setPrefsAbertas] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [erroVoz, setErroVoz] = useState<string | null>(null);

  // Tipografia ajustável no app (padrão 18 px), sem impedir o zoom do sistema.
  useEffect(() => {
    document.documentElement.style.fontSize = ESCALA_FONTE[prefs.fonte];
    try {
      localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs));
    } catch {
      // Preferências só não persistem entre visitas.
    }
  }, [prefs]);

  const irPara = useCallback(
    (destino: Tela) => {
      fala.parar();
      setErroVoz(null);
      setTela(destino);
      window.scrollTo({ top: 0 });
    },
    [fala]
  );

  const falar = useCallback((texto: string) => fala.falar(texto, prefs.velocidade), [fala, prefs.velocidade]);
  const falaComVelocidade = useMemo(
    () => ({ falando: fala.falando, disponivel: fala.disponivel, falar, parar: fala.parar }),
    [fala.falando, fala.disponivel, falar, fala.parar]
  );

  // Push-to-talk: toca para começar, toca de novo para parar e transcrever.
  const alternarGravacao = useCallback(
    async (aoTranscrever: (texto: string) => void) => {
      setErroVoz(null);
      if (gravador.gravando) {
        setTranscrevendo(true);
        const audio = await gravador.parar();
        const texto = audio ? await transcrever(audio.base64, audio.mimeType) : null;
        setTranscrevendo(false);
        if (texto) aoTranscrever(texto);
        else setErroVoz('Não consegui ouvir bem. Quer tentar de novo ou digitar? Você também pode tocar numa sugestão.');
        return;
      }
      const ok = await gravador.iniciar();
      if (!ok) setErroVoz('Não consegui usar o microfone. Você pode digitar ou tocar numa sugestão.');
    },
    [gravador]
  );

  const gravacao = {
    gravando: gravador.gravando,
    transcrevendo,
    erro: erroVoz,
    alternar: alternarGravacao,
    cancelar: gravador.cancelar,
  };

  const pedirLia = (texto: string) => {
    irPara('lia');
    enviar(texto, 'texto');
  };

  return (
    <div className="min-h-[100dvh] bg-fundo text-azul">
      <div className="max-w-[440px] mx-auto px-[max(16px,env(safe-area-inset-left))]">
        {erro && (
          <div role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-atencao-fundo border border-atencao-borda text-atencao px-3 py-2">
            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden />
            {erro}
          </div>
        )}

        {!inicio ? (
          <p className="py-10 text-center text-tinta-suave">Carregando…</p>
        ) : tela === 'inicio' ? (
          <TelaInicio inicio={inicio} irPara={irPara} onPreferencias={() => setPrefsAbertas(true)} />
        ) : tela === 'jornada' ? (
          <TelaJornada inicio={inicio} onVoltar={() => irPara('inicio')} />
        ) : tela === 'agenda' ? (
          <TelaAgenda inicio={inicio} onVoltar={() => irPara('inicio')} onOuvir={falar} onPedirLia={pedirLia} />
        ) : tela === 'documentos' ? (
          <TelaDocumentos
            inicio={inicio}
            documentoId={documentoId}
            onAbrir={setDocumentoId}
            onVoltar={() => irPara('inicio')}
            onOuvir={falar}
          />
        ) : tela === 'como-estou' ? (
          <TelaComoEstou
            inicio={inicio}
            ocupado={ocupado}
            onVoltar={() => irPara('inicio')}
            onEnviar={checkin}
            onFalarComLia={() => irPara('lia')}
            gravacao={gravacao}
          />
        ) : (
          <TelaLia
            inicio={inicio}
            ocupado={ocupado}
            onVoltar={() => irPara('inicio')}
            enviar={enviar}
            responder={responder}
            irPara={irPara}
            abrirDocumento={(id) => {
              setDocumentoId(id);
              irPara('documentos');
            }}
            fala={falaComVelocidade}
            lerRespostas={prefs.lerRespostas}
            gravacao={gravacao}
          />
        )}
      </div>

      {prefsAbertas && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="titulo-prefs">
          <div className="w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[max(20px,env(safe-area-inset-bottom))] space-y-5">
            <div className="flex items-center justify-between">
              <h2 id="titulo-prefs" className="text-lg font-bold text-azul">
                Leitura e voz
              </h2>
              <button type="button" onClick={() => setPrefsAbertas(false)} aria-label="Fechar" className="min-w-11 min-h-11 flex items-center justify-center cursor-pointer">
                <X className="w-6 h-6" aria-hidden />
              </button>
            </div>

            <fieldset className="space-y-2">
              <legend className="font-semibold text-azul mb-1">Tamanho do texto</legend>
              {(
                [
                  ['normal', 'Normal'],
                  ['grande', 'Grande'],
                  ['muito-grande', 'Muito grande'],
                ] as const
              ).map(([valor, rotulo]) => (
                <label key={valor} className="flex items-center gap-3 min-h-11 cursor-pointer">
                  <input
                    type="radio"
                    name="fonte"
                    checked={prefs.fonte === valor}
                    onChange={() => setPrefs({ ...prefs, fonte: valor })}
                    className="w-5 h-5 accent-verde"
                  />
                  {rotulo}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="font-semibold text-azul mb-1">Velocidade da voz</legend>
              <div className="flex gap-2">
                {[0.75, 1, 1.25].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={prefs.velocidade === v}
                    onClick={() => setPrefs({ ...prefs, velocidade: v })}
                    className={`flex-1 min-h-11 rounded-xl border-2 font-semibold cursor-pointer ${
                      prefs.velocidade === v ? 'border-verde bg-gelo text-azul' : 'border-linha text-azul'
                    }`}
                  >
                    {String(v).replace('.', ',')}×
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="flex items-center justify-between gap-3 min-h-11 cursor-pointer">
              <span className="font-semibold text-azul">Ler as respostas da Lia em voz alta</span>
              <input
                type="checkbox"
                checked={prefs.lerRespostas}
                onChange={(e) => setPrefs({ ...prefs, lerRespostas: e.target.checked })}
                className="w-6 h-6 accent-verde"
              />
            </label>
            {!fala.disponivel && <p className="text-sm text-tinta-suave">Este navegador não oferece leitura em voz alta.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

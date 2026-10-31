// Cliente da API do OncoFlow Pro. O estado vem do servidor (compartilhado com o app do paciente)
// e é atualizado a cada 2 segundos; as ações chamam a API e recarregam o estado em seguida.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Desfecho, EstadoPro, UsuarioEquipe } from '../types';

export async function chamarApi<T>(caminho: string, usuarioId?: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(caminho, {
    method: corpo === undefined ? 'GET' : 'POST',
    headers: {
      'content-type': 'application/json',
      ...(usuarioId ? { 'x-demo-usuario': usuarioId } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.mensagem || "We couldn't finish that right now. Please try again in a moment.");
  }
  return dados as T;
}

export interface AcoesPro {
  assumir: (pacienteId: string) => Promise<void>;
  devolver: (pacienteId: string) => Promise<void>;
  enviar: (pacienteId: string, texto: string) => Promise<void>;
  atualizarPlano: (pacienteId: string, texto: string, atualizadoEm: string) => Promise<void>;
  videochamada: (pacienteId: string) => Promise<string | undefined>;
  assumirPendencia: (pendenciaId: string) => Promise<void>;
  concluirPendencia: (pendenciaId: string, desfecho: Desfecho) => Promise<void>;
  resetarDemo: () => Promise<void>;
}

export function useEstadoPro(usuario: UsuarioEquipe | null) {
  const [estado, setEstado] = useState<EstadoPro | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const versao = useRef(0);

  const atualizar = useCallback(async () => {
    if (!usuario) return;
    try {
      const novo = await chamarApi<EstadoPro>('/api/pro/estado', usuario.id);
      setErro(null);
      if (novo.versao !== versao.current) {
        versao.current = novo.versao;
        setEstado(novo);
      }
    } catch {
      setErro("We couldn't load right now. Trying again…");
    }
  }, [usuario]);

  useEffect(() => {
    versao.current = 0;
    atualizar();
    const timer = setInterval(atualizar, 2000);
    return () => clearInterval(timer);
  }, [atualizar]);

  const acao = useCallback(
    async (caminho: string, corpo: unknown = {}) => {
      if (!usuario) return;
      try {
        await chamarApi(caminho, usuario.id, corpo);
        setErro(null);
      } catch (e) {
        setErro((e as Error).message);
      }
      await atualizar();
    },
    [usuario, atualizar]
  );

  const acoes: AcoesPro = {
    assumir: (id) => acao(`/api/pro/pacientes/${id}/assumir`),
    devolver: (id) => acao(`/api/pro/pacientes/${id}/devolver`),
    enviar: (id, texto) => acao(`/api/pro/pacientes/${id}/mensagens`, { texto }),
    atualizarPlano: (id, texto, atualizadoEm) => acao(`/api/pro/pacientes/${id}/plano`, { texto, atualizadoEm }),
    videochamada: async (id) => {
      if (!usuario) return undefined;
      try {
        const { link } = await chamarApi<{ link: string }>(`/api/pro/pacientes/${id}/videochamada`, usuario.id, {});
        await atualizar();
        return link;
      } catch (e) {
        setErro((e as Error).message);
        return undefined;
      }
    },
    assumirPendencia: (id) => acao(`/api/pro/pendencias/${id}/assumir`),
    concluirPendencia: (id, desfecho) => acao(`/api/pro/pendencias/${id}/concluir`, { desfecho }),
    resetarDemo: () => acao('/api/demo/reset'),
  };

  return { estado, erro, acoes };
}

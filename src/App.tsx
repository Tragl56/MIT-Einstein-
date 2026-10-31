// OncoFlow Pro: experiência da equipe, construída a partir do painel do IRIS.
// O estado agora vem do servidor (compartilhado com o OncoFlow Paciente em /paciente).

import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { UsuarioEquipe } from './types';
import { chamarApi, useEstadoPro } from './api/pro';
import { Navbar } from './components/Navbar';
import { EquipeView } from './components/EquipeView';
import { InternoView } from './components/InternoView';
import { LoginView } from './components/LoginView';

const CHAVE_USUARIO = 'oncoflow-pro-usuario';

function lerUsuarioSalvo(): string | null {
  try {
    return localStorage.getItem(CHAVE_USUARIO);
  } catch {
    return null;
  }
}

function salvarUsuario(id: string | null): void {
  try {
    if (id) localStorage.setItem(CHAVE_USUARIO, id);
    else localStorage.removeItem(CHAVE_USUARIO);
  } catch {
    // Sem armazenamento local, o login só não sobrevive a um recarregamento.
  }
}

export default function App() {
  const [usuarios, setUsuarios] = useState<UsuarioEquipe[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioEquipe | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'equipe' | 'interno'>('equipe');
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<string>('');

  useEffect(() => {
    chamarApi<{ usuarios: UsuarioEquipe[] }>('/api/demo/usuarios')
      .then(({ usuarios: lista }) => {
        setUsuarios(lista);
        const salvo = lista.find((u) => u.id === lerUsuarioSalvo());
        if (salvo) setUsuarioLogado(salvo);
      })
      .catch(() => setUsuarios([]));
  }, []);

  const { estado, erro, acoes } = useEstadoPro(usuarioLogado);
  const pacientes = estado?.pacientes ?? [];

  useEffect(() => {
    if (!pacienteSelecionadoId && pacientes[0]) setPacienteSelecionadoId(pacientes[0].id);
  }, [pacientes, pacienteSelecionadoId]);

  const entrar = (usuario: UsuarioEquipe) => {
    salvarUsuario(usuario.id);
    setUsuarioLogado(usuario);
  };

  const sair = () => {
    salvarUsuario(null);
    setUsuarioLogado(null);
  };

  // "Entrar na conversa": abre o Interno com o paciente e assume o atendimento (como no IRIS).
  const entrarNaConversa = async (pacienteId: string) => {
    setPacienteSelecionadoId(pacienteId);
    setAbaAtiva('interno');
    await acoes.assumir(pacienteId);
  };

  if (!usuarioLogado) {
    return <LoginView usuarios={usuarios} onLogin={entrar} />;
  }

  return (
    <div className="min-h-screen bg-fundo flex flex-col font-sans text-azul">
      <Navbar
        abaAtiva={abaAtiva}
        onTrocarAba={setAbaAtiva}
        usuario={usuarioLogado}
        onLogout={sair}
        pacientes={pacientes}
        onResetarDemo={acoes.resetarDemo}
      />

      {erro && (
        <div role="alert" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-atencao-fundo border border-atencao-borda text-atencao text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        </div>
      )}

      <main className="flex-1 pb-10">
        {!estado ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-sm text-tinta-suave">
            Carregando pacientes…
          </div>
        ) : abaAtiva === 'equipe' ? (
          <EquipeView
            estado={estado}
            usuarioAtual={usuarioLogado}
            acoes={acoes}
            pacienteSelecionadoId={pacienteSelecionadoId}
            onSelecionarPaciente={setPacienteSelecionadoId}
            onEntrarConversa={entrarNaConversa}
          />
        ) : (
          <InternoView
            pacientes={pacientes}
            usuarioAtual={usuarioLogado}
            acoes={acoes}
            minutosRetornoLia={estado.minutosRetornoLia}
            pacienteSelecionadoId={pacienteSelecionadoId}
            onSelecionarPaciente={setPacienteSelecionadoId}
          />
        )}
      </main>
    </div>
  );
}

// Entrada da equipe na demo (base: LoginView do IRIS). Mantém os "perfis rápidos" do IRIS e tira
// o campo de senha simulado: na demo não existe autenticação real.
// [PONTO DE INTEGRAÇÃO]: autenticação institucional com acesso por perfil, instituição, equipe e
// finalidade (skill oncoflow-seguranca-lgpd).

import React from 'react';
import { ArrowRight, Info } from 'lucide-react';
import type { UsuarioEquipe } from '../types';
import { LogoOncoFlow } from './LogoOncoFlow';
import { ROTULO_PAPEL } from './Pendencias';

interface LoginViewProps {
  usuarios: UsuarioEquipe[];
  onLogin: (usuario: UsuarioEquipe) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ usuarios, onLogin }) => (
  <div className="min-h-screen bg-fundo flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
      <LogoOncoFlow className="w-16 h-16 mx-auto mb-4" />
      <h1 className="text-2xl sm:text-3xl font-bold text-azul tracking-tight">OncoFlow Pro</h1>
      <p className="mt-1 text-sm font-medium text-verde">Cada etapa do cuidado, conectada.</p>
      <p className="mt-2 text-xs text-tinta-suave max-w-xs mx-auto">
        Painel da equipe para acompanhar pacientes, pendências e conversas.
      </p>
    </div>

    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-6 sm:px-10 border border-linha rounded-xl space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-tinta-suave">Entrar como (perfis da demo)</h2>
        {usuarios.length === 0 ? (
          <p className="text-sm text-tinta-suave">Carregando perfis…</p>
        ) : (
          <div className="grid gap-2">
            {usuarios.map((u) => (
              <button
                key={u.id}
                type="button"
                id={`btn-entrar-${u.id}`}
                onClick={() => onLogin(u)}
                className="flex items-center justify-between gap-3 text-left p-3 rounded-lg border border-linha hover:border-verde hover:bg-gelo/50 cursor-pointer"
              >
                <span>
                  <span className="block text-sm font-semibold text-azul">{u.nome}</span>
                  <span className="block text-xs text-tinta-suave">
                    {ROTULO_PAPEL[u.papel]} · {u.cargo}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 text-verde shrink-0" aria-hidden />
              </button>
            ))}
          </div>
        )}

        <div className="p-3 bg-gelo border border-linha rounded-lg flex items-start gap-2.5 text-xs text-azul">
          <Info className="w-4 h-4 text-verde shrink-0 mt-0.5" aria-hidden />
          <div>
            <span className="font-semibold block">Demonstração com dados fictícios</span>
            Sem autenticação real nesta fase. O acesso por perfil, instituição, equipe e finalidade entra antes de qualquer piloto.
          </div>
        </div>
      </div>
    </div>
  </div>
);

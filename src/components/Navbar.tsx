import React from 'react';
import { Users, MessageSquareText, Smartphone, LogOut, RotateCcw } from 'lucide-react';
import type { UsuarioEquipe, PacientePro } from '../types';
import { LogoOncoFlow } from './LogoOncoFlow';

interface NavbarProps {
  abaAtiva: 'equipe' | 'interno';
  onTrocarAba: (aba: 'equipe' | 'interno') => void;
  usuario: UsuarioEquipe;
  onLogout: () => void;
  pacientes: PacientePro[];
  onResetarDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  abaAtiva,
  onTrocarAba,
  usuario,
  onLogout,
  pacientes,
  onResetarDemo,
}) => {
  const comSinal = pacientes.filter((p) => p.situacao === 'sinal_a_revisar').length;
  const aguardando = pacientes.filter((p) => p.situacao === 'aguardando_revisao').length;
  const comProfissional = pacientes.filter((p) => p.modoConversa === 'profissional').length;

  const classeAba = (ativa: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
      ativa ? 'bg-white text-azul shadow-xs border border-linha' : 'text-tinta-suave hover:text-azul'
    }`;

  return (
    <header className="bg-white border-b border-linha sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between min-h-16 py-2 gap-3">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <LogoOncoFlow className="w-9 h-9" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-azul tracking-tight">OncoFlow</span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-gelo text-azul rounded-full border border-linha">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] text-tinta-suave hidden xl:block">Cada etapa do cuidado, conectada.</p>
              </div>
            </div>

            <nav aria-label="Seções" className="flex items-center gap-1 sm:gap-2 bg-gelo p-1 rounded-lg border border-linha">
              <button type="button" id="tab-nav-equipe" onClick={() => onTrocarAba('equipe')} className={classeAba(abaAtiva === 'equipe')}>
                <Users className="w-3.5 h-3.5" aria-hidden />
                <span>Equipe</span>
                {comSinal > 0 && (
                  <span className="px-1.5 rounded-full bg-urgente text-white text-[10px] font-bold" title="Pacientes com sinal a revisar">
                    {comSinal}
                  </span>
                )}
                {aguardando > 0 && (
                  <span className="px-1.5 rounded-full bg-atencao text-white text-[10px] font-bold" title="Pacientes aguardando revisão">
                    {aguardando}
                  </span>
                )}
              </button>
              <button type="button" id="tab-nav-interno" onClick={() => onTrocarAba('interno')} className={classeAba(abaAtiva === 'interno')}>
                <MessageSquareText className="w-3.5 h-3.5" aria-hidden />
                <span>Interno</span>
                {comProfissional > 0 && (
                  <span className="px-1.5 rounded-full bg-gelo text-azul border border-linha text-[10px]" title="Conversas com profissional">
                    {comProfissional}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/paciente"
              target="_blank"
              rel="noopener"
              title="Abrir o app da paciente Maria (demo) em outra aba"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-azul bg-gelo hover:bg-linha border border-linha rounded-lg transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden xl:inline">App do paciente</span>
            </a>
            <button
              type="button"
              onClick={onResetarDemo}
              title="Voltar os dados fictícios ao estado inicial"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-tinta-suave hover:text-azul border border-linha rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden xl:inline">Reiniciar demo</span>
            </button>

            <div className="flex items-center gap-2.5 pl-2 border-l border-linha">
              <div className="w-8 h-8 rounded-full bg-azul text-white flex items-center justify-center text-xs font-bold">
                {usuario.nome
                  .replace(/^(Dra?|Enf)\.\s*/, '')
                  .split(' ')
                  .filter((_, i, a) => i === 0 || i === a.length - 1)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-semibold text-azul leading-tight">{usuario.nome}</div>
                <div className="text-[10px] text-tinta-suave leading-tight">{usuario.cargo}</div>
              </div>
              <button
                type="button"
                id="btn-logout"
                onClick={onLogout}
                title="Sair"
                aria-label="Sair"
                className="p-1.5 text-tinta-suave hover:text-urgente hover:bg-gelo rounded-md transition-colors cursor-pointer ml-1"
              >
                <LogOut className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

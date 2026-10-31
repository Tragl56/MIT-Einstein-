import React from 'react';
import { Users, MessageSquareText, Smartphone, LogOut, RotateCcw, ArrowUpRight } from 'lucide-react';
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
  abaAtiva, onTrocarAba, usuario, onLogout, pacientes, onResetarDemo,
}) => {
  const aguardando = pacientes.filter((p) => p.situacao !== 'sem_pendencias').length;
  const comProfissional = pacientes.filter((p) => p.modoConversa === 'profissional').length;
  const iniciais = usuario.nome.replace(/^(Dra?|Enf)\.\s*/, '').split(' ')
    .filter((_, i, a) => i === 0 || i === a.length - 1).map((n) => n[0]).join('').toUpperCase();

  return (
    <aside className="pro-sidebar" aria-label="Navegação do OncoFlow Pro">
      <a href="#conteudo-principal" className="skip-link">Ir para o conteúdo</a>
      <div className="sidebar-brand">
        <LogoOncoFlow className="w-10 h-10 shrink-0" />
        <div><div className="sidebar-wordmark">OncoFlow <span>Pro</span></div>
          <p>Jornadas que se conectam.</p></div>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-section-label">Seu espaço de trabalho</p>
        <nav className="sidebar-nav" aria-label="Seções">
          <button type="button" id="tab-nav-equipe" aria-current={abaAtiva === 'equipe' ? 'page' : undefined}
            onClick={() => onTrocarAba('equipe')} className={`sidebar-nav-item ${abaAtiva === 'equipe' ? 'is-active' : ''}`}>
            <Users size={19} aria-hidden /><span>Pacientes</span>
            {aguardando > 0 && <span className="sidebar-count" aria-label={`${aguardando} pacientes com pendências`}>{aguardando}</span>}
          </button>
          <button type="button" id="tab-nav-interno" aria-current={abaAtiva === 'interno' ? 'page' : undefined}
            onClick={() => onTrocarAba('interno')} className={`sidebar-nav-item ${abaAtiva === 'interno' ? 'is-active' : ''}`}>
            <MessageSquareText size={19} aria-hidden /><span>Conversas</span>
            {comProfissional > 0 && <span className="sidebar-count" aria-label={`${comProfissional} conversas com profissional`}>{comProfissional}</span>}
          </button>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-demo"><span className="demo-dot" aria-hidden /><span>Ambiente de demonstração</span></div>
        <a href="/paciente" target="_blank" rel="noopener noreferrer" aria-label="App do paciente" title="App do paciente" className="sidebar-utility">
          <Smartphone size={17} aria-hidden /><span>App do paciente</span><ArrowUpRight size={15} aria-hidden />
        </a>
        <button type="button" onClick={onResetarDemo} aria-label="Reiniciar demo" title="Reiniciar demo" className="sidebar-utility">
          <RotateCcw size={16} aria-hidden /><span>Reiniciar demo</span>
        </button>
        <div className="sidebar-profile">
          <span className="sidebar-avatar" aria-hidden>{iniciais}</span>
          <div className="sidebar-profile-text"><strong>{usuario.nome}</strong><span>{usuario.cargo}</span></div>
          <button type="button" id="btn-logout" onClick={onLogout} aria-label="Sair" title="Sair" className="sidebar-logout">
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
};

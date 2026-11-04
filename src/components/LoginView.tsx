// Seleção de perfis fictícios. Esta tela não representa autenticação institucional.
import React from 'react';
import { ArrowRight, Info, Stethoscope, HeartPulse, Route, Smartphone, Check } from 'lucide-react';
import type { UsuarioEquipe } from '../types';
import { AssinaturaOncoFlow } from './LogoOncoFlow';
import { ROTULO_PAPEL } from './Pendencias';
import { SeletorIdioma } from './SeletorIdioma';
import { tr } from '../idioma';

interface LoginViewProps { usuarios: UsuarioEquipe[]; onLogin: (usuario: UsuarioEquipe) => void; }
const ICONE_PAPEL = { medico: Stethoscope, enfermagem: HeartPulse, navegacao: Route };

export const LoginView: React.FC<LoginViewProps> = ({ usuarios, onLogin }) => (
  <main className="login-page">
    <section className="login-story" aria-labelledby="titulo-oncoflow">
      <div className="login-brand"><AssinaturaOncoFlow className="h-11 w-auto" /><span className="pro-brand-badge">Pro</span></div>
      <div className="login-story-content">
        <h1 id="titulo-oncoflow">{tr('Cada etapa do cuidado, conectada.', 'Every step of care, connected.')}</h1>
        <p>{tr('Um espaço para a equipe acompanhar a jornada, organizar os próximos passos e estar mais perto do paciente.', 'A space for the care team to follow the journey, organize next steps and stay closer to the patient.')}</p>
        <div className="login-journey" aria-label={tr("Consulta, navegação e paciente conectados", "Appointment, navigation and patient connected")}>
          <div className="login-journey-line" aria-hidden />
          <div className="login-journey-step"><span><Stethoscope size={22} aria-hidden /></span><div><strong>{tr('Na consulta', 'In the appointment')}</strong><small>{tr('Escutar e compreender', 'Listen and understand')}</small></div><Check size={17} aria-hidden /></div>
          <div className="login-journey-step"><span><Route size={22} aria-hidden /></span><div><strong>{tr('Com a equipe', 'With the team')}</strong><small>{tr('Organizar e acompanhar', 'Organize and follow up')}</small></div><Check size={17} aria-hidden /></div>
          <div className="login-journey-step"><span><Smartphone size={22} aria-hidden /></span><div><strong>{tr('Com o paciente', 'With the patient')}</strong><small>{tr('Dar clareza ao próximo passo', 'Make the next step clear')}</small></div><ArrowRight size={17} aria-hidden /></div>
        </div>
      </div>
      <p className="login-story-footer">{tr('Tecnologia a serviço de um cuidado mais conectado.', 'Technology for more connected care.')}</p>
    </section>

    <section className="login-access" aria-labelledby="titulo-acesso">
      <div className="login-access-content">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="demo-pill"><span className="demo-dot" aria-hidden />{tr('Demonstração interativa', 'Interactive demo')}</span>
          <SeletorIdioma />
        </div>
        <h2 id="titulo-acesso">{tr('Bem-vindo ao', 'Welcome to')}<br />OncoFlow Pro.</h2>
        <p className="login-description">{tr('Escolha um perfil para explorar o espaço da equipe.', 'Choose a profile to explore the team workspace.')}</p>
        <div className="login-users">
          {usuarios.length === 0 ? <p role="status">{tr('Carregando perfis…', 'Loading profiles…')}</p> : usuarios.map((u) => {
            const Icone = ICONE_PAPEL[u.papel];
            return <button key={u.id} type="button" id={`btn-entrar-${u.id}`} aria-label={tr(`Entrar como ${u.nome}, ${ROTULO_PAPEL[u.papel]}`, `Sign in as ${u.nome}, ${ROTULO_PAPEL[u.papel]}`)} onClick={() => onLogin(u)} className="login-user">
              <span className={`login-user-icon role-${u.papel}`}><Icone size={23} aria-hidden /></span>
              <span className="login-user-info"><small>{ROTULO_PAPEL[u.papel]}</small><strong>{u.nome}</strong><span>{u.cargo}</span></span>
              <ArrowRight size={19} className="login-user-arrow" aria-hidden />
            </button>;
          })}
        </div>
        <div className="login-disclosure"><Info size={18} aria-hidden /><p><strong>{tr('Demonstração com dados fictícios.', 'Demo with fictional data.')}</strong> {tr('Sem autenticação real nesta fase. O acesso por perfil, instituição, equipe e finalidade entra antes de qualquer piloto.', 'No real authentication at this stage. Access by role, institution, team and purpose comes before any pilot.')}</p></div>
        <a href="/app/" className="login-patient-link"><Smartphone size={17} aria-hidden />{tr('Conhecer o app do paciente', 'See the patient app')}<ArrowRight size={16} aria-hidden /></a>
      </div>
    </section>
  </main>
);

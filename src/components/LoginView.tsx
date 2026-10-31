// Seleção de perfis fictícios. Esta tela não representa autenticação institucional.
import React from 'react';
import { ArrowRight, Info, Stethoscope, HeartPulse, Route, Smartphone, Check } from 'lucide-react';
import type { UsuarioEquipe } from '../types';
import { LogoOncoFlow } from './LogoOncoFlow';
import { ROTULO_PAPEL } from './Pendencias';

interface LoginViewProps { usuarios: UsuarioEquipe[]; onLogin: (usuario: UsuarioEquipe) => void; }
const ICONE_PAPEL = { medico: Stethoscope, enfermagem: HeartPulse, navegacao: Route };

export const LoginView: React.FC<LoginViewProps> = ({ usuarios, onLogin }) => (
  <main className="login-page">
    <section className="login-story" aria-labelledby="titulo-oncoflow">
      <div className="login-brand"><LogoOncoFlow className="w-11 h-11" /><span>OncoFlow <small>Pro</small></span></div>
      <div className="login-story-content">
        <h1 id="titulo-oncoflow">Cada etapa do cuidado, conectada.</h1>
        <p>Um espaço para a equipe acompanhar a jornada, organizar os próximos passos e estar mais perto do paciente.</p>
        <div className="login-journey" aria-label="Consulta, navegação e paciente conectados">
          <div className="login-journey-line" aria-hidden />
          <div className="login-journey-step"><span><Stethoscope size={22} aria-hidden /></span><div><strong>Na consulta</strong><small>Escutar e compreender</small></div><Check size={17} aria-hidden /></div>
          <div className="login-journey-step"><span><Route size={22} aria-hidden /></span><div><strong>Com a equipe</strong><small>Organizar e acompanhar</small></div><Check size={17} aria-hidden /></div>
          <div className="login-journey-step"><span><Smartphone size={22} aria-hidden /></span><div><strong>Com o paciente</strong><small>Dar clareza ao próximo passo</small></div><ArrowRight size={17} aria-hidden /></div>
        </div>
      </div>
      <p className="login-story-footer">Tecnologia a serviço de um cuidado mais conectado.</p>
    </section>

    <section className="login-access" aria-labelledby="titulo-acesso">
      <div className="login-access-content">
        <span className="demo-pill"><span className="demo-dot" aria-hidden />Demonstração interativa</span>
        <h2 id="titulo-acesso">Bem-vindo ao<br />OncoFlow Pro.</h2>
        <p className="login-description">Escolha um perfil para explorar o espaço da equipe.</p>
        <div className="login-users">
          {usuarios.length === 0 ? <p role="status">Carregando perfis…</p> : usuarios.map((u) => {
            const Icone = ICONE_PAPEL[u.papel];
            return <button key={u.id} type="button" id={`btn-entrar-${u.id}`} aria-label={`Entrar como ${u.nome}, ${ROTULO_PAPEL[u.papel]}`} onClick={() => onLogin(u)} className="login-user">
              <span className={`login-user-icon role-${u.papel}`}><Icone size={23} aria-hidden /></span>
              <span className="login-user-info"><small>{ROTULO_PAPEL[u.papel]}</small><strong>{u.nome}</strong><span>{u.cargo}</span></span>
              <ArrowRight size={19} className="login-user-arrow" aria-hidden />
            </button>;
          })}
        </div>
        <div className="login-disclosure"><Info size={18} aria-hidden /><p><strong>Demonstração com dados fictícios.</strong> Sem autenticação real nesta fase. O acesso por perfil, instituição, equipe e finalidade entra antes de qualquer piloto.</p></div>
        <a href="/paciente" className="login-patient-link"><Smartphone size={17} aria-hidden />Conhecer o app do paciente<ArrowRight size={16} aria-hidden /></a>
      </div>
    </section>
  </main>
);

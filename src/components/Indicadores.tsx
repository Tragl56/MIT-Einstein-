// Indicadores do topo do Início. Todos calculados dos dados da demo (nada fixo na tela).

import React from 'react';
import { AlertTriangle, CalendarDays, ClipboardList, Users } from 'lucide-react';
import type { PacientePro } from '../types';

interface IndicadoresProps {
  pacientes: PacientePro[];
  onAbrir: (destino: 'pacientes' | 'pendencias' | 'sinais') => void;
}

export const Indicadores: React.FC<IndicadoresProps> = ({ pacientes, onAbrir }) => {
  const agora = Date.now();
  const em7dias = agora + 7 * 86_400_000;
  const compromissosSemana = pacientes.reduce(
    (n, p) => n + p.agenda.filter((c) => {
      const t = new Date(c.dataHora).getTime();
      return t > agora && t <= em7dias;
    }).length,
    0
  );
  const abertas = pacientes.flatMap((p) => p.pendencias.filter((pe) => pe.estado !== 'concluida'));
  const sinais = abertas.filter((pe) => pe.tipo === 'sinal_urgencia').length;

  const cartoes = [
    { valor: pacientes.length, rotulo: 'Pacientes ativos', Icone: Users, cor: 'text-verde', destino: 'pacientes' as const },
    { valor: compromissosSemana, rotulo: 'Compromissos em 7 dias', Icone: CalendarDays, cor: 'text-verde', destino: 'pacientes' as const },
    { valor: abertas.length - sinais, rotulo: 'Aguardando revisão', Icone: ClipboardList, cor: 'text-verde', destino: 'pendencias' as const },
    { valor: sinais, rotulo: 'Sinais de atenção', Icone: AlertTriangle, cor: sinais > 0 ? 'text-urgente' : 'text-verde', destino: 'sinais' as const },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cartoes.map(({ valor, rotulo, Icone, cor, destino }) => (
        <button
          key={rotulo}
          type="button"
          onClick={() => onAbrir(destino)}
          className="flex items-center gap-4 rounded-2xl bg-white border border-linha/70 shadow-[0_2px_12px_-6px_rgba(18,59,86,0.15)] px-6 py-5 text-left cursor-pointer hover:border-verde/50"
        >
          <Icone className={`w-9 h-9 shrink-0 ${cor}`} strokeWidth={1.6} aria-hidden />
          <span>
            <span className="block text-3xl font-bold text-azul tabular-nums leading-none">{valor}</span>
            <span className="block mt-1.5 text-tinta-suave">{rotulo}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

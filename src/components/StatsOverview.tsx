/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Visit, VisitStatus } from "../types";
import { CalendarDays } from "lucide-react";

interface StatsOverviewProps {
  visits: Visit[];
  selectedDate: string; // YYYY-MM-DD
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ visits, selectedDate }) => {
  // Format the selected date to a human readable format
  const getFormattedDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const dayVisits = visits.filter(v => v.date === selectedDate);
  const total = dayVisits.length;
  const completed = dayVisits.filter(v => v.status === VisitStatus.Completed).length;
  const inProgress = dayVisits.filter(v => v.status === VisitStatus.InProgress).length;
  const pending = dayVisits.filter(v => v.status === VisitStatus.Pending).length;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div id="stats-overview" className="bg-amber-500 text-slate-950 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between select-none">
      
      {/* Decorative top glass flare */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-28 h-28 bg-white/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header layer */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] uppercase tracking-wider text-slate-900">
          <CalendarDays className="w-4 h-4 text-slate-900" />
          <span>Agenda de Serviços</span>
        </div>
        
        <span className="bg-slate-950 text-amber-500 text-[10px] font-black font-mono uppercase px-2.5 py-1 rounded-full tracking-wider shadow-sm">
          {total === 0 ? "Sem Visitas" : `${pending} Pendentes`}
        </span>
      </div>

      {/* Main Stats Callout (Bento Card Style) */}
      <div className="mb-4 relative z-10">
        {total > 0 ? (
          <div>
            <div className="text-3xl font-black font-display tracking-tighter text-slate-950 leading-none">
              {percentage}% Concluído
            </div>
            <p className="text-slate-900 text-xs font-semibold font-mono mt-1 tracking-tight">
              {completed} de {total} tarefas concluídas hoje.
            </p>
          </div>
        ) : (
          <div>
            <div className="text-2xl font-black font-display tracking-tighter text-slate-950 leading-none">
              Dia Livre
            </div>
            <p className="text-slate-900 text-xs font-semibold font-mono mt-1 tracking-tight">
              Nenhuma visita agendada para hoje.
            </p>
          </div>
        )}
      </div>

      {/* Mini Grid showing direct numeric indicators */}
      <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-950/15 relative z-10">
        <div className="bg-slate-950 text-white p-2 rounded-2xl text-center shadow-xs">
          <div className="text-sm font-black font-mono leading-none text-slate-200">{total}</div>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1 truncate">Total</p>
        </div>

        <div className="bg-slate-950 text-white p-2 rounded-2xl text-center shadow-xs">
          <div className="text-sm font-black font-mono leading-none text-amber-500">{pending}</div>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1 truncate">Atraso</p>
        </div>

        <div className="bg-slate-950 text-white p-2 rounded-2xl text-center shadow-xs">
          <div className="text-sm font-black font-mono leading-none text-sky-405">{inProgress}</div>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1 truncate">Ativo</p>
        </div>

        <div className="bg-slate-950 text-white p-2 rounded-2xl text-center shadow-xs">
          <div className="text-sm font-black font-mono leading-none text-emerald-400">{completed}</div>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1 truncate">Fim</p>
        </div>
      </div>

      {/* Selected day indicator label */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-950/10 flex justify-between items-center text-[10px] font-bold font-mono text-slate-900 relative z-10">
        <span className="capitalize">{getFormattedDate(selectedDate)}</span>
        <span className="tracking-wide">SELMAK BALANÇAS</span>
      </div>

    </div>
  );
};

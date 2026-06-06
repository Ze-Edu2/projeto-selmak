/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Visit } from "../types";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatDateString } from "../seedData";

interface CalendarGridProps {
  visits: Visit[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  visits,
  selectedDate,
  onSelectDate,
}) => {
  // Current month displayed in the calendar (may differ from selectedDate's month)
  const initialDateParts = selectedDate.split("-");
  const [currentYear, setCurrentYear] = useState(
    initialDateParts.length === 3 ? parseInt(initialDateParts[0], 10) : new Date().getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    initialDateParts.length === 3 ? parseInt(initialDateParts[1], 10) - 1 : new Date().getMonth()
  );

  const monthsList = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Helper to handle navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onSelectDate(formatDateString(today));
  };

  // Compute days
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells: { day: number; dateString: string; isCurrentMonth: boolean }[] = [];

  // Add trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYearIdx = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dayVal = daysInPrevMonth - i;
    
    const mStr = String(prevMonthIdx + 1).padStart(2, "0");
    const dStr = String(dayVal).padStart(2, "0");
    calendarCells.push({
      day: dayVal,
      dateString: `${prevYearIdx}-${mStr}-${dStr}`,
      isCurrentMonth: false,
    });
  }

  // Add days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(currentMonth + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    calendarCells.push({
      day: d,
      dateString: `${currentYear}-${mStr}-${dStr}`,
      isCurrentMonth: true,
    });
  }

  // Fill in trailing days for next month to complete 6-row or 5-row look (multiples of 7)
  const remainingCells = 42 - calendarCells.length; // standard 6-row calendar
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYearIdx = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    const mStr = String(nextMonthIdx + 1).padStart(2, "0");
    const dStr = String(i).padStart(2, "0");
    calendarCells.push({
      day: i,
      dateString: `${nextYearIdx}-${mStr}-${dStr}`,
      isCurrentMonth: false,
    });
  }

  // Group visits count by date
  const visitCountsByDate = visits.reduce((acc, visit) => {
    acc[visit.date] = (acc[visit.date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const isTodayStr = formatDateString(new Date());

  return (
    <div id="calendar-container" className="bg-slate-900 rounded-3xl shadow-lg border border-slate-800 overflow-hidden select-none">
      {/* Month Switcher Head */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-950/40 border-b border-slate-800">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest font-mono text-slate-500 font-bold">
            {currentYear}
          </span>
          <h2 id="calendar-title" className="text-base font-black font-display tracking-tight text-white capitalize">
            {monthsList[currentMonth]}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="today-button"
            onClick={goToToday}
            className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider text-amber-500 bg-slate-900 border border-slate-800 active:bg-slate-800 rounded-xl shadow-xs flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            Hoje
          </button>
          
          <div className="flex items-center border border-slate-800 bg-slate-950 rounded-xl p-0.5 shadow-xs">
            <button
              id="prev-month-button"
              onClick={prevMonth}
              aria-label="Militar mês anterior"
              className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg active:bg-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="next-month-button"
              onClick={nextMonth}
              aria-label="Próximo mês"
              className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg active:bg-slate-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Day Labels */}
      <div className="grid grid-cols-7 gap-0 text-center bg-slate-950/20 py-2 border-b border-slate-850">
        {daysOfWeek.map((day, i) => (
          <span
            key={i}
            className={`text-[10px] font-bold tracking-widest uppercase font-mono ${
              i === 0 || i === 6 ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Monthly Days Grid */}
      <div id="calendar-days-grid" className="grid grid-cols-7 gap-1 bg-slate-950 p-1">
        {calendarCells.map((cell, idx) => {
          const isSelected = cell.dateString === selectedDate;
          const isToday = cell.dateString === isTodayStr;
          const count = visitCountsByDate[cell.dateString] || 0;

          return (
            <button
              key={idx}
              id={`day-cell-${cell.dateString}`}
              onClick={() => onSelectDate(cell.dateString)}
              className={`relative min-h-[52px] flex flex-col items-center justify-between p-1.5 rounded-2xl transition-all text-left overflow-hidden ${
                cell.isCurrentMonth ? "bg-slate-900/60" : "bg-slate-900/10 text-slate-600"
              } ${
                isSelected 
                  ? "bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400 z-10" 
                  : "hover:bg-slate-900 active:bg-slate-850"
              }`}
            >
              {/* Day Number */}
              <span
                className={`text-xs font-bold leading-none select-none flex items-center justify-center rounded-full w-5 h-5 ${
                  isSelected
                    ? "text-slate-950 font-black"
                    : isToday
                    ? "text-amber-500 font-black underline decoration-2 underline-offset-4"
                    : cell.isCurrentMonth
                    ? "text-slate-200"
                    : "text-slate-600"
                }`}
              >
                {cell.day}
              </span>

              {/* Badges / Dots indicators */}
              {count > 0 && (
                <div className="flex gap-0.5 mt-auto flex-wrap justify-center w-full max-w-full">
                  {/* Subtle small count bubble or dot depending on selection state */}
                  {isSelected ? (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-950 text-amber-500 rounded-md min-w-4 text-center leading-3">
                      {count}
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-amber-400 rounded-md min-w-4 text-center leading-3">
                      {count}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

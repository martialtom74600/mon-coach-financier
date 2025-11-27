'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/app/lib/logic';

const CalendarView = ({ timeline }: { timeline: any[] }) => {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  // Reset l'index si la timeline change (pour éviter de pointer sur un mois qui n'existe plus)
  useEffect(() => {
    setCurrentMonthIndex(0);
  }, [timeline]);

  // SÉCURITÉ 1 : Chargement
  if (!timeline) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
        <Loader2 size={32} className="animate-spin mb-3 text-indigo-500" />
        <p className="text-sm font-medium">Chargement...</p>
      </div>
    );
  }

  // SÉCURITÉ 2 : Pas de données
  if (timeline.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
        <AlertCircle size={32} className="mb-3 text-slate-300" />
        <p className="text-sm font-medium">Aucune projection disponible.</p>
        <p className="text-xs mt-2">Vérifie que ton profil contient des revenus ou un solde initial.</p>
      </div>
    );
  }

  const currentMonth = timeline[currentMonthIndex];

  // SÉCURITÉ 3 : Index hors limite
  if (!currentMonth) return null;

  const goNext = () => {
    if (currentMonthIndex < timeline.length - 1) setCurrentMonthIndex(currentMonthIndex + 1);
  };

  const goPrev = () => {
    if (currentMonthIndex > 0) setCurrentMonthIndex(currentMonthIndex - 1);
  };

  // Calcul des cases vides (Décalage du 1er jour pour que le mois commence bien sous le bon jour)
  // On sécurise la date par défaut
  const firstDateStr = currentMonth.days && currentMonth.days[0] ? currentMonth.days[0].date : new Date().toISOString();
  const firstDayObj = new Date(firstDateStr);
  const firstDayIndex = firstDayObj.getDay(); // 0 = Dimanche
  
  // On veut Lundi = 0 ... Dimanche = 6
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 
  const blanks = Array(Math.max(0, startOffset)).fill(null);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <button onClick={goPrev} disabled={currentMonthIndex === 0} className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors text-slate-600">
            <ChevronLeft size={24} />
        </button>
        
        <div className="flex flex-col items-center">
            <h3 className="text-xl font-black text-slate-800 capitalize flex items-center gap-2">
                <CalendarIcon size={20} className="text-indigo-500" />
                {currentMonth.label}
            </h3>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">
                Solde Fin de mois : <span className={currentMonth.stats.balanceEnd < 0 ? 'text-rose-500' : 'text-emerald-600'}>{formatCurrency(currentMonth.stats.balanceEnd)}</span>
            </span>
        </div>

        <button onClick={goNext} disabled={currentMonthIndex === timeline.length - 1} className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors text-slate-600">
            <ChevronRight size={24} />
        </button>
      </div>

      {/* JOURS SEMAINE */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
        {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map(d => (
            <div key={d} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {d}
            </div>
        ))}
      </div>

      {/* GRILLE */}
      <div className="grid grid-cols-7 auto-rows-fr bg-white">
        {/* Cases vides début de mois */}
        {blanks.map((_, i) => <div key={`blank-${i}`} className="min-h-[100px] sm:min-h-[120px] bg-slate-50/30 border-b border-r border-slate-50"></div>)}

        {/* Jours réels */}
        {currentMonth.days && currentMonth.days.map((day: any) => {
            const isNegative = day.balance < 0;
            
            return (
                <div key={day.date} className={`min-h-[100px] sm:min-h-[120px] border-b border-r border-slate-100 p-2 relative group hover:bg-slate-50 transition-colors flex flex-col justify-between ${isNegative ? 'bg-rose-50/30' : ''}`}>
                    
                    {/* En-tête jour */}
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs sm:text-sm font-bold ${isNegative ? 'text-rose-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                            {day.dayOfMonth}
                        </span>
                        <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isNegative ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            {formatCurrency(day.balance)}
                        </span>
                    </div>

                    {/* Liste événements */}
                    <div className="space-y-1 flex-1 overflow-hidden">
                        {day.events.slice(0, 3).map((e: any) => (
                            <div key={e.id} className={`text-[8px] sm:text-[9px] truncate px-1 py-0.5 rounded-sm font-medium flex justify-between items-center ${e.amount < 0 ? 'text-slate-600 bg-slate-100' : 'text-emerald-700 bg-emerald-50'}`}>
                                <span className="truncate mr-1">{e.name}</span>
                                <span className="font-bold opacity-80">{Math.round(Math.abs(e.amount))}</span>
                            </div>
                        ))}
                        {day.events.length > 3 && (
                            <div className="text-[9px] text-slate-400 pl-1 italic">
                                + {day.events.length - 3} autres
                            </div>
                        )}
                    </div>

                </div>
            );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
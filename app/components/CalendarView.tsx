'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/app/lib/logic';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  getDay, 
  isPast,
  isToday,
  format
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CalendarView({ timeline }: { timeline: any[] }) {
  // État : Le mois qu'on est en train de regarder (par défaut : aujourd'hui)
  const [viewDate, setViewDate] = useState(new Date());

  // 1. Calculs de la grille du mois sélectionné
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  // 2. Navigation
  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(subMonths(viewDate, 1));
  const jumpToToday = () => setViewDate(new Date());

  // 3. Analyse du mois pour les alertes (uniquement sur les jours futurs affichés)
  const displayedFutureDays = timeline.filter(t => isSameMonth(new Date(t.date), viewDate));
  const lowestPoint = displayedFutureDays.length > 0 
    ? Math.min(...displayedFutureDays.map((d:any) => d.balance)) 
    : 0;
  const isCritical = lowestPoint < 0;

  // 4. Helper pour aligner le 1er jour du mois (Lundi = 1, Dimanche = 0 dans JS de base, mais on veut Lundi=0)
  // date-fns getDay : 0 = Dimanche, 1 = Lundi...
  // On veut décaler pour que Lundi soit la première colonne
  const startDayIndex = (getDay(startOfMonth(viewDate)) + 6) % 7; 

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* --- EN-TÊTE ET NAVIGATION --- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Contrôles Mois */}
        <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-xl">
            <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-indigo-600 shadow-sm"><ChevronLeft size={20} /></button>
            <div className="text-sm font-bold text-slate-800 w-32 text-center capitalize">
                {viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-indigo-600 shadow-sm"><ChevronRight size={20} /></button>
        </div>

        {/* Bouton Aujourd'hui */}
        {!isSameMonth(viewDate, new Date()) && (
            <button onClick={jumpToToday} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                Revenir à aujourd&apos;hui
            </button>
        )}
        
        {/* Indicateur Santé du Mois */}
        {displayedFutureDays.length > 0 ? (
            <div className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 ${isCritical ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isCritical ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                {isCritical ? `Point bas : ${formatCurrency(lowestPoint)}` : "Mois sécurisé"}
            </div>
        ) : (
            <div className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 text-slate-500">
                Historique / Pas de données
            </div>
        )}
      </div>

      {/* --- GRILLE CALENDRIER --- */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {day}
                </div>
            ))}
        </div>

        {/* Cases des jours */}
        <div className="grid grid-cols-7 auto-rows-fr">
            
            {/* Cases vides avant le 1er du mois (Offset) */}
            {Array.from({ length: startDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-32 bg-slate-50/50 border-b border-r border-slate-100/50"></div>
            ))}

            {/* Les vrais jours */}
            {daysInMonth.map((date) => {
                // On cherche si ce jour existe dans notre timeline (donc s'il est futur ou aujourd'hui)
                const timelineDay = timeline.find(t => isSameDay(new Date(t.date), date));
                const isDayPast = isPast(date) && !isToday(date);
                const isDayToday = isToday(date);
                
                // Styles dynamiques
                let bgClass = "bg-white";
                if (isDayPast) bgClass = "bg-slate-50/30";
                if (isDayToday) bgClass = "bg-indigo-50/30";
                if (timelineDay?.balance < 0) bgClass = "bg-rose-50/50";

                return (
                    <div 
                        key={date.toString()} 
                        className={`relative h-32 border-b border-r border-slate-100 p-2 flex flex-col justify-between transition-colors hover:bg-slate-50 ${bgClass}`}
                    >
                        {/* En-tête Jour */}
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-bold ${isDayToday ? 'bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : isDayPast ? 'text-slate-400' : 'text-slate-700'}`}>
                                {date.getDate()}
                            </span>
                            
                            {/* Solde (Uniquement si disponible dans timeline) */}
                            {timelineDay && (
                                <span className={`text-[10px] font-bold ${timelineDay.balance < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                                    {formatCurrency(timelineDay.balance)}
                                </span>
                            )}
                        </div>

                        {/* Événements */}
                        <div className="flex-1 mt-1 overflow-y-auto custom-scrollbar">
                            {timelineDay ? (
                                // Cas Futur : On affiche les prévisions
                                <div className="space-y-1">
                                    {timelineDay.events.map((e: any, i: number) => (
                                        <div key={i} className={`text-[9px] truncate px-1 rounded-sm ${e.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>
                                            {e.type === 'income' ? '+' : '-'}{Math.round(e.amount)} {e.name}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Cas Passé : Vide (ou on pourrait afficher l'historique réel si on l'avait stocké jour par jour)
                                <div className="h-full flex items-center justify-center">
                                    {isDayPast && <div className="w-1 h-1 bg-slate-200 rounded-full"></div>}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            
            {/* Cases vides pour finir la dernière ligne proprement (Optionnel mais joli) */}
            {Array.from({ length: (7 - (daysInMonth.length + startDayIndex) % 7) % 7 }).map((_, i) => (
                <div key={`end-empty-${i}`} className="h-32 bg-slate-50/50 border-b border-r border-slate-100/50"></div>
            ))}

        </div>
      </div>
    </div>
  );
}
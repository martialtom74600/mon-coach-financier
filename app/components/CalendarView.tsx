'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Loader2, AlertCircle, X, CreditCard, ShoppingBag 
} from 'lucide-react';
import { formatCurrency } from '@/app/lib/logic';

// --- COMPOSANT MODAL (Détail du jour) ---
const DayDetailModal = ({ day, onClose }: { day: any, onClose: () => void }) => {
  if (!day) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        
        {/* Header Modal */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className={`text-sm font-bold ${day.balance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              Solde : {formatCurrency(day.balance)}
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-200 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Liste des événements */}
        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
          {day.events.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4 italic">Aucune opération ce jour-là.</p>
          ) : (
            day.events.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-lg shrink-0 ${e.amount < 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                    {e.type === 'debt' ? <CreditCard size={16} /> : <ShoppingBag size={16} />}
                  </div>
                  <span className="text-sm font-bold text-slate-700 truncate">{e.name}</span>
                </div>
                <span className={`text-sm font-bold shrink-0 ${e.amount < 0 ? 'text-slate-800' : 'text-emerald-600'}`}>
                  {e.amount > 0 ? '+' : ''}{formatCurrency(e.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPOSANT PRINCIPAL ---
const CalendarView = ({ timeline }: { timeline: any[] }) => {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<any>(null); // État pour la popup

  useEffect(() => { setCurrentMonthIndex(0); }, [timeline]);

  if (!timeline) return <LoadingState message="Chargement..." />;
  if (timeline.length === 0) return <EmptyState />;

  const currentMonth = timeline[currentMonthIndex];
  if (!currentMonth) return null;

  const goNext = () => currentMonthIndex < timeline.length - 1 && setCurrentMonthIndex(currentMonthIndex + 1);
  const goPrev = () => currentMonthIndex > 0 && setCurrentMonthIndex(currentMonthIndex - 1);

  // Calculs Grille Desktop
  const firstDateStr = currentMonth.days && currentMonth.days[0] ? currentMonth.days[0].date : new Date().toISOString();
  const firstDayIndex = new Date(firstDateStr).getDay(); 
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 
  const blanks = Array(Math.max(0, startOffset)).fill(null);

  return (
    <>
      {/* POPUP DÉTAIL */}
      {selectedDay && <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in flex flex-col h-full">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <button onClick={goPrev} disabled={currentMonthIndex === 0} className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors">
              <ChevronLeft size={24} />
          </button>
          
          <div className="flex flex-col items-center">
              <h3 className="text-lg md:text-xl font-black text-slate-800 capitalize flex items-center gap-2">
                  <CalendarIcon size={18} className="text-indigo-500 hidden md:block" />
                  {currentMonth.label}
              </h3>
              <div className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${currentMonth.stats.balanceEnd < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  Fin : {formatCurrency(currentMonth.stats.balanceEnd)}
              </div>
          </div>

          <button onClick={goNext} disabled={currentMonthIndex === timeline.length - 1} className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors">
              <ChevronRight size={24} />
          </button>
        </div>

        {/* VUE MOBILE (Liste) */}
        <div className="block md:hidden bg-slate-50">
          {currentMonth.days.map((day: any) => {
             const isToday = new Date().toDateString() === new Date(day.date).toDateString();
             if (day.events.length === 0 && !isToday) return null; 

             return (
               <div key={day.date} className={`p-4 border-b border-slate-200 ${isToday ? 'bg-indigo-50' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center border ${isToday ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
                              <span className="text-[10px] font-bold uppercase leading-none">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}</span>
                              <span className="text-lg font-black leading-none">{day.dayOfMonth}</span>
                          </div>
                          <div>
                              {isToday && <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Aujourd'hui</span>}
                          </div>
                      </div>
                      <div className={`text-lg font-black ${day.balance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatCurrency(day.balance)}
                      </div>
                  </div>
                  <div className="space-y-2 pl-[52px]">
                      {day.events.map((e: any) => (
                          <div key={e.id} className="flex justify-between items-center text-sm">
                              <span className="text-slate-600 truncate pr-2">{e.name}</span>
                              <span className={`font-bold whitespace-nowrap ${e.amount < 0 ? 'text-slate-800' : 'text-emerald-600'}`}>
                                  {e.amount > 0 ? '+' : ''}{Math.round(e.amount)}€
                              </span>
                          </div>
                      ))}
                  </div>
               </div>
             );
          })}
        </div>

        {/* VUE DESKTOP (Grille Carrée Fixe) */}
        <div className="hidden md:block">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
              {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map(d => (
                  <div key={d} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d}</div>
              ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr bg-white">
              {blanks.map((_, i) => <div key={`blank-${i}`} className="h-32 bg-slate-50/30 border-b border-r border-slate-50"></div>)}

              {currentMonth.days.map((day: any) => {
                  const isNegative = day.balance < 0;
                  const isToday = new Date().toDateString() === new Date(day.date).toDateString();
                  // On limite à 2 événements max pour garder la hauteur fixe
                  const visibleEvents = day.events.slice(0, 2);
                  const hiddenCount = Math.max(0, day.events.length - 2);
                  
                  return (
                      <div 
                        key={day.date} 
                        onClick={() => setSelectedDay(day)} // Clic pour ouvrir la popup
                        className={`h-32 border-b border-r border-slate-100 p-2 relative group hover:bg-indigo-50/50 transition-colors flex flex-col cursor-pointer ${isToday ? 'bg-indigo-50/20 ring-1 ring-inset ring-indigo-100' : ''}`}
                      >
                          {/* Date & Solde */}
                          <div className="flex justify-between items-start mb-2">
                              <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                                  {day.dayOfMonth}
                              </span>
                              {day.balance !== null && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isNegative ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                      {Math.round(day.balance)}€
                                  </span>
                              )}
                          </div>

                          {/* Événements (Limités à 2) */}
                          <div className="space-y-1 flex-1 overflow-hidden">
                              {visibleEvents.map((e: any) => (
                                  <div key={e.id} className={`text-[9px] px-1.5 py-1 rounded-sm flex justify-between items-center ${e.amount < 0 ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                      <span className="truncate font-medium max-w-[60%]">{e.name}</span>
                                      <span className="font-bold opacity-80">{Math.round(Math.abs(e.amount))}</span>
                                  </div>
                              ))}
                              
                              {/* Indicateur "+ X autres" */}
                              {hiddenCount > 0 && (
                                  <div className="text-[9px] text-center text-slate-400 font-medium bg-slate-50 rounded-sm py-0.5 mt-auto">
                                      + {hiddenCount} autres
                                  </div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
        </div>

      </div>
    </>
  );
};

// --- STATES ---
const LoadingState = ({ message }: { message: string }) => (
  <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
    <Loader2 size={32} className="animate-spin mb-3 text-indigo-500" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

const EmptyState = () => (
  <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
    <AlertCircle size={32} className="mb-3 text-slate-300" />
    <p className="text-sm font-medium">Aucune donnée.</p>
  </div>
);

export default CalendarView;
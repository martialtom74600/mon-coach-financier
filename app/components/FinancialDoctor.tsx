'use client';

import React, { useState } from 'react';
import { 
  Sparkles, AlertTriangle, ArrowRight, TrendingUp, 
  ShieldCheck, PiggyBank, ChevronRight, CheckCircle, 
  XCircle, Info, ChevronLeft
} from 'lucide-react';
import { DeepAnalysis, formatCurrency } from '@/app/lib/logic';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';

// --- STYLES PAR NIVEAU D'OPPORTUNITÉ (DA Cohérente) ---
const getLevelTheme = (level: string) => {
  switch (level) {
    case 'CRITICAL': 
      return { 
        border: 'border-rose-100', 
        bgHeader: 'bg-rose-50', 
        iconColor: 'text-rose-600', 
        iconBg: 'bg-white',
        title: 'text-rose-900',
        badge: 'bg-rose-100 text-rose-700' 
      };
    case 'WARNING': 
      return { 
        border: 'border-amber-100', 
        bgHeader: 'bg-amber-50', 
        iconColor: 'text-amber-600', 
        iconBg: 'bg-white',
        title: 'text-amber-900',
        badge: 'bg-amber-100 text-amber-700' 
      };
    case 'SUCCESS': 
      return { 
        border: 'border-emerald-100', 
        bgHeader: 'bg-emerald-50', 
        iconColor: 'text-emerald-600', 
        iconBg: 'bg-white',
        title: 'text-emerald-900',
        badge: 'bg-emerald-100 text-emerald-700' 
      };
    default: // INFO
      return { 
        border: 'border-indigo-100', 
        bgHeader: 'bg-indigo-50', 
        iconColor: 'text-indigo-600', 
        iconBg: 'bg-white',
        title: 'text-indigo-900',
        badge: 'bg-indigo-100 text-indigo-700' 
      };
  }
};

const getCategoryIcon = (type: string) => {
  switch (type) {
    case 'SAVINGS': return ShieldCheck;
    case 'DEBT': return XCircle;
    case 'INVESTMENT': return TrendingUp;
    default: return PiggyBank;
  }
};

export default function FinancialDoctor({ diagnosis }: { diagnosis: DeepAnalysis }) {
  const [activeTab, setActiveTab] = useState(0);
  const opps = diagnosis.opportunities;

  if (!diagnosis) return null;

  // DA : Calcul dynamique de la couleur du score
  const scoreColor = diagnosis.globalScore >= 80 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' 
    : diagnosis.globalScore >= 50 ? 'text-amber-600 border-amber-200 bg-amber-50' 
    : 'text-rose-600 border-rose-200 bg-rose-50';

  const nextOpp = () => setActiveTab((prev) => (prev + 1) % opps.length);
  const prevOpp = () => setActiveTab((prev) => (prev - 1 + opps.length) % opps.length);

  return (
    <div className="space-y-4 animate-fade-in mb-8">
      
      {/* 1. HEADER DU COACH (Score & Profil) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
           {/* Jauge Score Circulaire (Style 'Badge géant') */}
           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-2 shadow-sm ${scoreColor}`}>
              {diagnosis.globalScore}
           </div>
           
           <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <Sparkles size={18} className="text-indigo-500 fill-indigo-100" /> 
                 Analyse Coach
              </h2>
              <div className="flex flex-wrap gap-2 mt-1.5">
                 {/* Affichage des Tags (Écureuil, Investisseur...) */}
                 {diagnosis.tags.map(tag => (
                    <Badge key={tag} color="bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">{tag}</Badge>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* 2. CAROUSEL D'OPPORTUNITÉS (Design Card Premium) */}
      {opps.length > 0 ? (
        <div className="relative group">
          <Card className="overflow-hidden p-0 border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            {opps.map((opp, index) => {
              // On affiche uniquement la slide active
              if (index !== activeTab) return null;
              
              const theme = getLevelTheme(opp.level);
              const Icon = getCategoryIcon(opp.type);

              return (
                <div key={opp.id} className="flex flex-col md:flex-row animate-fade-in">
                  
                  {/* COLONNE GAUCHE : VISUEL & TITRE */}
                  <div className={`p-6 md:w-5/12 flex flex-col justify-between ${theme.bgHeader} border-b md:border-b-0 md:border-r ${theme.border} relative overflow-hidden`}>
                     {/* Décoration d'arrière plan */}
                     <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-20 rounded-full blur-xl pointer-events-none"></div>
                     
                     <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-sm border border-white/50 ${theme.iconColor}`}>
                                <Icon size={24} strokeWidth={2.5} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/60 backdrop-blur-sm border border-white/40 ${theme.title}`}>
                                {opp.type}
                            </span>
                        </div>
                        
                        <h3 className={`font-bold text-lg leading-tight ${theme.title} mb-1`}>{opp.title}</h3>
                     </div>

                     {/* Gain Potentiel (si existe) */}
                     {opp.potentialGain ? (
                        <div className="mt-6 pt-4 border-t border-black/5">
                           <div className={`text-xs font-medium opacity-80 ${theme.title}`}>Gain estimé</div>
                           <div className="text-2xl font-black tracking-tight text-slate-800">+{formatCurrency(opp.potentialGain)}</div>
                        </div>
                     ) : (
                        // Espace vide pour aligner si pas de gain
                        <div className="mt-6 pt-4 border-t border-transparent h-[62px]"></div>
                     )}
                  </div>

                  {/* COLONNE DROITE : CONTENU & ACTION */}
                  <div className="p-6 md:w-7/12 flex flex-col justify-center bg-white relative">
                     <p className="text-slate-600 leading-relaxed text-sm font-medium mb-6">
                        {opp.message}
                     </p>

                     <div className="flex items-center justify-between mt-auto pt-2">
                        {/* Bouton Action Principal */}
                        {opp.actionLabel ? (
                           <Button size="sm" className="bg-slate-900 text-white hover:bg-indigo-600 shadow-none text-xs px-5 h-10 transition-colors">
                              {opp.actionLabel} <ArrowRight size={14} className="ml-1" />
                           </Button>
                        ) : <span></span>}

                        {/* Pagination (Points) */}
                        <div className="flex gap-1.5 items-center">
                           {opps.map((_, i) => (
                              <button 
                                 key={i} 
                                 onClick={() => setActiveTab(i)}
                                 className={`h-1.5 rounded-full transition-all duration-300 ${i === activeTab ? 'w-6 bg-slate-800' : 'w-1.5 bg-slate-200 hover:bg-slate-400'}`}
                                 aria-label={`Voir opportunité ${i + 1}`}
                              />
                           ))}
                        </div>
                     </div>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* FLÈCHES DE NAVIGATION (Desktop : au survol / Mobile : sur les côtés) */}
          {opps.length > 1 && (
            <>
               <button 
                  onClick={prevOpp}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 p-2 bg-white border border-slate-100 shadow-lg rounded-full text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all z-10 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100"
               >
                  <ChevronLeft size={20} />
               </button>
               <button 
                  onClick={nextOpp}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 p-2 bg-white border border-slate-100 shadow-lg rounded-full text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all z-10 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100"
               >
                  <ChevronRight size={20} />
               </button>
            </>
          )}
        </div>
      ) : (
        /* ÉTAT VIDE (SUCCESS) : TOUT EST PARFAIT */
        <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-lg relative overflow-hidden">
           <div className="absolute right-0 top-0 p-24 bg-white opacity-10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
           <div className="flex items-center gap-5 relative z-10">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                 <ShieldCheck size={32} className="text-white" />
              </div>
              <div>
                 <h3 className="font-bold text-xl mb-1">Santé Financière Excellente !</h3>
                 <p className="text-emerald-50 text-sm font-medium opacity-90">Aucune alerte critique. Continuez comme ça !</p>
              </div>
           </div>
        </Card>
      )}
    </div>
  );
}
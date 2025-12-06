'use client';

import React, { useState } from 'react';
import { 
  Activity, AlertTriangle, ArrowRight, TrendingUp, 
  ShieldCheck, PiggyBank, CheckCircle, XCircle, 
  Stethoscope, PieChart, Info, Zap
} from 'lucide-react';
import { DeepAnalysis, formatCurrency, OptimizationOpportunity } from '@/app/lib/logic';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';

// --- ICONS & THEMES ---
const getIcon = (type: string) => {
  switch (type) {
    case 'SAVINGS': return ShieldCheck;
    case 'DEBT': return XCircle;
    case 'INVESTMENT': return TrendingUp;
    case 'BUDGET': return PieChart;
    default: return PiggyBank;
  }
};

const getTheme = (level: string) => {
  switch (level) {
    case 'CRITICAL': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', icon: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' };
    case 'WARNING':  return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
    case 'SUCCESS':  return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
    default:         return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' };
  }
};

// --- SOUS-COMPOSANTS ---

const RatioBar = ({ label, value, ideal, color }: { label: string, value: number, ideal: string, color: string }) => (
  <div className="flex-1">
    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
      <span>{label}</span>
      <span>Cible: {ideal}</span>
    </div>
    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${Math.min(100, value)}%` }}></div>
    </div>
    <div className="text-right mt-1 font-bold text-slate-700 text-xs">{value}%</div>
  </div>
);

const OpportunityCard = ({ opp }: { opp: OptimizationOpportunity }) => {
  const theme = getTheme(opp.level);
  const Icon = getIcon(opp.type);

  return (
    <div className={`p-4 rounded-xl border ${theme.border} ${theme.bg} flex flex-col sm:flex-row gap-4 transition-all hover:shadow-sm`}>
      <div className={`p-3 rounded-full bg-white shadow-sm h-fit w-fit ${theme.icon} shrink-0`}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className={`font-bold text-sm ${theme.text} flex items-center gap-2`}>
            {opp.title}
            {opp.potentialGain && (
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-current opacity-80">
                +{formatCurrency(opp.potentialGain)}
              </span>
            )}
          </h4>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${theme.badge}`}>{opp.type}</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          {opp.message}
        </p>
        {opp.actionLabel && (
          <Button size="sm" variant="secondary" className="w-full sm:w-auto h-8 text-xs bg-white border-slate-200 shadow-sm hover:bg-slate-50">
            {opp.actionLabel} <ArrowRight size={12} />
          </Button>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function FinancialDoctor({ diagnosis }: { diagnosis: DeepAnalysis }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!diagnosis) return null;

  const { globalScore, ratios, opportunities, tags } = diagnosis;
  
  // Tri des opportunités : Critiques d'abord
  const criticalOpps = opportunities.filter(o => o.level === 'CRITICAL');
  const otherOpps = opportunities.filter(o => o.level !== 'CRITICAL');

  const scoreColor = globalScore >= 80 ? 'text-emerald-600' : globalScore >= 50 ? 'text-amber-500' : 'text-rose-500';
  const scoreBg = globalScore >= 80 ? 'bg-emerald-500' : globalScore >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <Card className="p-0 overflow-hidden border-slate-200 shadow-lg animate-fade-in">
      
      {/* 1. HEADER : LE DIAGNOSTIC VITAL */}
      <div className="p-6 bg-white border-b border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Stethoscope className="text-indigo-600" size={24} />
              Diagnostic Financier
            </h2>
            <p className="text-sm text-slate-500 mt-1">Analyse basée sur {opportunities.length} points de contrôle.</p>
          </div>
          <div className="flex flex-col items-end">
             <div className={`text-4xl font-black ${scoreColor} tracking-tighter`}>{globalScore}<span className="text-lg text-slate-300">/100</span></div>
             <div className="flex gap-1 mt-1">
                {tags.map(tag => (
                  <Badge key={tag} size="sm" color="bg-slate-100 text-slate-600 border border-slate-200">{tag}</Badge>
                ))}
             </div>
          </div>
        </div>

        {/* 2. BARRES DE RATIOS (50/30/20) */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-4">
           <RatioBar 
              label="Besoins" 
              value={ratios.needs} 
              ideal="50%" 
              color={ratios.needs > 60 ? 'bg-rose-500' : 'bg-indigo-500'} 
           />
           <RatioBar 
              label="Plaisirs" 
              value={ratios.wants} 
              ideal="30%" 
              color={ratios.wants > 40 ? 'bg-amber-500' : 'bg-purple-500'} 
           />
           <RatioBar 
              label="Épargne" 
              value={ratios.savings} 
              ideal="20%" 
              color={ratios.savings < 10 ? 'bg-rose-500' : 'bg-emerald-500'} 
           />
        </div>
      </div>

      {/* 3. URGENCES (Si Critiques) */}
      {criticalOpps.length > 0 && (
        <div className="p-6 bg-rose-50/50 border-b border-rose-100 space-y-4">
           <div className="flex items-center gap-2 text-rose-700 font-bold text-sm uppercase tracking-wider">
              <AlertTriangle size={16} /> Actions Requises Immédiatement
           </div>
           <div className="grid gap-3">
              {criticalOpps.map(opp => <OpportunityCard key={opp.id} opp={opp} />)}
           </div>
        </div>
      )}

      {/* 4. RECOMMANDATIONS (Accordion pour ne pas polluer si beaucoup) */}
      {otherOpps.length > 0 && (
        <div className="p-6 bg-white">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                 <Zap size={16} className="text-amber-500" /> Pistes d'optimisation
              </h3>
              <button 
                onClick={() => setShowDetails(!showDetails)} 
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                {showDetails ? 'Réduire' : `Voir les ${otherOpps.length} conseils`}
              </button>
           </div>
           
           <div className={`grid gap-3 transition-all ${showDetails ? 'opacity-100' : 'opacity-100'}`}>
              {/* On montre les 2 premiers par défaut, le reste si showDetails */}
              {otherOpps.slice(0, showDetails ? undefined : 2).map(opp => (
                 <OpportunityCard key={opp.id} opp={opp} />
              ))}
           </div>
        </div>
      )}

      {/* 5. ÉTAT PARFAIT (Empty State positif) */}
      {opportunities.length === 0 && (
         <div className="p-8 text-center bg-emerald-50/50">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Activity size={32} />
            </div>
            <h3 className="text-emerald-900 font-bold text-lg">Santé de fer !</h3>
            <p className="text-emerald-700/80 text-sm mt-1 max-w-xs mx-auto">
               Tout est optimisé. Profitez de la vie ou augmentez vos objectifs d'investissement.
            </p>
         </div>
      )}
    </Card>
  );
}
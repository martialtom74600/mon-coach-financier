'use client';

import React, { useState, useMemo } from 'react';
import { 
  Activity, ArrowRight, TrendingUp, 
  ShieldCheck, PiggyBank, XCircle, 
  Stethoscope, Wallet, HeartPulse, Landmark, Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DeepAnalysis, formatCurrency, OptimizationOpportunity } from '@/app/lib/logic';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';

// --- CONFIGURATION VISUELLE ---
const COLORS = {
  needs: '#6366f1',   // Indigo (Besoins)
  wants: '#a855f7',   // Purple (Plaisirs)
  savings: '#10b981', // Emerald (Épargne)
  empty: '#f1f5f9',   // Slate (Vide)
};

const getTheme = (level: string) => {
  switch (level) {
    case 'CRITICAL': return { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-800', icon: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' };
    case 'WARNING':  return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
    case 'SUCCESS':  return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
    default:         return { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-800', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' };
  }
};

const getIcon = (type: string) => {
  switch (type) {
    case 'SAVINGS': return ShieldCheck;
    case 'DEBT': return XCircle;
    case 'INVESTMENT': return TrendingUp;
    case 'BUDGET': return Wallet;
    default: return PiggyBank;
  }
};

// --- SOUS-COMPOSANTS ---

const VitalSign = ({ label, status, icon: Icon }: { label: string, status: 'ok' | 'warning' | 'critical', icon: any }) => {
  const colors = {
    ok: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    critical: 'bg-rose-100 text-rose-600'
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:border-slate-200">
      <div className={`p-2 rounded-full mb-2 ${colors[status]}`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">{label}</span>
      <span className={`text-sm font-bold ${status === 'critical' ? 'text-rose-600' : 'text-slate-700'}`}>
        {status === 'ok' ? 'Sain' : status === 'warning' ? 'À surveiller' : 'Fragile'}
      </span>
    </div>
  );
};

const OpportunityItem = ({ opp }: { opp: OptimizationOpportunity }) => {
  const theme = getTheme(opp.level);
  const Icon = getIcon(opp.type);

  return (
    <div className={`p-4 rounded-xl border ${theme.border} ${theme.bg} flex gap-4 transition-all hover:shadow-sm relative group`}>
      <div className={`mt-1 ${theme.icon}`}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className={`font-bold text-sm ${theme.text} mb-1 pr-8`}>{opp.title}</h4>
          {opp.potentialGain && (
            <Badge size="sm" color="bg-white border-slate-200 text-emerald-600 shadow-sm whitespace-nowrap">
              +{formatCurrency(opp.potentialGain)}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3 opacity-90">{opp.message}</p>
        
        {opp.actionLabel && (
          <Button size="sm" variant="secondary" className="h-8 text-xs bg-white border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 w-full sm:w-auto">
            {opp.actionLabel} <ArrowRight size={12} className="ml-1 opacity-50" />
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
  
  // 1. Analyse des "Signaux Vitaux" basée sur les alertes présentes
  const vitals = useMemo(() => {
    const checkStatus = (type: string) => {
      const opps = opportunities.filter(o => o.type === type);
      if (opps.some(o => o.level === 'CRITICAL')) return 'critical';
      if (opps.some(o => o.level === 'WARNING')) return 'warning';
      return 'ok';
    };
    return {
      security: checkStatus('SAVINGS'),
      debt: checkStatus('DEBT'),
      future: checkStatus('INVESTMENT')
    };
  }, [opportunities]);

  // 2. Préparation des données pour le Donut Chart
  const chartData = [
    { name: 'Besoins', value: ratios.needs, color: COLORS.needs },
    { name: 'Plaisirs', value: ratios.wants, color: COLORS.wants },
    { name: 'Épargne', value: ratios.savings, color: COLORS.savings },
  ].filter(d => d.value > 0);

  // 3. Tri des opportunités
  const criticalOpps = opportunities.filter(o => o.level === 'CRITICAL');
  const otherOpps = opportunities.filter(o => o.level !== 'CRITICAL');

  // Couleur dynamique du score
  const scoreColor = globalScore >= 80 ? 'text-emerald-500' : globalScore >= 50 ? 'text-amber-500' : 'text-rose-500';

  return (
    <Card className="p-0 overflow-hidden border-slate-200 shadow-xl animate-fade-in bg-white">
      
      {/* --- PARTIE SUPÉRIEURE : LE TABLEAU DE BORD --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-100">
        
        {/* GAUCHE : Score & Graphique (5 cols) */}
        <div className="md:col-span-5 p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/30 flex flex-col justify-center items-center text-center relative">
           <div className="absolute top-4 left-4 flex items-center gap-2 text-indigo-900 font-bold text-sm">
              <Stethoscope size={18} className="text-indigo-600" /> Diagnostic
           </div>
           
           {/* Graphique Donut Interactif */}
           <div className="w-40 h-40 relative mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Score au centre */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <div className={`text-4xl font-black ${scoreColor} tracking-tighter`}>{globalScore}</div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Score</div>
              </div>
           </div>

           {/* Légende Graphique */}
           <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 justify-center">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
                 <div className="w-2 h-2 rounded-full" style={{background: COLORS.needs}}></div> Besoins
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
                 <div className="w-2 h-2 rounded-full" style={{background: COLORS.wants}}></div> Plaisirs
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
                 <div className="w-2 h-2 rounded-full" style={{background: COLORS.savings}}></div> Épargne
              </div>
           </div>
        </div>

        {/* DROITE : Signaux Vitaux & Tags (7 cols) */}
        <div className="md:col-span-7 p-6 flex flex-col justify-center">
           <div className="flex flex-wrap gap-2 mb-6">
              {tags.map(tag => (
                <Badge key={tag} color="bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">{tag}</Badge>
              ))}
           </div>
           
           <div className="grid grid-cols-3 gap-3">
              <VitalSign label="Sécurité" status={vitals.security} icon={ShieldCheck} />
              <VitalSign label="Dettes" status={vitals.debt} icon={Landmark} />
              <VitalSign label="Avenir" status={vitals.future} icon={TrendingUp} />
           </div>
        </div>
      </div>

      {/* --- PARTIE INFÉRIEURE : L'ORDONNANCE (ACTIONS) --- */}
      <div className="bg-white">
         
         {/* URGENCES : Affichées toujours en premier */}
         {criticalOpps.length > 0 && (
            <div className="p-5 border-b border-rose-100 bg-rose-50/30 animate-pulse-slow">
               <h3 className="text-rose-700 font-bold text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                  <HeartPulse size={16} /> Priorité Absolue
               </h3>
               <div className="space-y-3">
                  {criticalOpps.map(opp => <OpportunityItem key={opp.id} opp={opp} />)}
               </div>
            </div>
         )}

         {/* CONSEILS & OPTIMISATIONS */}
         {otherOpps.length > 0 && (
            <div className="p-5">
               <div className="flex justify-between items-center mb-3">
                  <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                     <Zap size={16} className="text-amber-500" /> Pistes d'optimisation
                  </h3>
                  {otherOpps.length > 2 && (
                    <button onClick={() => setShowDetails(!showDetails)} className="text-indigo-600 text-xs font-bold hover:underline">
                       {showDetails ? 'Réduire' : `Tout voir (${otherOpps.length})`}
                    </button>
                  )}
               </div>
               <div className="space-y-3">
                  {/* On affiche les 2 premiers par défaut, ou tout si showDetails est true */}
                  {otherOpps.slice(0, showDetails ? undefined : 2).map(opp => (
                     <OpportunityItem key={opp.id} opp={opp} />
                  ))}
               </div>
            </div>
         )}

         {/* ÉTAT PARFAIT : Si aucune opportunité (rare mais possible) */}
         {opportunities.length === 0 && (
            <div className="p-10 text-center">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                  <Activity size={32} />
               </div>
               <h3 className="text-emerald-900 font-bold text-lg">Santé Financière Excellente !</h3>
               <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                  Aucune alerte détectée. Votre budget est équilibré, votre sécurité assurée et votre avenir en construction.
               </p>
            </div>
         )}
      </div>
    </Card>
  );
}
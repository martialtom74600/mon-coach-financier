'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { calculateFinancials, formatCurrency } from '@/app/lib/logic';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Target,
  Wallet,
  Activity,
  Settings,
  LayoutDashboard,
  Info
} from 'lucide-react';

// --- COMPOSANTS UI AMÉLIORÉS ---

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-md ${className}`}>
    {children}
  </div>
);

// NOUVEAU : Jauge Circulaire SVG pour le Score
const CircularScore = ({ score, colorClass, size = 160, strokeWidth = 12 }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Map des couleurs Tailwind vers Hex pour le SVG (approximatif pour l'exemple)
  const getColorHex = (cls: string) => {
    if (cls.includes('emerald')) return '#10b981';
    if (cls.includes('amber')) return '#f59e0b';
    return '#e11d48'; // rose/red
  };
  const strokeColor = getColorHex(colorClass);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Cercle de fond */}
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9" // slate-100
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Cercle de progression */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Texte au centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-black tracking-tighter ${colorClass}`}>
            {score}
        </span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">/ 100</span>
      </div>
    </div>
  );
};

const ProgressBar = ({ value, max, colorClass = 'bg-indigo-600' }: any) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorClass} transition-all duration-1000 ease-out rounded-full`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

const StatCard = ({ label, value, subtext, icon: Icon, color }: any) => (
  <Card className="p-5 flex flex-col justify-between h-full hover:border-indigo-100 group cursor-default">
    <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${color.bg} ${color.text} transition-transform group-hover:scale-110 duration-300`}>
            <Icon size={24} />
        </div>
        {/* Petit indicateur visuel optionnel */}
        <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors"></div>
    </div>
    <div>
      <div className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-black text-slate-800 tracking-tight">{value}</div>
      {subtext && <div className="text-xs text-slate-400 mt-1 font-medium">{subtext}</div>}
    </div>
  </Card>
);

// --- PAGE D'ACCUEIL (DASHBOARD) ---

export default function HomePage() {
  const router = useRouter();
  const { profile, isLoaded } = useFinancialData();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  // --- ONBOARDING (inchangé) ---
  if (stats.monthlyIncome === 0 && stats.matelas === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
        <div className="p-6 bg-indigo-50 rounded-full text-indigo-600 mb-6 shadow-sm animate-bounce-slow"><Settings size={64} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Bienvenue !</h2>
        <p className="text-slate-500 mb-8 max-w-md text-lg leading-relaxed">
          Pour que le Coach puisse analyser ta santé financière, il a besoin de mieux te connaître.
        </p>
        <button onClick={() => router.push('/profile')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-3 transform active:scale-95">
          Configurer mon profil <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  // --- CALCUL DU SCORE ---
  let healthScore = 0;
  const safetyRatio = Math.min(1, stats.safetyMonths / stats.rules.safetyMonths);
  healthScore += safetyRatio * 40;
  const debtRatio = stats.engagementRate / stats.rules.maxDebt; 
  const debtScore = Math.max(0, 40 * (1 - (debtRatio * 0.5))); 
  healthScore += debtScore;
  const livingRatio = Math.min(1, stats.remainingToLive / (stats.rules.minLiving * 2));
  healthScore += livingRatio * 20;
  const finalScore = Math.round(healthScore);
  
  let healthStatus = { label: 'Excellent', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  if (finalScore < 50) healthStatus = { label: 'Critique', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' };
  else if (finalScore < 80) healthStatus = { label: 'Fragile', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start animate-fade-in pb-10">
      
      {/* --- COLONNE GAUCHE (SCORE & ACTIONS) --- */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
        
        {/* CARTE SCORE PREMIUM */}
        <Card className={`p-8 flex flex-col items-center justify-center text-center relative overflow-hidden ${healthStatus.border}`}>
            {/* Background Glow effect */}
            <div className={`absolute top-0 inset-x-0 h-32 opacity-20 bg-gradient-to-b from-${healthStatus.color.split('-')[1]}-200 to-transparent pointer-events-none`}></div>
            
            <div className="relative z-10 flex flex-col items-center w-full">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    <LayoutDashboard size={14} /> Bilan Santé
                </div>
                
                {/* JAUGE CIRCULAIRE */}
                <div className="mb-6 transform hover:scale-105 transition-transform duration-500 cursor-help" title="Score global sur 100">
                    <CircularScore score={finalScore} colorClass={healthStatus.color} />
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-6 ${healthStatus.bg} ${healthStatus.color}`}>
                    {finalScore >= 80 ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    {healthStatus.label}
                </div>

                <div className="w-full pt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-[10px] text-slate-400 uppercase">Sécu</div><div className="font-bold text-slate-700">{Math.round(safetyRatio*100)}%</div></div>
                    <div><div className="text-[10px] text-slate-400 uppercase">Dette</div><div className="font-bold text-slate-700">{Math.round(debtScore/40*100)}%</div></div>
                    <div><div className="text-[10px] text-slate-400 uppercase">Confort</div><div className="font-bold text-slate-700">{Math.round(livingRatio*100)}%</div></div>
                </div>
            </div>
        </Card>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-1 gap-3">
            <button onClick={() => router.push('/simulator')} className="group w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden relative">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Activity size={20} /> 
                <span>Simuler un achat</span>
            </button>
            <button onClick={() => router.push('/profile')} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center justify-center gap-2">
                <Settings size={18} /> Ajuster mon Profil
            </button>
        </div>
      </div>

      {/* --- COLONNE DROITE (KPIs & DETAILS) --- */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* GRILLE KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Revenus Mensuels" value={formatCurrency(stats.monthlyIncome)} subtext="Net avant impôts" icon={Wallet} color={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }} />
            <StatCard label="Charges Fixes" value={formatCurrency(stats.totalRecurring)} subtext={`${stats.engagementRate.toFixed(0)}% des revenus`} icon={TrendingDown} color={{ bg: 'bg-rose-100', text: 'text-rose-600' }} />
            <StatCard label="Reste à Vivre" value={formatCurrency(stats.remainingToLive)} subtext={`Seuil confort : ${formatCurrency(stats.rules.minLiving * 2)}`} icon={Activity} color={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }} />
            <StatCard label="Matelas Dispo" value={formatCurrency(stats.matelas)} subtext={`${stats.safetyMonths.toFixed(1)} mois d'avance`} icon={Shield} color={{ bg: 'bg-amber-100', text: 'text-amber-600' }} />
        </div>

        {/* DÉTAILS ANALYTIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SÉCURITÉ */}
            <Card className="p-6 flex flex-col justify-between border-t-4 border-t-amber-500">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="text-amber-500" size={20} /> Sécurité</h3>
                        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Cible : {stats.rules.safetyMonths} mois</span>
                    </div>
                    <div className="mb-2 flex justify-between text-sm font-medium">
                        <span className="text-slate-600">{stats.safetyMonths.toFixed(1)} mois</span>
                        <span className="text-slate-400">{Math.round((stats.safetyMonths/stats.rules.safetyMonths)*100)}%</span>
                    </div>
                    <ProgressBar value={stats.safetyMonths} max={stats.rules.safetyMonths} colorClass="bg-amber-500" />
                </div>
                <div className="mt-6 flex gap-3 items-start text-sm text-slate-600">
                    {stats.safetyMonths >= stats.rules.safetyMonths ? (
                        <CheckCircle className="shrink-0 text-emerald-500 mt-0.5" size={18} />
                    ) : (
                        <AlertTriangle className="shrink-0 text-amber-500 mt-0.5" size={18} />
                    )}
                    <p className="leading-snug">
                        {stats.safetyMonths >= stats.rules.safetyMonths 
                            ? "Ton épargne couvre largement les imprévus." 
                            : <>Il te manque <strong>{formatCurrency((stats.rules.safetyMonths * stats.essentialExpenses) - stats.matelas)}</strong> pour être serein.</>
                        }
                    </p>
                </div>
            </Card>

            {/* CHARGES / DETTE */}
            <Card className="p-6 flex flex-col justify-between border-t-4 border-t-rose-500">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingDown className="text-rose-500" size={20} /> Pression</h3>
                        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Max : {stats.rules.maxDebt}%</span>
                    </div>
                    <div className="mb-2 flex justify-between text-sm font-medium">
                        <span className="text-slate-600">{stats.engagementRate.toFixed(0)}%</span>
                        <span className={`text-xs ${stats.engagementRate > stats.rules.maxDebt ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>{stats.engagementRate > stats.rules.maxDebt ? 'Critique' : 'Sain'}</span>
                    </div>
                    <ProgressBar value={stats.engagementRate} max={60} colorClass={stats.engagementRate > stats.rules.maxDebt ? 'bg-rose-500' : 'bg-emerald-500'} />
                </div>
                <div className="mt-6 flex gap-3 items-start text-sm text-slate-600">
                    {stats.engagementRate > stats.rules.maxDebt ? (
                        <AlertTriangle className="shrink-0 text-rose-500 mt-0.5" size={18} />
                    ) : (
                        <CheckCircle className="shrink-0 text-emerald-500 mt-0.5" size={18} />
                    )}
                    <p className="leading-snug">
                        {stats.engagementRate > stats.rules.maxDebt 
                            ? "Tes charges fixes sont trop élevées par rapport à tes revenus." 
                            : "Structure saine. Tes charges fixes sont bien maîtrisées."
                        }
                    </p>
                </div>
            </Card>
        </div>

        {/* PROJECTION (Carte sombre moderne) */}
        <Card className="p-8 bg-slate-900 text-white relative overflow-hidden border-none shadow-xl shadow-indigo-900/20">
            {/* Effets de lumière décoratifs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500 rounded-full blur-3xl opacity-10 -ml-10 -mb-10 pointer-events-none"></div>
            
            <div className="relative z-10">
                <h3 className="font-bold text-xl mb-2 flex items-center gap-2 text-indigo-300">
                    <Target className="text-indigo-400" /> Le Pouvoir des 10%
                </h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed max-w-lg">
                    Petite habitude, grand impact. Si tu mets de côté seulement 10% de ton Reste à Vivre actuel chaque mois :
                </p>
                
                <div className="flex flex-wrap items-end gap-4">
                    <div className="text-5xl font-black text-white tracking-tight">
                        + {formatCurrency(stats.remainingToLive * 0.1 * 12)}
                    </div>
                    <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold uppercase mb-2">
                        D'ici 1 an
                    </div>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
}
'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { calculateFinancials, formatCurrency } from '@/app/lib/logic';

// Imports Icones
import {
  TrendingDown,
  Shield,
  AlertTriangle,
  Target,
  Wallet,
  Activity,
  Settings,
  CreditCard,
  ArrowRight,
  Info,
} from 'lucide-react';

// --- IMPORTS UI KIT (Le nettoyage est ici !) ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import ProgressBar from '@/app/components/ui/ProgressBar';
import Badge from '@/app/components/ui/Badge';
import Tooltip from '@/app/components/ui/Tooltip';

// --- LOGIQUE MÉTIER (NIVEAUX) ---

const LEVELS = [
  { min: 0, max: 40, label: "Survie", color: "text-rose-500", bg: "bg-rose-500", border: "border-rose-100" },
  { min: 40, max: 70, label: "Construction", color: "text-amber-500", bg: "bg-amber-500", border: "border-amber-100" },
  { min: 70, max: 90, label: "Confort", color: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-100" },
  { min: 90, max: 101, label: "Liberté", color: "text-indigo-500", bg: "bg-indigo-500", border: "border-indigo-100" },
];

const getLevel = (score: number) => LEVELS.find(l => score >= l.min && score < l.max) || LEVELS[0];

// Ce composant reste ici car il est très spécifique au Dashboard (SVG complexe)
const LevelGauge = ({ score, level }: any) => {
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (cls: string) => {
    if (cls.includes('emerald')) return '#10b981';
    if (cls.includes('amber')) return '#f59e0b';
    if (cls.includes('indigo')) return '#6366f1';
    return '#f43f5e';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={getColor(level.color)} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Niveau</div>
        <div className={`text-3xl font-black tracking-tight ${level.color}`}>{level.label}</div>
        <div className="mt-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">Score : {score}/100</div>
      </div>
    </div>
  );
};

// --- PAGE D'ACCUEIL ---

export default function HomePage() {
  const router = useRouter();
  const { profile, isLoaded } = useFinancialData();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  // --- ONBOARDING ---
  if (stats.monthlyIncome === 0 && stats.matelas === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
        <div className="p-6 bg-indigo-50 rounded-full text-indigo-600 mb-6 shadow-sm"><Settings size={64} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Bienvenue !</h2>
        <Button onClick={() => router.push('/profile')} className="shadow-xl">
          Configurer mon profil <ArrowRight size={20} />
        </Button>
      </div>
    );
  }

  // --- CALCULS ---
  const safetyRatio = Math.min(1, stats.safetyMonths / stats.rules.safetyMonths);
  const debtRatio = stats.engagementRate / stats.rules.maxDebt;
  const debtScore = Math.max(0, 40 * (1 - (debtRatio * 0.5)));
  const livingRatio = Math.min(1, stats.remainingToLive / (stats.rules.minLiving * 2));
  
  const finalScore = Math.round((safetyRatio * 40) + debtScore + (livingRatio * 20));
  const currentLevel = getLevel(finalScore);

  // Définition des statuts pour les Badges
  const safetyStatus = stats.safetyMonths >= stats.rules.safetyMonths 
    ? { label: "Blindé", color: "bg-emerald-100 text-emerald-700" } 
    : stats.safetyMonths >= 1 
        ? { label: "En cours", color: "bg-amber-100 text-amber-700" } 
        : { label: "Fragile", color: "bg-rose-100 text-rose-700" };

  const debtStatus = stats.engagementRate <= 30
    ? { label: "Excellent", color: "bg-emerald-100 text-emerald-700" }
    : stats.engagementRate <= stats.rules.maxDebt
        ? { label: "Normal", color: "bg-amber-100 text-amber-700" }
        : { label: "Surcharge", color: "bg-rose-100 text-rose-700" };

  // Conseil global
  let nextStep = { text: "Continue comme ça !", subtext: "Tout est au vert." };
  if (stats.engagementRate > stats.rules.maxDebt) nextStep = { text: "Réduire les charges fixes", subtext: "Elles mangent trop de revenus." };
  else if (stats.safetyMonths < 1) nextStep = { text: "Créer un fond d'urgence", subtext: "Vise 1 mois de côté." };
  else if (stats.safetyMonths < stats.rules.safetyMonths) nextStep = { text: "Renforcer la sécurité", subtext: `Vise ${stats.rules.safetyMonths} mois d'avance.` };
  else if (finalScore < 90) nextStep = { text: "Optimiser le budget", subtext: "Essaie d'investir plus." };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-12">
      
      {/* --- COLONNE GAUCHE --- */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
        <Card className={`p-8 flex flex-col items-center justify-center text-center relative overflow-hidden ${currentLevel.border} border-t-4`}>
            <div className="mb-6 relative z-10"><LevelGauge score={finalScore} level={currentLevel} /></div>
            
            {/* CONSEIL DU COACH */}
            <div className="w-full bg-slate-50 rounded-xl p-4 text-left border border-slate-100 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1 rounded-full ${currentLevel.bg} text-white`}><Info size={12} /></div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Conseil du Coach</span>
                </div>
                <div className="text-slate-800 font-bold text-sm leading-snug">{nextStep.text}</div>
                <div className="text-slate-500 text-xs mt-0.5">{nextStep.subtext}</div>
            </div>

            {/* DÉTAILS GRID */}
            <div className="w-full pt-6 mt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center relative z-10">
                <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex justify-center items-center gap-1">Sécu <Tooltip text="Ton épargne de précaution." /></div>
                    <div className={`font-bold text-slate-700`}>{Math.round(safetyRatio*100)}%</div>
                </div>
                <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex justify-center items-center gap-1">Dette <Tooltip text="Poids de tes charges fixes." /></div>
                    <div className={`font-bold text-slate-700`}>{Math.round(debtScore/40*100)}%</div>
                </div>
                <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex justify-center items-center gap-1">Vie <Tooltip text="Ce qu'il reste pour vivre." /></div>
                    <div className={`font-bold text-slate-700`}>{Math.round(livingRatio*100)}%</div>
                </div>
            </div>
        </Card>

        <div className="grid grid-cols-1 gap-3">
            <Button onClick={() => router.push('/simulator')}><Activity size={20} /> Simuler un achat</Button>
            <Button variant="outline" onClick={() => router.push('/profile')}><Settings size={18} /> Ajuster mon Profil</Button>
        </div>
      </div>

      {/* --- COLONNE DROITE --- */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* GRILLE KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* REVENUS */}
            <Card className="p-5 flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase">
                        Revenus <Tooltip text="Total de tes entrées d'argent nettes avant impôts." />
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20} /></div>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.monthlyIncome)}</div>
            </Card>

            {/* RESTE A VIVRE */}
            <Card className="p-5 flex flex-col justify-between h-32 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-500 uppercase">
                        Reste à Vivre <Tooltip text="L'argent qu'il te reste pour les courses, les loisirs et l'épargne une fois tout payé." />
                    </div>
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Activity size={20} /></div>
                </div>
                <div>
                    <div className="text-3xl font-black text-indigo-900 tracking-tight">{formatCurrency(stats.remainingToLive)}</div>
                    <div className="text-xs font-medium text-indigo-400 mt-1 flex items-center gap-1">
                         Cible confort : {formatCurrency(stats.rules.minLiving * 2)}
                    </div>
                </div>
            </Card>

            {/* CHARGES FIXES */}
            <Card className="p-5 flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase">
                        Charges Fixes <Tooltip text="Loyers, crédits, assurances, abonnements : tout ce qui part automatiquement." />
                    </div>
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown size={20} /></div>
                </div>
                <div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.totalRecurring)}</div>
                    <div className="mt-1">
                      <Badge color={debtStatus.color}>{debtStatus.label}</Badge>
                    </div>
                </div>
            </Card>
            
            {/* MATELAS */}
             <Card className="p-5 flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                     <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase">
                        Matelas <Tooltip text="Argent disponible immédiatement en cas de coup dur." />
                    </div>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Shield size={20} /></div>
                </div>
                <div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.matelas)}</div>
                    <div className="mt-1">
                      <Badge color={safetyStatus.color}>{safetyStatus.label}</Badge>
                    </div>
                </div>
            </Card>
        </div>

        {/* DÉTAILS SÉCURITÉ */}
        <Card className="p-6 border-t-4 border-t-amber-500">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="text-amber-500" size={20} /> Sécurité</h3>
                <Badge color={safetyStatus.color}>{safetyStatus.label}</Badge>
            </div>
            <ProgressBar value={stats.safetyMonths} max={stats.rules.safetyMonths} colorClass="bg-amber-500" />
            <div className="flex justify-between mt-2 text-sm font-medium mb-4">
                <span className="text-slate-900 font-bold">{stats.safetyMonths.toFixed(1)} mois d&apos;avance</span>
                <span className="text-slate-400">Obj : {stats.rules.safetyMonths} mois</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100 flex gap-3">
                <Info className="shrink-0 text-amber-500" size={16} />
                <div>
                    <span className="font-bold block mb-1 text-slate-700">Pourquoi c&apos;est important ?</span>
                    Avoir {stats.rules.safetyMonths} mois de dépenses devant soi permet d&apos;encaisser une perte d&apos;emploi ou une grosse panne sans s&apos;endetter.
                    {stats.safetyMonths < stats.rules.safetyMonths && <div className="mt-1 text-amber-600 font-bold">Il te manque encore {formatCurrency((stats.rules.safetyMonths * stats.essentialExpenses) - stats.matelas)}.</div>}
                </div>
            </div>
        </Card>

        {/* DÉTAILS PRESSION */}
        <Card className="p-6 border-t-4 border-t-rose-500">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard className="text-rose-500" size={20} /> Pression des charges</h3>
                <Badge color={debtStatus.color}>{debtStatus.label}</Badge>
            </div>
            <ProgressBar value={stats.engagementRate} max={60} colorClass={stats.engagementRate > stats.rules.maxDebt ? 'bg-rose-500' : 'bg-emerald-500'} />
            <div className="flex justify-between mt-2 text-sm font-medium mb-4">
                <span className="text-slate-900 font-bold">{stats.engagementRate.toFixed(0)}% utilisé</span>
                <span className="text-slate-400">Max conseillé : {stats.rules.maxDebt}%</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100 flex gap-3">
                <Info className="shrink-0 text-rose-500" size={16} />
                <div>
                    <span className="font-bold block mb-1 text-slate-700">L&apos;analyse du coach</span>
                    C&apos;est la part de tes revenus qui est mangée avant même que le mois commence.
                    {stats.engagementRate > stats.rules.maxDebt 
                        ? <span className="block mt-1 text-rose-600 font-bold">Attention, tu as peu de marge de manœuvre en cas d&apos;imprévu.</span>
                        : <span className="block mt-1 text-emerald-600 font-bold">C&apos;est sain ! Tu gardes la maîtrise de ton budget.</span>
                    }
                </div>
            </div>
        </Card>

        {/* PROJECTION */}
        <Card className="p-8 bg-slate-900 text-white border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2 text-indigo-300"><Target className="text-indigo-400" /> Projection 12 mois</h3>
                    <p className="text-slate-300 text-sm max-w-sm leading-relaxed">En épargnant <strong className="text-white">10%</strong> de votre Reste à Vivre :</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center min-w-[180px]">
                    <div className="text-3xl font-black text-white tracking-tight">+{formatCurrency(stats.remainingToLive * 0.1 * 12)}</div>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
}
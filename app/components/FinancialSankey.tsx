'use client';

import { useMemo, useState } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { calculateListTotal, safeFloat, formatCurrency } from '@/app/lib/logic';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { 
  Layers, ArrowDown, TrendingUp, Home, Zap, 
  ShoppingCart, PiggyBank, CreditCard, Wallet, 
  ChevronDown, ChevronUp 
} from 'lucide-react';

// --- CONFIGURATION ---
const THEME = {
  income: '#3b82f6',    // Bleu Roi
  wallet: '#1e293b',    // Noir/Gris (Hub)
  housing: '#fb923c',   // Orange
  fixed: '#c084fc',     // Violet
  life: '#facc15',      // Jaune
  invest: '#f87171',    // Rouge/Saumon
  savings: '#22d3ee',   // Cyan
  gray: '#94a3b8'
};

const HUB_ID = "Budget";

// --- TYPES ---
type AddLinkFn = (source: string, target: string, value: number, colorSource: string, colorTarget: string) => void;

// ============================================================================
// 1. COMPOSANT MOBILE : LA TIMELINE FINANCIÈRE
// ============================================================================

const getCategoryIcon = (label: string) => {
    if (label.includes('Logement')) return Home;
    if (label.includes('Abonnements')) return Zap;
    if (label.includes('Vie')) return ShoppingCart;
    if (label.includes('Investissements')) return TrendingUp;
    if (label.includes('Crédits')) return CreditCard;
    if (label.includes('Cash')) return PiggyBank;
    return Wallet;
};

const MobileTimelineCard = ({ item, totalIncome, isLast }: { item: any, totalIncome: number, isLast: boolean }) => {
    const percent = totalIncome > 0 ? Math.round((item.value / totalIncome) * 100) : 0;
    const Icon = getCategoryIcon(item.label);
    const isSavings = item.label.includes('Cash');

    return (
        <div className="relative pl-8 pb-8 last:pb-0">
            {/* Ligne Verticale Connectrice */}
            {!isLast && (
                <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 to-slate-100"></div>
            )}

            {/* Icone Flottante (Le Point de la Timeline) */}
            <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 ${isSavings ? 'bg-cyan-500 text-white' : 'bg-white text-slate-500'}`}>
                <Icon size={14} className={isSavings ? "text-white" : ""} style={{ color: isSavings ? 'white' : item.color }} />
            </div>

            {/* La Carte de Contenu */}
            <div className={`relative rounded-2xl border p-4 transition-all duration-300 ${isSavings ? 'bg-cyan-50 border-cyan-100 shadow-md' : 'bg-white border-slate-100 shadow-sm'}`}>
                
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className={`font-bold text-sm ${isSavings ? 'text-cyan-900' : 'text-slate-800'}`}>{item.label}</h4>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                            {percent}% des revenus
                        </p>
                    </div>
                    <div className="text-right">
                        <div className={`font-black text-lg ${isSavings ? 'text-cyan-600' : 'text-slate-900'}`}>
                            {formatCurrency(item.value)}
                        </div>
                    </div>
                </div>

                {/* Barre de poids visuel */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                        className="h-full rounded-full" 
                        style={{ width: `${percent}%`, backgroundColor: item.color }} 
                    />
                </div>
            </div>
        </div>
    );
};

const MobileFlowView = ({ totals, totalIncome }: { totals: any[], totalIncome: number }) => {
    // Séparer le Cash Dispo pour le mettre à la fin ou le traiter différemment
    const expenses = totals.filter(t => !t.label.includes('Cash'));
    const savings = totals.find(t => t.label.includes('Cash'));

    return (
      <div className="p-5">
        {/* EN-TÊTE : REVENUS */}
        <div className="relative z-20 mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold border border-blue-100 mb-2">
                <ArrowDown size={12} /> Entrées Mensuelles
            </div>
            <div className="text-4xl font-black text-slate-900 tracking-tight">
                {formatCurrency(totalIncome)}
            </div>
        </div>

        {/* FLUX TIMELINE */}
        <div className="relative border-l-2 border-dashed border-slate-100 ml-4 pl-8 space-y-8 my-8">
             {/* Début visuel du flux */}
             <div className="absolute -left-[9px] -top-2 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>

             {expenses.map((item, i) => (
                 <div key={i} className="relative">
                     {/* Connecteur horizontal */}
                     <div className="absolute -left-8 top-6 w-6 h-0.5 bg-slate-200"></div>
                     <div className="absolute -left-[37px] top-[21px] w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white"></div>
                     
                     {/* Carte */}
                     <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-100 transition-colors">
                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: item.color }}></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-slate-50 text-slate-500`}>
                                     {(() => {
                                         const Icon = getCategoryIcon(item.label);
                                         return <Icon size={18} style={{ color: item.color }} />;
                                     })()}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 text-sm">{item.label}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{Math.round((item.value / totalIncome) * 100)}% du budget</div>
                                </div>
                            </div>
                            <div className="font-bold text-slate-900">{formatCurrency(item.value)}</div>
                        </div>
                     </div>
                 </div>
             ))}
        </div>

        {/* PIED DE PAGE : RESTE À VIVRE (CASH) */}
        {savings ? (
            <div className="mt-8 relative animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <div className="absolute inset-x-10 -top-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                 <div className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl p-6 text-white shadow-xl shadow-cyan-200/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><PiggyBank size={80} /></div>
                      <div className="relative z-10">
                          <div className="text-cyan-100 text-xs font-bold uppercase tracking-widest mb-1">Il vous reste</div>
                          <div className="text-3xl font-black">{formatCurrency(savings.value)}</div>
                          <div className="mt-2 inline-flex items-center bg-white/20 px-2 py-1 rounded-lg text-[10px] font-medium backdrop-blur-sm border border-white/10">
                             <TrendingUp size={10} className="mr-1" /> Capacité d'épargne réelle
                          </div>
                      </div>
                 </div>
            </div>
        ) : (
            <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-xl text-center">
                <div className="text-rose-600 font-bold text-sm">Budget épuisé (0€ restant)</div>
            </div>
        )}

      </div>
    );
};

// ============================================================================
// 2. LOGIQUE MODULAIRE (Inchangée)
// ============================================================================

const processHousing = (profile: any, addLink: AddLinkFn, mobileItems: any[]) => {
    let total = 0;
    if (profile.housing) {
        const cost = safeFloat(profile.housing.monthlyCost);
        if (cost > 0) {
            total += cost;
            addLink(HUB_ID, "Logement", cost, THEME.wallet, THEME.housing);
            addLink("Logement", "Loyer / Crédit", cost, THEME.housing, THEME.housing);
            mobileItems.push({ label: "Logement", value: total, color: THEME.housing });
        }
    }
    return total;
};

const processFixedCosts = (profile: any, addLink: AddLinkFn, mobileItems: any[]) => {
    let total = 0;
    const allSubs = [...(profile.subscriptions || []), ...(profile.fixedCosts || [])];
    allSubs.forEach((item: any) => total += safeFloat(item.amount));

    if (total > 0) {
        addLink(HUB_ID, "Abonnements", total, THEME.wallet, THEME.fixed);
        mobileItems.push({ label: "Abonnements & Charges", value: total, color: THEME.fixed });
        allSubs.sort((a: any, b: any) => safeFloat(b.amount) - safeFloat(a.amount))
            .forEach((sub: any) => {
                const val = safeFloat(sub.amount);
                if (val > 0) addLink("Abonnements", sub.name, val, THEME.fixed, THEME.fixed);
            });
    }
    return total;
};

const processDailyLife = (profile: any, addLink: AddLinkFn, mobileItems: any[]) => {
    const variable = calculateListTotal(profile.variableCosts || []);
    const fun = safeFloat(profile.funBudget);
    const total = variable + fun;
    
    if (total > 0) {
        addLink(HUB_ID, "Vie Quotidienne", total, THEME.wallet, THEME.life);
        mobileItems.push({ label: "Vie Quotidienne", value: total, color: THEME.life });
        if (variable > 0) addLink("Vie Quotidienne", "Courses & Divers", variable, THEME.life, THEME.life);
        if (fun > 0) addLink("Vie Quotidienne", "Plaisirs", fun, THEME.life, THEME.life);
    }
    return total;
};

const processInvestments = (profile: any, addLink: AddLinkFn, mobileItems: any[]) => {
    let total = 0;
    const investList = profile.savingsContributions || [];
    investList.forEach((i: any) => total += safeFloat(i.amount));
    
    let creditTotal = 0;
    const creditList = profile.credits || [];
    creditList.forEach((c: any) => creditTotal += safeFloat(c.monthlyPayment));

    if (total > 0) {
        addLink(HUB_ID, "Investissements", total, THEME.wallet, THEME.invest);
        mobileItems.push({ label: "Investissements", value: total, color: THEME.invest });
        investList.sort((a: any, b: any) => safeFloat(b.amount) - safeFloat(a.amount))
            .forEach((sav: any) => {
                 const val = safeFloat(sav.amount);
                 if (val > 0) addLink("Investissements", sav.name || "Épargne", val, THEME.invest, THEME.invest);
            });
    }

    if (creditTotal > 0) {
         addLink(HUB_ID, "Dettes", creditTotal, THEME.wallet, THEME.invest);
         mobileItems.push({ label: "Crédits", value: creditTotal, color: THEME.invest });
         creditList.forEach((cred: any) => {
            const val = safeFloat(cred.monthlyPayment);
            if (val > 0) addLink("Dettes", cred.name, val, THEME.invest, THEME.invest);
         });
    }

    return total + creditTotal;
};


// ============================================================================
// 3. COMPOSANT PRINCIPAL
// ============================================================================
export default function FinancialSankey() {
  const { profile, isLoaded } = useFinancialData();

  const { sankeyData, mobileData, totalIncome } = useMemo(() => {
    if (!isLoaded || !profile) return { sankeyData: { nodes: [], links: [] }, mobileData: [], totalIncome: 0 };
    
    const nodes: { id: string; nodeColor: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];
    const mobileItems: { label: string; value: number; color: string }[] = [];
    
    const addLink: AddLinkFn = (source, target, value, colorSource, colorTarget) => {
      if (value <= 0.5) return;
      if (!nodes.find(n => n.id === source)) nodes.push({ id: source, nodeColor: colorSource });
      if (!nodes.find(n => n.id === target)) nodes.push({ id: target, nodeColor: colorTarget });
      links.push({ source, target, value: Math.round(value) });
    };

    const totalInc = calculateListTotal(profile.incomes);
    addLink("Revenus", HUB_ID, totalInc, THEME.income, THEME.wallet);

    const steps = [processHousing, processFixedCosts, processDailyLife, processInvestments];

    let totalOut = 0;
    steps.forEach(process => {
        totalOut += process(profile, addLink, mobileItems);
    });

    const remainingCash = Math.max(0, totalInc - totalOut);
    if (remainingCash > 0) {
        addLink(HUB_ID, "Cash Dispo", remainingCash, THEME.wallet, THEME.savings);
        mobileItems.push({ label: "Cash Dispo", value: remainingCash, color: THEME.savings });
    }

    const hubNode = nodes.find(n => n.id === HUB_ID);
    if (hubNode) hubNode.nodeColor = THEME.wallet;

    return { sankeyData: { nodes, links }, mobileData: mobileItems.sort((a, b) => b.value - a.value), totalIncome: totalInc };
  }, [profile, isLoaded]);

  if (!isLoaded) return <div className="h-[500px] w-full bg-slate-50 animate-pulse rounded-3xl"></div>;
  if (sankeyData.links.length === 0) return null;

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers size={16} className="text-blue-600"/> Répartition détaillée
            </h3>
        </div>
        
        {/* DESKTOP */}
        <div className="hidden md:block h-[600px] w-full bg-white relative p-2">
            <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 20, right: 180, bottom: 20, left: 80 }}
                align="justify"
                colors={(node: any) => node.nodeColor}
                sort="input" 
                nodeOpacity={1}
                nodeThickness={10}
                nodeSpacing={14}
                nodeBorderRadius={3}
                linkOpacity={0.6}
                enableLinkGradient={true}
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={12}
                label={(node) => `${node.id}`}
                labelTextColor={{ from: 'color', modifiers: [ [ 'darker', 2.5 ] ] }}
                tooltip={({ node, source, target, value }: any) => (
                    <div className="bg-white text-slate-800 text-xs p-2 rounded border border-slate-200 shadow-lg z-50 font-medium">
                        {node ? <span>{node.id}: <strong>{formatCurrency(value)}</strong></span> : <span>{source.id} → {target.id}: <strong>{formatCurrency(value)}</strong></span>}
                    </div>
                )}
            />
        </div>

        {/* MOBILE */}
        <div className="md:hidden bg-slate-50/50 min-h-[400px]">
            <MobileFlowView totals={mobileData} totalIncome={totalIncome} />
        </div>
    </div>
  );
}
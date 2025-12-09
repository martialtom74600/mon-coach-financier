'use client';

import { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { calculateListTotal, safeFloat, formatCurrency } from '@/app/lib/logic';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { Layers, ArrowDown, TrendingUp } from 'lucide-react';

// --- CONFIGURATION ---
const THEME = {
  income: '#3b82f6',
  wallet: '#1e293b',
  housing: '#fb923c',
  fixed: '#c084fc',
  life: '#facc15',
  invest: '#f87171',
  savings: '#22d3ee',
  gray: '#94a3b8'
};

const HUB_ID = "Budget";

// --- TYPES ---
// Type pour notre fonction d'ajout de lien
type AddLinkFn = (source: string, target: string, value: number, colorSource: string, colorTarget: string) => void;

// --- GÉNÉRATEURS DE FLUX (LES "BOUCLES") ---
// C'est ici que tu rajouteras tes futurs modules (Impôts, Dons, etc.)

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
    
    // Calcul du total d'abord
    allSubs.forEach((item: any) => total += safeFloat(item.amount));

    if (total > 0) {
        addLink(HUB_ID, "Abonnements", total, THEME.wallet, THEME.fixed);
        mobileItems.push({ label: "Abonnements & Charges", value: total, color: THEME.fixed });

        // Détails triés
        allSubs
            .sort((a: any, b: any) => safeFloat(b.amount) - safeFloat(a.amount))
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

    // Crédits conso (traités comme une sortie financière ici)
    let creditTotal = 0;
    const creditList = profile.credits || [];
    creditList.forEach((c: any) => creditTotal += safeFloat(c.monthlyPayment));

    // 1. Investissements
    if (total > 0) {
        addLink(HUB_ID, "Investissements", total, THEME.wallet, THEME.invest);
        mobileItems.push({ label: "Investissements", value: total, color: THEME.invest });
        
        investList
            .sort((a: any, b: any) => safeFloat(b.amount) - safeFloat(a.amount))
            .forEach((sav: any) => {
                 const val = safeFloat(sav.amount);
                 if (val > 0) addLink("Investissements", sav.name || "Épargne", val, THEME.invest, THEME.invest);
            });
    }

    // 2. Dettes
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


// --- COMPOSANT PRINCIPAL ---
export default function FinancialSankey() {
  const { profile, isLoaded } = useFinancialData();

  const { sankeyData, mobileData, totalIncome } = useMemo(() => {
    if (!isLoaded || !profile) return { sankeyData: { nodes: [], links: [] }, mobileData: [], totalIncome: 0 };
    
    const nodes: { id: string; nodeColor: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];
    const mobileItems: { label: string; value: number; color: string }[] = [];
    
    // Fonction utilitaire centralisée
    const addLink: AddLinkFn = (source, target, value, colorSource, colorTarget) => {
      if (value <= 0.5) return;
      if (!nodes.find(n => n.id === source)) nodes.push({ id: source, nodeColor: colorSource });
      if (!nodes.find(n => n.id === target)) nodes.push({ id: target, nodeColor: colorTarget });
      links.push({ source, target, value: Math.round(value) });
    };

    // 1. REVENUS (Entrée)
    const totalInc = calculateListTotal(profile.incomes);
    addLink("Revenus", HUB_ID, totalInc, THEME.income, THEME.wallet);

    // 2. EXÉCUTION DES MODULES (C'est ici que l'ordre visuel est défini)
    // L'ordre dans ce tableau détermine l'ordre d'affichage de haut en bas
    const steps = [
        processHousing,
        processFixedCosts,
        processDailyLife,
        processInvestments
    ];

    // On calcule toutes les sorties
    let totalOut = 0;
    steps.forEach(process => {
        totalOut += process(profile, addLink, mobileItems);
    });

    // 3. CASH DISPO (Calculé dynamiquement à la fin)
    const remainingCash = Math.max(0, totalInc - totalOut);
    if (remainingCash > 0) {
        addLink(HUB_ID, "Cash Dispo", remainingCash, THEME.wallet, THEME.savings);
        mobileItems.push({ label: "Cash Dispo", value: remainingCash, color: THEME.savings });
    }

    // Force la couleur du Hub
    const hubNode = nodes.find(n => n.id === HUB_ID);
    if (hubNode) hubNode.nodeColor = THEME.wallet;

    return { sankeyData: { nodes, links }, mobileData: mobileItems.sort((a, b) => b.value - a.value), totalIncome: totalInc };
  }, [profile, isLoaded]);

  // ... (Le reste du rendu JSX est identique à avant, incluant MobileFlowView)
  
  // (Je te remets juste le return principal pour la complétude)
  if (!isLoaded) return <div className="h-[500px] w-full bg-slate-50 animate-pulse rounded-3xl"></div>;
  if (sankeyData.links.length === 0) return null;

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers size={16} className="text-blue-600"/> Répartition détaillée
            </h3>
        </div>
        
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
        <div className="md:hidden bg-slate-50/50 min-h-[400px]">
            {/* On assume que MobileFlowView est défini plus haut ou importé */}
             {/* <MobileFlowView totals={mobileData} totalIncome={totalIncome} /> */}
             {/* Remplace par ton composant MobileFlowView réel si besoin */}
             <div className="p-4 text-center text-sm text-slate-500">Vue mobile optimisée</div>
        </div>
    </div>
  );
}
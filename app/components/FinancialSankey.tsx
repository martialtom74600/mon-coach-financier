'use client';

import { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { calculateListTotal, safeFloat, formatCurrency } from '@/app/lib/logic';
import { useFinancialData } from '@/app/hooks/useFinancialData';

// Palette de couleurs cohérente avec le reste de l'app
const THEME = {
  income: '#10b981',    // Emerald (Entrées)
  wallet: '#1e293b',    // Slate 800 (Portefeuille central)
  fixed: '#f59e0b',     // Amber (Charges fixes)
  variable: '#eab308',  // Yellow (Vie quotidienne)
  fun: '#a855f7',       // Purple (Plaisirs)
  invest: '#6366f1',    // Indigo (Investissement)
  housing: '#f43f5e',   // Rose (Logement)
  savings: '#14b8a6',   // Teal (Cash restant)
};

export default function FinancialSankey() {
  const { profile, isLoaded } = useFinancialData();

  // --- 1. CALCUL ET TRANSFORMATION DES DONNÉES (MÉMOISÉ) ---
  const data = useMemo(() => {
    if (!isLoaded || !profile) return { nodes: [], links: [] };

    const nodes: { id: string; nodeColor: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];

    // Helper pour construire le graphe proprement
    const addFlow = (source: string, target: string, value: number, color: string) => {
      if (value <= 0) return;
      
      // Ajout des noeuds s'ils n'existent pas
      if (!nodes.find(n => n.id === source)) nodes.push({ id: source, nodeColor: THEME.income });
      if (!nodes.find(n => n.id === target)) nodes.push({ id: target, nodeColor: color });

      links.push({ source, target, value: Math.round(value) });
    };

    // --- A. ENTRÉES (Income -> Portefeuille) ---
    const totalIncome = calculateListTotal(profile.incomes);
    
    // On groupe les revenus pour ne pas surcharger la gauche du graphe
    // Si un seul revenu, on met son nom, sinon "Revenus Totaux"
    if (profile.incomes.length === 1) {
        addFlow(profile.incomes[0].name, 'Portefeuille', safeFloat(profile.incomes[0].amount), THEME.wallet);
    } else {
        addFlow('Revenus', 'Portefeuille', totalIncome, THEME.wallet);
    }

    // --- B. SORTIES (Portefeuille -> Catégories) ---

    // 1. Logement
    let housingCost = 0;
    if (profile.housing?.status === 'tenant' || profile.housing?.status === 'owner_loan') {
        housingCost = safeFloat(profile.housing?.monthlyCost);
        addFlow('Portefeuille', 'Logement', housingCost, THEME.housing);
    }

    // 2. Charges Fixes (Agrégées par type pour la lisibilité)
    const fixedCosts = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
    const subscriptions = calculateListTotal(profile.subscriptions);
    const credits = calculateListTotal(profile.credits);

    addFlow('Portefeuille', 'Factures Fixes', fixedCosts, THEME.fixed);
    addFlow('Portefeuille', 'Abonnements', subscriptions, THEME.fixed);
    addFlow('Portefeuille', 'Crédits', credits, THEME.housing); // Ou couleur dette spécifique

    // 3. Vie Quotidienne (Courses, Essence...)
    const variable = calculateListTotal(profile.variableCosts || []);
    addFlow('Portefeuille', 'Vie Quotidienne', variable, THEME.variable);

    // 4. Plaisirs
    const fun = safeFloat(profile.funBudget);
    addFlow('Portefeuille', 'Plaisirs', fun, THEME.fun);

    // 5. Investissements (Flux)
    // On prend bien 'savingsContributions' qui contient le flux mensuel (ex: 810€)
    const investFlux = calculateListTotal(profile.savingsContributions || []);
    addFlow('Portefeuille', 'Investissements', investFlux, THEME.invest);

    // 6. Cash Restant (Équilibrage)
    const totalOut = housingCost + fixedCosts + subscriptions + credits + variable + fun + investFlux;
    const remainingCash = Math.max(0, totalIncome - totalOut);

    addFlow('Portefeuille', 'Cash Épargné', remainingCash, THEME.savings);

    return { nodes, links };
  }, [profile, isLoaded]);

  if (!isLoaded) return <div className="h-[400px] w-full bg-slate-50 animate-pulse rounded-2xl"></div>;
  if (data.links.length === 0) return null;

  return (
    <div className="h-[500px] w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <div>
                <h3 className="font-bold text-slate-900 text-lg">Flux Financiers</h3>
                <p className="text-slate-500 text-sm">Visualisation de vos entrées et sorties mensuelles.</p>
            </div>
        </div>
        
        <div className="flex-1 relative">
            <ResponsiveSankey
                data={data}
                margin={{ top: 40, right: 160, bottom: 40, left: 40 }}
                align="justify"
                colors={(node: any) => node.nodeColor}
                nodeOpacity={1}
                nodeHoverOthersOpacity={0.35}
                nodeThickness={18}
                nodeSpacing={24}
                nodeBorderRadius={6} // Plus doux
                linkOpacity={0.4}
                linkHoverOthersOpacity={0.1}
                linkContract={0}
                enableLinkGradient={true}
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={16}
                labelTextColor={{ from: 'color', modifiers: [ [ 'darker', 1.5 ] ] }}
                theme={{
                    fontFamily: 'inherit',
                    fontSize: 12,
                    labels: { text: { fontWeight: 600 } },
                }}
                tooltip={({ node, source, target, value }: any) => {
                    return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-800 z-50">
                            {node ? (
                                <span><strong>{node.id}</strong> : {formatCurrency(value)}</span>
                            ) : (
                                <span>{source.id} ➔ {target.id} : <strong>{formatCurrency(value)}</strong></span>
                            )}
                        </div>
                    );
                }}
            />
        </div>
    </div>
  );
}
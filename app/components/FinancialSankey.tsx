'use client';

import { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { calculateListTotal, safeFloat, formatCurrency } from '@/app/lib/logic';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { Layers } from 'lucide-react';

// --- PALETTE "ULTIMATE" (Haut Contraste & Moderne) ---
const THEME = {
  income: '#10b981',    // Emerald (Entrées) - Vif
  wallet: '#1e293b',    // Slate 900 (HUB CENTRAL) - Très sombre pour le contraste
  housing: '#ef4444',   // Red (Gros poste)
  fixed: '#f97316',     // Orange (Charges)
  variable: '#eab308',  // Yellow (Quotidien)
  fun: '#d946ef',       // Fuchsia (Plaisirs)
  invest: '#6366f1',    // Indigo (Futur)
  savings: '#06b6d4',   // Cyan (Cash dispo)
};

export default function FinancialSankey() {
  const { profile, isLoaded } = useFinancialData();

  // --- TRANSFORMATION DES DONNÉES ---
  const data = useMemo(() => {
    if (!isLoaded || !profile) return { nodes: [], links: [] };

    const nodes: { id: string; nodeColor: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];

    const addFlow = (source: string, target: string, value: number, color: string) => {
      if (value <= 0) return;
      
      // On s'assure que les noeuds existent avec la bonne couleur
      if (!nodes.find(n => n.id === source)) nodes.push({ id: source, nodeColor: THEME.income });
      
      const existingTarget = nodes.find(n => n.id === target);
      if (!existingTarget) {
          nodes.push({ id: target, nodeColor: color });
      } else {
          // Si le noeud existe (ex: Budget Global), on ne change pas sa couleur s'il est déjà défini
          if (target !== 'Budget Global') existingTarget.nodeColor = color;
      }

      links.push({ source, target, value: Math.round(value) });
    };

    // --- LOGIQUE METIER ---
    const totalIncome = calculateListTotal(profile.incomes);
    
    // Le Hub Central s'appelle "Budget" pour être court sur le graph
    const HUB_NAME = "Budget"; 

    // 1. Entrées
    addFlow('Revenus', HUB_NAME, totalIncome, THEME.wallet);

    // 2. Sorties
    let housingCost = 0;
    if (profile.housing?.status === 'tenant' || profile.housing?.status === 'owner_loan') {
        housingCost = safeFloat(profile.housing?.monthlyCost);
        addFlow(HUB_NAME, 'Logement', housingCost, THEME.housing);
    }

    const fixedCosts = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
    const subscriptions = calculateListTotal(profile.subscriptions);
    const credits = calculateListTotal(profile.credits);
    
    // Regroupement intelligent pour la lisibilité
    addFlow(HUB_NAME, 'Charges Fixes', fixedCosts + subscriptions, THEME.fixed);
    if (credits > 0) addFlow(HUB_NAME, 'Crédits', credits, THEME.housing);

    const variable = calculateListTotal(profile.variableCosts || []);
    addFlow(HUB_NAME, 'Vie Quotidienne', variable, THEME.variable);

    const fun = safeFloat(profile.funBudget);
    addFlow(HUB_NAME, 'Plaisirs', fun, THEME.fun);

    const investFlux = calculateListTotal(profile.savingsContributions || []);
    addFlow(HUB_NAME, 'Investissements', investFlux, THEME.invest);

    const totalOut = housingCost + fixedCosts + subscriptions + credits + variable + fun + investFlux;
    const remainingCash = Math.max(0, totalIncome - totalOut);
    addFlow(HUB_NAME, 'Cash Dispo', remainingCash, THEME.savings);

    // On force la couleur du HUB à la fin pour être sûr
    const hubNode = nodes.find(n => n.id === HUB_NAME);
    if (hubNode) hubNode.nodeColor = THEME.wallet;

    return { nodes, links };
  }, [profile, isLoaded]);

  if (!isLoaded) return <div className="h-[450px] w-full bg-slate-50 animate-pulse rounded-2xl"></div>;
  if (data.links.length === 0) return null;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-white border border-slate-200 text-indigo-600 rounded-lg shadow-sm"><Layers size={18} /></div>
                <div>
                    <h3 className="font-bold text-slate-900 text-sm">Répartition des Flux</h3>
                    <p className="text-xs text-slate-500">Vue mensuelle détaillée</p>
                </div>
            </div>
            {/* Légende rapide */}
            <div className="hidden md:flex gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-slate-500">Entrées</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-800"></div><span className="text-[10px] font-bold text-slate-500">Flux</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><span className="text-[10px] font-bold text-slate-500">Sorties</span></div>
            </div>
        </div>
        
        <div className="h-[450px] relative w-full bg-white p-2">
            <ResponsiveSankey
                data={data}
                // --- MARGES AJUSTÉES POUR LES TEXTES ---
                // Left: 100px (pour "Revenus + Montant")
                // Right: 160px (pour les catégories de droite)
                margin={{ top: 20, right: 160, bottom: 20, left: 100 }} 
                
                align="justify"
                colors={(node: any) => node.nodeColor}
                
                // === DESIGN DES NOEUDS ===
                nodeOpacity={1}
                nodeHoverOthersOpacity={0.3}
                nodeThickness={10}        // Plus fin = Plus élégant
                nodeSpacing={24}          // Bien aéré
                nodeBorderRadius={5}      // Effet capsule
                
                // === DESIGN DES LIENS ===
                linkOpacity={0.35}          // Plus visible que la version précédente
                linkHoverOpacity={0.8}
                linkContract={3}          // Espace blanc entre noeud et lien
                enableLinkGradient={true} // Dégradé fluide
                
                // === ETIQUETTES (LA CLÉ !) ===
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={14}
                // Ici on injecte le MONTANT directement dans le label affiché
                label={(node) => `${node.id} ${formatCurrency(node.value)}`}
                labelTextColor={{ from: 'color', modifiers: [ [ 'darker', 2.5 ] ] }}
                
                theme={{
                    fontFamily: 'inherit',
                    fontSize: 11, // Police légèrement plus petite pour tout faire rentrer
                    labels: { text: { fontWeight: 700 } }, // Gras pour la lisibilité
                }}
                
                // === TOOLTIP ===
                tooltip={({ node, source, target, value }: any) => {
                    return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 z-50 min-w-[140px]">
                            {node ? (
                                <div className="text-center">
                                    <span className="font-bold block text-sm mb-1">{node.id}</span>
                                    <span className="text-emerald-400 font-mono text-base font-bold">{formatCurrency(value)}</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1 text-center">
                                    <div className="text-slate-400 mb-1">{source.id} <span className="text-slate-600">➔</span> {target.id}</div>
                                    <div className="font-bold text-lg text-emerald-400">
                                        {formatCurrency(value)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }}
            />
        </div>
    </div>
  );
}
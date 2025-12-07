'use client';

import { ResponsiveSankey } from '@nivo/sankey';
import { calculateListTotal, safeFloat } from '@/app/lib/logic';

// On définit des couleurs sympas pour chaque catégorie
const COLORS: any = {
  income: '#10b981', // Emerald (Revenus)
  wallet: '#6366f1', // Indigo (Portefeuille central)
  housing: '#f43f5e', // Rose (Logement)
  fixed: '#f59e0b',  // Amber (Charges fixes)
  living: '#3b82f6', // Blue (Vie courante)
  savings: '#10b981', // Emerald (Épargne)
};

export default function FinancialSankey({ profile }: { profile: any }) {
  if (!profile) return null;

  // --- 1. PRÉPARATION DES DONNÉES (TRANSFORMATION) ---
  
  const nodes: any[] = [];
  const links: any[] = [];

  // Helper pour ajouter un lien unique
  const addLink = (source: string, target: string, value: number) => {
    if (value <= 0) return;
    // On vérifie si les noeuds existent, sinon on les crée
    if (!nodes.find(n => n.id === source)) nodes.push({ id: source, nodeColor: COLORS.income });
    
    // On assigne une couleur au noeud cible selon son type
    let targetColor = COLORS.fixed;
    if (target === 'Reste à Vivre' || target === 'Plaisirs') targetColor = COLORS.living;
    if (target.includes('Logement')) targetColor = COLORS.housing;
    if (target.includes('Épargne')) targetColor = COLORS.savings;
    if (target === 'Portefeuille') targetColor = COLORS.wallet;

    if (!nodes.find(n => n.id === target)) nodes.push({ id: target, nodeColor: targetColor });

    links.push({ source, target, value: Math.round(value) });
  };

  // A. REVENUS -> PORTEFEUILLE
  (profile.incomes || []).forEach((inc: any) => {
    addLink(inc.name || 'Revenu', 'Portefeuille', safeFloat(inc.amount));
  });

  // Si pas de revenus, on ne peut rien afficher
  if (links.length === 0) return <div className="text-center text-slate-400 py-10">Ajoutez des revenus pour voir le flux.</div>;

  // B. PORTEFEUILLE -> DÉPENSES
  
  // 1. Logement
  let housingCost = 0;
  if (profile.housing?.status === 'tenant' || profile.housing?.status === 'owner_loan') {
      housingCost = safeFloat(profile.housing?.monthlyCost);
      if(housingCost > 0) addLink('Portefeuille', 'Logement', housingCost);
  }

  // 2. Charges Fixes (Détail)
  (profile.fixedCosts || []).forEach((item: any) => addLink('Portefeuille', item.name, safeFloat(item.amount)));
  (profile.subscriptions || []).forEach((item: any) => addLink('Portefeuille', item.name, safeFloat(item.amount)));
  (profile.credits || []).forEach((item: any) => addLink('Portefeuille', item.name, safeFloat(item.amount)));

  // 3. Reste à vivre (Split Plaisir / Épargne si dispo, sinon global)
  // On recalcule le total des sorties fixes pour déduire le reste
  const totalIncome = calculateListTotal(profile.incomes);
  const totalFixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.subscriptions) + calculateListTotal(profile.credits) + housingCost;
  
  const remaining = Math.max(0, totalIncome - totalFixed);
  
  // Si on a défini un budget Bouffe/Plaisir (calculé à la fin du wizard)
  const food = safeFloat(profile.foodBudget);
  const fun = safeFloat(profile.funBudget);
  const savingCap = Math.max(0, remaining - food - fun);

  if (food > 0) addLink('Portefeuille', 'Alimentation', food);
  if (fun > 0) addLink('Portefeuille', 'Plaisirs', fun);
  
  // Le reste part en "Capacité d'épargne" ou "Non affecté"
  if (savingCap > 0) {
      addLink('Portefeuille', 'Capacité Épargne', savingCap);
  } else if (remaining > 0 && food === 0) {
      // Si on n'a pas encore fini le wizard (pas de food/fun défini)
      addLink('Portefeuille', 'Reste à Vivre', remaining);
  }

  // --- 2. RENDU DU GRAPHIQUE ---

  return (
    <div className="h-[500px] w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
            <h3 className="font-bold text-slate-900 text-lg">Flux Financiers</h3>
            <p className="text-slate-500 text-sm">Visualisation de vos entrées et sorties</p>
        </div>
        <ResponsiveSankey
            data={{ nodes, links }}
            margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
            align="justify"
            colors={(node: any) => node.nodeColor || '#cbd5e1'}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={18}
            nodeSpacing={24}
            nodeBorderWidth={0}
            nodeBorderRadius={3}
            linkOpacity={0.5}
            linkHoverOthersOpacity={0.1}
            linkContract={3}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={16}
            labelTextColor={{ from: 'color', modifiers: [ [ 'darker', 1 ] ] }}
            // Personnalisation du Tooltip au survol
            tooltip={({ node, source, target, value }: any) => {
                if (node) {
                    return (
                        <div className="bg-white p-2 rounded-lg shadow-lg border border-slate-100 text-xs font-bold text-slate-700">
                            {node.label}: {value} €
                        </div>
                    )
                }
                return (
                    <div className="bg-white p-2 rounded-lg shadow-lg border border-slate-100 text-xs text-slate-500">
                        <strong className="text-slate-900">{source.label}</strong> ➔ <strong className="text-slate-900">{target.label}</strong> : {value} €
                    </div>
                );
            }}
        />
    </div>
  );
}
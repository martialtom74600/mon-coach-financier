// app/lib/logic.ts

// 1. On exporte TOUT depuis tes 3 nouveaux fichiers
export * from './definitions';
export * from './engine';
export * from './scenarios';

// 2. On ajoute une petite compatibilité pour tes anciennes pages
// (Au cas où une page appelle encore calculateFinancials à l'ancienne)
import { computeFinancialPlan } from './engine';

export const calculateFinancials = (profile: any) => {
  const plan = computeFinancialPlan(profile);
  // On renvoie un mix pour que l'ancien code s'y retrouve
  return {
    ...plan.budget,
    totalGoalsEffort: plan.budget.capacity - plan.freeCashFlow, // Effort calculé
    goalsBreakdown: plan.allocations, // Nouvelle liste
    realCashflow: plan.freeCashFlow // Vrai reste à vivre
  };
};
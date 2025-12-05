// app/lib/logic.ts

// 1. On exporte TOUT depuis tes nouveaux fichiers
export * from './definitions';
export * from './engine';
export * from './scenarios';

import { computeFinancialPlan, analyzeProfileHealth } from './engine';

export const calculateFinancials = (profile: any) => {
  const plan = computeFinancialPlan(profile);
  
  // ✅ L'analyse Docteur est déclenchée ici
  const diagnosis = analyzeProfileHealth(profile, plan.budget);

  // On renvoie un mix pour que l'ancien code s'y retrouve + le diagnostic
  return {
    ...plan.budget,
    totalGoalsEffort: plan.budget.capacity - plan.freeCashFlow, 
    goalsBreakdown: plan.allocations, 
    realCashflow: plan.freeCashFlow,
    diagnosis // <--- EXPOSÉ POUR LE FRONTEND
  };
};
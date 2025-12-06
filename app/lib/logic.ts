// app/lib/logic.ts

export * from './definitions';
export * from './engine';
export * from './scenarios';

import { computeFinancialPlan, analyzeProfileHealth } from './engine';

export const calculateFinancials = (profile: any) => {
  const plan = computeFinancialPlan(profile);
  
  // ✅ CORRECTION : On lance l'analyse "Docteur" ici
  const diagnosis = analyzeProfileHealth(profile, plan.budget);

  return {
    ...plan.budget,
    totalGoalsEffort: plan.budget.capacity - plan.freeCashFlow, 
    goalsBreakdown: plan.allocations, 
    realCashflow: plan.freeCashFlow,
    diagnosis // <--- Sans ça, le bloc "Coach" ne s'affiche pas !
  };
};
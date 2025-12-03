import { CONSTANTS, PERSONA_PRESETS } from './constants';
import { calculateListTotal, safeFloat } from './utils';
import { calculateMonthlyEffort, analyzeGoalStrategies } from './goals'; 
import { Profile, Goal } from './types'; 

// ============================================================================
// 1. CALCULS DU PROFIL (DASHBOARD)
// ============================================================================
export const calculateFinancials = (profile: Profile) => {
  // 1. REVENUS
  const monthlyIncome = calculateListTotal(profile.incomes);

  // 2. DÉPENSES FIXES (Le "Must have")
  const monthlyFixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
  const monthlySubs = calculateListTotal(profile.subscriptions);
  const monthlyCredits = calculateListTotal(profile.credits);
  const mandatoryExpenses = monthlyFixed + monthlySubs + monthlyCredits;

  // 3. PRÉ-CALCUL DE LA CAPACITÉ & RÈGLES
  const discretionaryExpenses = safeFloat(profile.variableCosts);
  
  // Récupération des règles du profil (Persona)
  const currentPersonaKey = (profile.persona || 'salaried').toUpperCase();
  const preset = PERSONA_PRESETS[currentPersonaKey] || PERSONA_PRESETS.SALARIED;
  const baseRules = preset.rules;

  // Reste "brut" après charges fixes
  const rawRemaining = monthlyIncome - mandatoryExpenses; 
  
  // Capacité d'épargne "Naturelle"
  const capacityToSave = Math.max(0, rawRemaining - discretionaryExpenses);

  // 4. SÉCURITÉ & MARGE DE MANŒUVRE (La partie "Blindée")
  const matelasTotal = safeFloat(profile.savings);

  // A. On calcule le besoin mensuel vital (Charges Fixes + Vie Courante)
  const monthlyNeeds = mandatoryExpenses + discretionaryExpenses;

  // B. On définit le Seuil de Sécurité (La ligne rouge à ne pas franchir)
  // Ex: Si le profil doit avoir 3 mois d'avance
  const safetyThreshold = monthlyNeeds * (baseRules.safetyMonths || 3);
  
  // C. On calcule l'Épargne "Libre" (Ce qu'on a le droit de toucher pour les projets)
  // Si le matelas est inférieur au seuil, c'est 0.
  const availableForProjects = Math.max(0, matelasTotal - safetyThreshold);

  // 5. GESTION DES OBJECTIFS & ÉPARGNE
  const manualSavings = calculateListTotal(profile.savingsContributions);
  let totalGoalsEffort = 0;
  
  const goalsBreakdown = (profile.goals || []).map((goal: Goal) => {
      // A. Maths pures
      const monthlyNeed = calculateMonthlyEffort(goal);
      
      // B. Intelligence & Stratégie
      const diagnosis = analyzeGoalStrategies(
          goal, 
          monthlyNeed, 
          capacityToSave, 
          discretionaryExpenses,
          monthlyIncome,
          availableForProjects // <--- ✅ On passe uniquement le surplus sécurisé
      );

      totalGoalsEffort += monthlyNeed;

      return { 
          ...goal, 
          monthlyNeed,
          diagnosis 
      };
  });

  // 6. TOTAUX FINAUX
  const profitableExpenses = manualSavings + totalGoalsEffort;
  const totalRecurring = mandatoryExpenses + profitableExpenses;
  
  const remainingToLive = monthlyIncome - totalRecurring;
  const realCashflow = monthlyIncome - (mandatoryExpenses + discretionaryExpenses + profitableExpenses);

  // 7. PATRIMOINE
  const yieldRate = safeFloat(profile.investmentYield) / 100;
  // On projette le rendement sur l'épargne manuelle annualisée
  const projectedAnnualYield = (manualSavings * 12) * yieldRate;

  const investments = safeFloat(profile.investments); 
  const currentBalance = safeFloat(profile.currentBalance);
  
  const totalWealth = matelasTotal + investments + currentBalance;

  // 8. FOYER & RATIOS
  const adults = Math.max(1, safeFloat(profile.household?.adults) || 1);
  const children = Math.max(0, safeFloat(profile.household?.children) || 0);
  
  const adjustedMinLiving = baseRules.minLiving + ((adults - 1) * 150) + (children * 120);
  const userRules = { ...baseRules, minLiving: adjustedMinLiving };
  
  // Ratio de sécurité réel
  const essentialMonthlyNeeds = mandatoryExpenses + (discretionaryExpenses * 0.5);
  let safetyMonths = 0;
  if (essentialMonthlyNeeds > 0) safetyMonths = matelasTotal / essentialMonthlyNeeds;
  else if (matelasTotal > 0) safetyMonths = 99;
  
  const dailyIncome = monthlyIncome > 0 ? monthlyIncome / CONSTANTS.AVG_WORK_DAYS_MONTH : 0;
  const engagementRate = monthlyIncome > 0 ? (mandatoryExpenses / monthlyIncome) * 100 : 0;

  return {
    monthlyIncome,
    mandatoryExpenses,
    discretionaryExpenses,
    profitableExpenses, 
    totalGoalsEffort, 
    goalsBreakdown,
    projectedAnnualYield,
    totalRecurring,
    remainingToLive,
    realCashflow,
    engagementRate,
    matelas: matelasTotal, // On renvoie le total pour l'affichage, même si on a filtré pour les stratégies
    investments,
    totalWealth,
    safetyMonths,
    dailyIncome,
    capacityToSave,
    rules: userRules, 
    firstName: profile.firstName || 'Utilisateur',
    persona: profile.persona || 'salaried'
  };
};
import { CONSTANTS, PERSONA_PRESETS } from './constants';
import { calculateFutureValue, formatCurrency, calculateListTotal } from './utils';

// --- CALCULS DU PROFIL (DASHBOARD) ---
export const calculateFinancials = (profile: any) => {
  
  // 1. REVENUS (On utilise le calculateur universel importé de utils)
  const monthlyIncome = calculateListTotal(profile.incomes);

  // 2. DÉPENSES OBLIGATOIRES
  const monthlyFixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
  const monthlySubs = calculateListTotal(profile.subscriptions);
  const monthlyCredits = calculateListTotal(profile.credits);
  
  const mandatoryExpenses = monthlyFixed + monthlySubs + monthlyCredits;

  // 3. DÉPENSES RENTABLES (Investissements)
  const profitableExpenses = calculateListTotal(profile.savingsContributions);

  // 4. DÉPENSES DE CHOIX (Variable)
  const discretionaryExpenses = Math.abs(parseFloat(profile.variableCosts) || 0);

  // TOTAUX
  const totalRecurring = mandatoryExpenses + profitableExpenses;
  const remainingToLive = monthlyIncome - totalRecurring;
  
  // Capacité d'épargne réelle (Net après tout)
  const capacityToSave = Math.max(0, remainingToLive - discretionaryExpenses);
  const realCashflow = monthlyIncome - (mandatoryExpenses + discretionaryExpenses + profitableExpenses);

  // --- RENDEMENT PROJETÉ ---
  const yieldRate = (parseFloat(profile.investmentYield) || 0) / 100;
  const projectedAnnualYield = (profitableExpenses * 12) * yieldRate;

  // --- STOCKS (PATRIMOINE) ---
  const matelas = Math.abs(parseFloat(profile.savings) || 0); 
  const investments = Math.abs(parseFloat(profile.investments) || 0); 
  const totalWealth = matelas + investments + (parseFloat(profile.currentBalance) || 0);

  // --- RÈGLES ---
  const currentPersonaKey = (profile.persona || 'salaried').toUpperCase();
  // @ts-ignore
  const baseRules = PERSONA_PRESETS[currentPersonaKey]?.rules || PERSONA_PRESETS.SALARIED.rules;
  
  const adults = Math.max(1, parseInt(profile.household?.adults) || 1);
  const children = Math.max(0, parseInt(profile.household?.children) || 0);
  const adjustedMinLiving = baseRules.minLiving + ((adults - 1) * 150) + (children * 120);

  const userRules = { ...baseRules, minLiving: adjustedMinLiving };

  // Ratios de sécurité
  const essentialMonthlyNeeds = mandatoryExpenses + (discretionaryExpenses * 0.5);
  let safetyMonths = 0;
  if (essentialMonthlyNeeds > 0) safetyMonths = matelas / essentialMonthlyNeeds;
  else if (matelas > 0) safetyMonths = 99;
  
  const dailyIncome = monthlyIncome > 0 ? monthlyIncome / CONSTANTS.AVG_WORK_DAYS_MONTH : 0;
  const engagementRate = monthlyIncome > 0 ? (mandatoryExpenses / monthlyIncome) * 100 : 0;

  return {
    monthlyIncome,
    mandatoryExpenses,
    discretionaryExpenses,
    profitableExpenses,
    projectedAnnualYield,
    totalRecurring,
    remainingToLive,
    realCashflow,
    engagementRate,
    matelas,
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

// --- MOTEUR D'ANALYSE D'ACHAT (SIMULATEUR) ---
export const analyzePurchaseImpact = (currentStats: any, purchase: any) => {
  const amount = Math.abs(parseFloat(purchase.amount) || 0);
  const { isReimbursable = false, isPro = false } = purchase;
  const rules = currentStats.rules;

  let newMatelas = currentStats.matelas;
  let newRV = currentStats.remainingToLive;
  let monthlyCost = 0;
  let creditCost = 0;
  let opportunityCost = 0;
  let timeToWork = 0;
  let realCost = amount;

  if (purchase.paymentMode === 'CASH_SAVINGS') {
    newMatelas = Math.max(0, currentStats.matelas - amount);
    opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (purchase.paymentMode === 'CASH_ACCOUNT') {
    newRV = currentStats.remainingToLive - amount;
    opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (purchase.paymentMode === 'SUBSCRIPTION') {
    monthlyCost = amount;
    newRV = currentStats.remainingToLive - monthlyCost;
    const totalPaid5Years = amount * 12 * 5;
    opportunityCost = calculateFutureValue(totalPaid5Years, CONSTANTS.INVESTMENT_RATE, 5) - totalPaid5Years;
    realCost = amount * 12; 
  }
  else {
    const months = Math.max(1, parseInt(purchase.duration) || 3);
    if (purchase.paymentMode === 'CREDIT') {
      const rate = Math.abs(parseFloat(purchase.rate) || 0);
      const totalPaid = amount * (1 + (rate / 100) * (months / 12)); 
      monthlyCost = totalPaid / months;
      creditCost = totalPaid - amount;
      realCost = totalPaid;
    } else {
      monthlyCost = amount / months;
    }
    newRV = currentStats.remainingToLive - monthlyCost;
    opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  }

  if (isReimbursable) { realCost = 0; creditCost = 0; opportunityCost = 0; timeToWork = 0; }
  else if (isPro) { opportunityCost = 0; }

  if (currentStats.dailyIncome > 1 && !isReimbursable) {
    const costToCompare = purchase.paymentMode === 'SUBSCRIPTION' ? (amount * 12) : realCost;
    timeToWork = costToCompare / currentStats.dailyIncome;
  }

  const newMonthlyExpenses = currentStats.mandatoryExpenses + (monthlyCost > 0 ? monthlyCost : 0) + (currentStats.discretionaryExpenses * 0.5);
  let newSafetyMonths = 0;
  if (newMonthlyExpenses > 0) newSafetyMonths = newMatelas / newMonthlyExpenses;
  else if (newMatelas > 0) newSafetyMonths = 99;

  let newEngagementRate = 0;
  if (currentStats.monthlyIncome > 0) {
    newEngagementRate = ((currentStats.mandatoryExpenses + monthlyCost) / currentStats.monthlyIncome) * 100;
  }

  const issues = [];
  const tips = [];
  let score = 100;

  if (purchase.paymentMode === 'CASH_SAVINGS' && amount > currentStats.matelas) {
      issues.push({ level: 'red', text: `FONDS INSUFFISANTS : Tu n'as que ${formatCurrency(currentStats.matelas)} d'épargne dispo.` });
      tips.push({ type: 'stop', title: "Achat Impossible", text: "Ton épargne disponible est insuffisante." });
      score -= 100;
  }

  const missingCash = rules.minLiving - newRV; 
  const isLiquidityIssue = purchase.paymentMode === 'CASH_ACCOUNT' && missingCash > 0;
  
  if (isLiquidityIssue) {
      if (newMatelas > missingCash) {
          issues.push({ level: 'orange', text: `Trésorerie : Compte courant bas.` });
          tips.push({ type: 'action', title: "Virement nécessaire", text: `Fais un virement de ${formatCurrency(missingCash)} depuis ton épargne dispo.` });
          score -= 20;
      } else {
          issues.push({ level: 'red', text: `DANGER : Reste à vivre insuffisant.` });
          score -= 100;
      }
  }
  
  if (!isReimbursable) {
      if (newSafetyMonths < 1) {
          if (currentStats.safetyMonths > 0) {
             issues.push({ level: 'red', text: `Épargne de sécurité épuisée.` });
             score -= 40;
          }
      } else if (newSafetyMonths < rules.safetyMonths) {
          issues.push({ level: 'orange', text: `Fragilité : Sécurité sous l'objectif.` });
          score -= 20;
      }
  }

  if (newEngagementRate > 45 && !isReimbursable) {
    issues.push({ level: 'orange', text: `Charges élevées (${newEngagementRate.toFixed(0)}%).` });
    score -= 15;
  }

  let verdict = 'green';
  if (score < 50 || issues.some((i: any) => i.level === 'red')) verdict = 'red';
  else if (score < 80 || issues.some((i: any) => i.level === 'orange')) verdict = 'orange';

  let smartTip = "Tout est ok.";
  if (verdict === 'red') smartTip = "Attention, cet achat déséquilibre tes finances.";
  else if (verdict === 'green') smartTip = "Feu vert, profite !";

  return { verdict, score, issues, tips, newMatelas, newRV, newSafetyMonths, newEngagementRate, realCost, creditCost, opportunityCost, timeToWork, smartTip };
};
// app/lib/engine.ts
import { differenceInMonths, isValid, addMonths } from 'date-fns';
import { Profile, Goal, SimulationResult, GoalDiagnosis, GoalStrategy, safeFloat, calculateListTotal, CONSTANTS, GOAL_CATEGORIES, PERSONA_PRESETS } from './definitions';

// --- HELPER INFLATION ---
const calculateInflationImpact = (amount: number, deadline: Date): number => {
    const today = new Date();
    const years = differenceInMonths(deadline, today) / 12;
    if (years <= 0) return amount;
    return amount * Math.pow(1 + CONSTANTS.INFLATION_RATE, years);
};

const calculateCompoundMonthsNeeded = (target: number, pmt: number, ratePercent: number): number => {
    if (pmt <= 0) return 999;
    if (ratePercent <= 0) return Math.ceil(target / pmt);
    const r = (ratePercent / 100) / 12;
    try { return Math.ceil(Math.log(((target * r) / pmt) + 1) / Math.log(1 + r)); } catch(e) { return 999; }
};

// --- SOUS-MOTEUR 1 : Calcul d'un Goal (Micro) ---
export const calculateMonthlyEffort = (goal: Goal): number => {
  if (!goal.targetAmount || !goal.deadline) return 0;
  const targetDate = new Date(goal.deadline);
  const today = new Date();
  if (!isValid(targetDate)) return 0;
  if (targetDate <= today) return Math.max(0, safeFloat(goal.targetAmount) - safeFloat(goal.currentSaved));

  const months = Math.max(1, differenceInMonths(targetDate, today));
  const current = safeFloat(goal.currentSaved);
  const target = safeFloat(goal.targetAmount);
  const rate = safeFloat(goal.projectedYield);

  // Intérêts Composés
  if (goal.isInvested && rate > 0) {
    const r = (rate / 100) / 12;
    const fv_current = current * Math.pow(1 + r, months);
    const remaining = target - fv_current;
    return remaining <= 0 ? 0 : remaining * (r / (Math.pow(1 + r, months) - 1));
  }
  return Math.max(0, target - current) / months;
};

export const simulateGoalProjection = (goal: Goal, monthlyContribution: number) => {
    const projection = [];
    const today = new Date();
    const months = differenceInMonths(new Date(goal.deadline), today);
    const rate = safeFloat(goal.projectedYield);
    const r = (goal.isInvested && rate > 0) ? (rate / 100) / 12 : 0;
    let balance = safeFloat(goal.currentSaved);
    let contributed = balance;
    let interests = 0;
    projection.push({ month: 0, date: today, balance, contributed, interests: 0 });
    for (let i = 1; i <= months; i++) {
        const interestEarned = balance * r;
        balance += monthlyContribution + interestEarned;
        contributed += monthlyContribution;
        interests += interestEarned;
        projection.push({ month: i, date: addMonths(today, i), balance: Math.round(balance), contributed: Math.round(contributed), interests: Math.round(interests) });
    }
    return { projection, summary: { totalPocket: Math.round(contributed), totalInterests: Math.round(interests), finalAmount: Math.round(balance) }};
};

export const analyzeGoalStrategies = (goal: Goal, monthlyEffortNeeded: number, currentCapacity: number, discretionaryExpenses: number, totalIncome: number, availableGlobalSavings: number = 0): GoalDiagnosis => {
    let status: GoalDiagnosis['status'] = 'POSSIBLE';
    let label = 'Réalisable';
    let color = 'green';
    let mainMessage = "Budget OK.";
    const gap = monthlyEffortNeeded - currentCapacity;
    const target = safeFloat(goal.targetAmount);
    
    const inflationTarget = calculateInflationImpact(target, new Date(goal.deadline));
    const inflationGap = inflationTarget - target;
    const isInflationSignificant = inflationGap > (target * 0.05);

    if (monthlyEffortNeeded <= 0) return { status: 'DONE', label: 'Financé', color: 'green', mainMessage: "Objectif couvert par l'apport.", strategies: [] };
    if (monthlyEffortNeeded > totalIncome) return { status: 'IMPOSSIBLE', label: 'Irréaliste', color: 'black', mainMessage: "Dépasse vos revenus.", strategies: [] };

    if (gap > 0) {
        status = 'HARD'; label = 'Difficile'; color = 'red';
        mainMessage = `Manque ${Math.round(gap)}€/mois.`;
    } else if (isInflationSignificant) {
        mainMessage = `Attention inflation : perte de ${Math.round(inflationGap)}€ de pouvoir d'achat.`;
    }

    const strategies: GoalStrategy[] = [];
    if (isInflationSignificant) {
        strategies.push({ type: 'INCOME', title: 'Inflation', description: `Coût réel futur : ${Math.round(inflationTarget)}€`, disabled: true });
    }

    if (status === 'HARD') {
        const maxDeposit = Math.min(availableGlobalSavings, target * 0.2);
        if (availableGlobalSavings > 500) {
            const newCurrent = safeFloat(goal.currentSaved) + maxDeposit;
            const tempGoal = { ...goal, currentSaved: newCurrent };
            const newEffort = calculateMonthlyEffort(tempGoal);
            if (newEffort <= currentCapacity) {
                strategies.push({ type: 'BUDGET', title: "Utiliser l'épargne", description: `Injecter ${Math.round(maxDeposit)}€`, value: maxDeposit, actionLabel: "Simuler un virement" });
            }
        }
        const rate = safeFloat(goal.projectedYield);
        const monthsNeeded = calculateCompoundMonthsNeeded(target - safeFloat(goal.currentSaved), currentCapacity, rate);
        if (monthsNeeded < 360) {
            const newDate = addMonths(new Date(), monthsNeeded);
            strategies.push({ type: 'TIME', title: 'Patienter', description: `Finir en ${newDate.toLocaleDateString('fr-FR', {month:'short', year:'2-digit'})}`, value: newDate.toISOString() });
        }
    }
    return { status, label, color, mainMessage, gap: Math.max(0, gap), strategies };
};

// --- SOUS-MOTEUR 2 : Distribution (Waterfall) ---
export const distributeGoals = (goals: Goal[], capacity: number) => {
  // ✅ FIX: On calcule le budget MAX allouable aux projets (Capacity - Buffer)
  const maxProjectBudget = Math.max(0, capacity * (1 - CONSTANTS.BUFFER_RATIO));
  
  let available = maxProjectBudget;
  const allocations = [];

  const sorted = [...goals].sort((a, b) => {
    const pA = GOAL_CATEGORIES[a.category]?.priority || 3;
    const pB = GOAL_CATEGORIES[b.category]?.priority || 3;
    if (pA !== pB) return pA - pB;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  for (const goal of sorted) {
    const required = calculateMonthlyEffort(goal);
    const tier = GOAL_CATEGORIES[goal.category]?.priority || 3;
    let allocated = 0;
    
    if (available >= required) { allocated = required; }
    else if (available > 0) { allocated = available; }
    else { allocated = 0; }

    available -= allocated;
    
    allocations.push({
      id: goal.id, name: goal.name, tier: tier === 1 ? 'SAFETY' : tier === 2 ? 'HARD' : tier === 3 ? 'SOFT' : 'GROWTH',
      requestedEffort: required, allocatedEffort: allocated,
      status: allocated >= required ? 'FULL' : (allocated > 0 ? 'PARTIAL' : 'STARVED') as 'FULL'|'PARTIAL'|'STARVED',
      fillRate: required > 0 ? Math.round((allocated / required) * 100) : 100,
      message: allocated >= required ? 'Financé' : 'Budget restreint'
    });
  }

  // ✅ FIX: On retourne le total réellement utilisé
  const totalAllocated = maxProjectBudget - available;

  return { allocations, totalAllocated }; 
};

// --- ORCHESTRATEUR PRINCIPAL ---
export const computeFinancialPlan = (profile: Profile): SimulationResult => {
  // 1. Analyse Budgetaire (Finance)
  const monthlyIncome = calculateListTotal(profile.incomes);
  const monthlyFixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
  const monthlySubs = calculateListTotal(profile.subscriptions);
  const monthlyCredits = calculateListTotal(profile.credits);
  const mandatoryExpenses = monthlyFixed + monthlySubs + monthlyCredits;
  const discretionaryExpenses = safeFloat(profile.variableCosts);
  const manualSavings = calculateListTotal(profile.savingsContributions);
  
  const capacityToSave = Math.max(0, monthlyIncome - mandatoryExpenses - discretionaryExpenses);

  // Règles Persona
  const currentPersonaKey = (profile.persona || 'salaried').toUpperCase();
  const preset = PERSONA_PRESETS[currentPersonaKey] || PERSONA_PRESETS.SALARIED;
  const adults = Math.max(1, safeFloat(profile.household?.adults) || 1);
  const children = Math.max(0, safeFloat(profile.household?.children) || 0);
  const adjustedMinLiving = preset.rules.minLiving + ((adults - 1) * 150) + (children * 120);
  const rules = { ...preset.rules, minLiving: adjustedMinLiving };

  // 2. Stratégie (Goals)
  // ✅ FIX: On récupère le total alloué (totalAllocated) au lieu du remaining
  const { allocations, totalAllocated } = distributeGoals(profile.goals || [], capacityToSave);

  // 3. Calcul du cashflow réel final (incluant le buffer invisible)
  // Si 0 projets -> capacityToSave - 0 = capacityToSave
  // Si projets pleins -> capacityToSave - maxProjectBudget = Le Buffer
  const realCashflow = Math.max(0, capacityToSave - totalAllocated);

  // 4. Calcul des KPIs pour le Dashboard
  const matelas = safeFloat(profile.savings);
  const essentialMonthlyNeeds = mandatoryExpenses + (discretionaryExpenses * 0.5);
  
  let safetyMonths = 0;
  if (essentialMonthlyNeeds > 0) {
      safetyMonths = matelas / essentialMonthlyNeeds;
  } else if (matelas > 0) {
      safetyMonths = 99;
  }

  const engagementRate = monthlyIncome > 0 ? (mandatoryExpenses / monthlyIncome) * 100 : 0;
  
  const investments = safeFloat(profile.investments);
  const totalWealth = matelas + investments + safeFloat(profile.currentBalance);

  return {
    budget: { 
      income: monthlyIncome, 
      fixed: mandatoryExpenses, 
      capacity: capacityToSave, 
      
      // ✅ FIX: "Reste à vivre" = tout ce qu'on n'a pas mis dans les charges ni dans les projets
      remainingToLive: monthlyIncome - mandatoryExpenses - totalAllocated, 
      
      // Données de compatibilité pour le Dashboard
      monthlyIncome, 
      mandatoryExpenses,
      discretionaryExpenses,
      capacityToSave,
      
      // ✅ FIX: On utilise totalAllocated ici aussi pour la précision
      profitableExpenses: manualSavings + totalAllocated, // Épargne totale (Manuelle + Projets)
      totalGoalsEffort: totalAllocated, // Effort auto goals (Doit être 0 si 0 projets)
      totalRecurring: mandatoryExpenses + manualSavings,
      
      realCashflow: realCashflow, // C'est ici que se trouve ton argent "libre" + buffer
      
      matelas,
      investments,
      totalWealth,
      safetyMonths,
      engagementRate,
      rules
    },
    allocations,
    freeCashFlow: realCashflow
  };
};
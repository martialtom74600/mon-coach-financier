import { differenceInMonths, isValid, addMonths } from 'date-fns';
import { 
  Profile, Goal, SimulationResult, GoalDiagnosis, GoalStrategy, 
  DeepAnalysis, OptimizationOpportunity, 
  safeFloat, calculateListTotal, formatCurrency, 
  CONSTANTS, GOAL_CATEGORIES, PERSONA_PRESETS 
} from './definitions';

// ============================================================================
// 1. BASE DE CONNAISSANCE FINANCIÈRE (Le "Cerveau" Statique)
// ============================================================================
const FINANCIAL_KNOWLEDGE = {
  RATES: {
    INFLATION: 0.025,    // 2.5%
    LIVRET_A: 0.03,      // 3.0%
    LEP: 0.05,           // 5.0% (Le placement roi pour revenus modestes)
    MARKET_AVG: 0.07,    // 7.0% (Bourse monde lissée)
    SAFE_WITHDRAWAL: 0.04 // Règle des 4% (FIRE)
  },
  CEILINGS: {
    LIVRET_A: 22950,
    LDDS: 12000,
    LEP: 10000,
    PEA: 150000
  },
  THRESHOLDS: {
    LEP_INCOME_SINGLE: 22000, // Seuil approx RFR 1 part
    LEP_INCOME_COUPLE: 34000, // Seuil approx RFR 2 parts
    HCSF_DEBT_RATIO: 35,      // Max endettement légal
    RICH_INCOME: 4000,        // Seuil psychologique "Aisé"
    POOR_INCOME: 1800         // Seuil vigilance
  }
};

// ============================================================================
// 2. SOUS-MOTEURS (Calculs)
// ============================================================================

const calculateInflationImpact = (amount: number, deadline: Date): number => {
    const today = new Date();
    const years = differenceInMonths(deadline, today) / 12;
    if (years <= 0) return amount;
    return amount * Math.pow(1 + FINANCIAL_KNOWLEDGE.RATES.INFLATION, years);
};

const calculateCompoundMonthsNeeded = (target: number, pmt: number, ratePercent: number): number => {
    if (pmt <= 0) return 999;
    if (ratePercent <= 0) return Math.ceil(target / pmt);
    const r = (ratePercent / 100) / 12;
    try { return Math.ceil(Math.log(((target * r) / pmt) + 1) / Math.log(1 + r)); } catch(e) { return 999; }
};

export const calculateMonthlyEffort = (goal: Goal): number => {
  if (!goal.targetAmount || !goal.deadline) return 0;
  const targetDate = new Date(goal.deadline);
  const today = new Date();
  if (!isValid(targetDate)) return 0;
  if (targetDate <= today) return Math.max(0, safeFloat(goal.targetAmount) - safeFloat(goal.currentSaved));

  const months = Math.max(1, differenceInMonths(targetDate, today));
  const current = safeFloat(goal.currentSaved);
  const target = safeFloat(goal.targetAmount);
  
  if (goal.isInvested) {
    // Si investi, on suppose un rendement par défaut si non précisé
    const rate = safeFloat(goal.projectedYield) || (FINANCIAL_KNOWLEDGE.RATES.MARKET_AVG * 100);
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
    const rate = safeFloat(goal.projectedYield) || (goal.isInvested ? 5 : 0);
    const r = (goal.isInvested && rate > 0) ? (rate / 100) / 12 : 0;
    let balance = safeFloat(goal.currentSaved);
    let contributed = balance;
    let interests = 0;
    projection.push({ month: 0, date: today, balance, contributed, interests: 0 });
    
    // On simule mois par mois
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
        mainMessage = `Attention : l'inflation augmentera le coût réel de ~${Math.round(inflationGap)}€.`;
    }

    const strategies: GoalStrategy[] = [];
    
    // Stratégie Inflation
    if (isInflationSignificant) {
        strategies.push({ 
            type: 'INCOME', 
            title: 'Inflation', 
            message: `Dans ${(differenceInMonths(new Date(goal.deadline), new Date())/12).toFixed(1)} ans, ce projet coûtera sûrement ${Math.round(inflationTarget)}€.`, 
            disabled: true 
        });
    }

    if (status === 'HARD') {
        // Stratégie 1 : Utiliser l'épargne existante (Smart Injection)
        const maxDeposit = Math.min(availableGlobalSavings, target * 0.3); // On ne vide pas tout le matelas
        if (availableGlobalSavings > 1000) {
            const newCurrent = safeFloat(goal.currentSaved) + maxDeposit;
            const tempGoal = { ...goal, currentSaved: newCurrent };
            const newEffort = calculateMonthlyEffort(tempGoal);
            if (newEffort <= currentCapacity) {
                strategies.push({ 
                    type: 'BUDGET', 
                    title: "Boost Épargne", 
                    message: `En injectant ${Math.round(maxDeposit)}€ de votre épargne actuelle, l'effort mensuel devient supportable.`, 
                    value: maxDeposit, 
                    actionLabel: "Simuler un virement" 
                });
            }
        }
        
        // Stratégie 2 : Intérêts Composés (Si pas encore investi)
        if (!goal.isInvested && differenceInMonths(new Date(goal.deadline), new Date()) > 24) {
             strategies.push({
                 type: 'HYBRID',
                 title: 'Placer cet argent',
                 message: `Sur un projet > 2 ans, ne laissez pas l'argent dormir. En le plaçant à 4%, vous réduisez l'effort d'épargne.`,
                 actionLabel: "Activer les intérêts"
             });
        }

        // Stratégie 3 : Temps
        const rate = safeFloat(goal.projectedYield);
        const monthsNeeded = calculateCompoundMonthsNeeded(target - safeFloat(goal.currentSaved), currentCapacity, rate);
        if (monthsNeeded < 360) {
            const newDate = addMonths(new Date(), monthsNeeded);
            strategies.push({ 
                type: 'TIME', 
                title: 'Patienter', 
                message: `Avec votre capacité actuelle, vous pourriez atteindre l'objectif en ${newDate.toLocaleDateString('fr-FR', {month:'long', year:'numeric'})}.`, 
                value: newDate.toISOString() 
            });
        }
    }
    return { status, label, color, mainMessage, gap: Math.max(0, gap), strategies };
};

export const distributeGoals = (goals: Goal[], capacity: number) => {
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
  const totalAllocated = maxProjectBudget - available;
  return { allocations, totalAllocated }; 
};

// ============================================================================
// 3. ORCHESTRATEUR PRINCIPAL (Data aggregation)
// ============================================================================
export const computeFinancialPlan = (profile: Profile): SimulationResult => {
  const monthlyIncome = calculateListTotal(profile.incomes);
  const monthlyFixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
  const monthlySubs = calculateListTotal(profile.subscriptions);
  const monthlyCredits = calculateListTotal(profile.credits);
  const mandatoryExpenses = monthlyFixed + monthlySubs + monthlyCredits;
  const discretionaryExpenses = safeFloat(profile.variableCosts);
  const manualSavings = calculateListTotal(profile.savingsContributions);
  
  const capacityToSave = Math.max(0, monthlyIncome - mandatoryExpenses - discretionaryExpenses);

  const currentPersonaKey = (profile.persona || 'salaried').toUpperCase();
  const preset = PERSONA_PRESETS[currentPersonaKey] || PERSONA_PRESETS.SALARIED;
  const adults = Math.max(1, safeFloat(profile.household?.adults) || 1);
  const children = Math.max(0, safeFloat(profile.household?.children) || 0);
  const adjustedMinLiving = preset.rules.minLiving + ((adults - 1) * 150) + (children * 120);
  const rules = { ...preset.rules, minLiving: adjustedMinLiving };

  const { allocations, totalAllocated } = distributeGoals(profile.goals || [], capacityToSave);
  const realCashflow = Math.max(0, capacityToSave - totalAllocated);
  const securityBuffer = Math.round(capacityToSave * CONSTANTS.BUFFER_RATIO);
  const maxProjectBudget = Math.max(0, capacityToSave * (1 - CONSTANTS.BUFFER_RATIO));
  const availableForProjects = Math.max(0, maxProjectBudget - totalAllocated);

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
      income: monthlyIncome, fixed: mandatoryExpenses, capacity: capacityToSave, 
      remainingToLive: monthlyIncome - mandatoryExpenses - totalAllocated, 
      monthlyIncome, mandatoryExpenses, discretionaryExpenses, capacityToSave,
      profitableExpenses: manualSavings + totalAllocated, 
      totalGoalsEffort: totalAllocated, totalRecurring: mandatoryExpenses + manualSavings,
      realCashflow: realCashflow, matelas, investments, totalWealth,
      safetyMonths, engagementRate, rules, securityBuffer, availableForProjects
    },
    allocations, freeCashFlow: realCashflow
  };
};

export const simulateGoalScenario = (goalInput: Partial<Goal>, profile: Profile, financialContext: SimulationResult['budget']) => {
    const tempGoal: Goal = {
        id: 'temp', name: goalInput.name || '', category: goalInput.category || 'OTHER',
        targetAmount: parseFloat(goalInput.targetAmount as string) || 0,
        currentSaved: parseFloat(goalInput.currentSaved as string) || 0,
        deadline: goalInput.deadline || '', projectedYield: parseFloat(goalInput.projectedYield as string) || 0,
        isInvested: !!goalInput.isInvested
    };
    const monthlyEffort = calculateMonthlyEffort(tempGoal);
    const projectionData = simulateGoalProjection(tempGoal, monthlyEffort);
    if (projectionData.summary.finalAmount === 0 && monthlyEffort > 0) {
        const manualTotal = Math.round(monthlyEffort + (tempGoal.currentSaved || 0));
        projectionData.summary.finalAmount = manualTotal;
        projectionData.summary.totalPocket = manualTotal;
        if (projectionData.projection.length <= 1) {
            projectionData.projection.push({ month: 1, date: new Date(tempGoal.deadline), balance: manualTotal, contributed: manualTotal, interests: 0 });
        }
    }
    const estimatedDiscretionary = (financialContext.monthlyIncome - financialContext.fixed) * 0.3; 
    const diagnosis = analyzeGoalStrategies(tempGoal, monthlyEffort, financialContext.availableForProjects, estimatedDiscretionary, financialContext.monthlyIncome, financialContext.matelas);
    return { tempGoal, monthlyEffort, projectionData, diagnosis };
};

// ============================================================================
// 🔥 4. LE DOCTEUR FINANCIER "IA" (Logique Expert) 🔥
// ============================================================================
export const analyzeProfileHealth = (
  profile: Profile, 
  context: SimulationResult['budget']
): DeepAnalysis => {
  const opportunities: OptimizationOpportunity[] = [];
  const tags: string[] = [];
  
  const totalIncome = Math.max(1, context.monthlyIncome);
  const needsRatio = Math.round((context.fixed / totalIncome) * 100);
  const wantsRatio = Math.round((context.discretionaryExpenses / totalIncome) * 100);
  const savingsRatio = Math.round((context.capacityToSave / totalIncome) * 100);
  const debtRatio = context.engagementRate;
  
  const cash = safeFloat(profile.currentBalance);
  const savings = safeFloat(profile.savings);
  const invested = safeFloat(profile.investments);
  const totalWealth = context.totalWealth;

  // --- DÉTECTION DU PROFIL SOCIO-ÉCONOMIQUE ---
  const isModest = totalIncome < FINANCIAL_KNOWLEDGE.THRESHOLDS.POOR_INCOME;
  const isWealthy = totalIncome > FINANCIAL_KNOWLEDGE.THRESHOLDS.RICH_INCOME;
  const adults = Math.max(1, safeFloat(profile.household?.adults));
  const isCouple = adults > 1;

  // --- 1. ANALYSE DU "CASH DRAG" (L'argent qui dort) ---
  const idealCashMultiplier = isModest ? 1.0 : 1.5; 
  const idealCash = context.fixed * idealCashMultiplier;
  const sleepingCash = Math.max(0, cash - idealCash);
  const cashThreshold = isWealthy ? 3000 : 800; 

  if (sleepingCash > cashThreshold) {
    const potentialYield = Math.round(sleepingCash * (isModest ? FINANCIAL_KNOWLEDGE.RATES.LEP : FINANCIAL_KNOWLEDGE.RATES.LIVRET_A)); 
    const investmentName = isModest ? "LEP (5%)" : "Livret A / Placements";
    
    opportunities.push({
      id: 'cash_drag', type: 'INVESTMENT', level: 'INFO',
      title: 'Argent dormant détecté',
      message: isModest 
        ? `Vous avez ${Math.round(sleepingCash)}€ sur le compte courant. Sur un ${investmentName}, cela vous rapporterait ~${potentialYield}€/an.`
        : `Optimisation requise : ${Math.round(sleepingCash)}€ dorment. Pensez à l'assurance vie ou au PEA pour ne pas perdre face à l'inflation.`,
      actionLabel: 'Optimiser ma trésorerie',
      potentialGain: potentialYield
    });
  }

  // --- 2. SÉCURITÉ & MATELAS ---
  // Règle experte : Un freelance a besoin de plus de sécurité qu'un fonctionnaire
  const personaMultiplier = profile.persona === 'freelance' ? 1.5 : (profile.persona === 'salaried' ? 0.8 : 1);
  const idealSafety = context.fixed * context.rules.safetyMonths * personaMultiplier;
  
  if (savings < idealSafety) {
    const missing = idealSafety - savings;
    opportunities.push({
      id: 'safety_first', type: 'SAVINGS',
      level: isModest ? 'WARNING' : 'CRITICAL',
      title: 'Sécurité en cours',
      message: isModest
        ? `C'est dur d'épargner, mais essayez de mettre même 20€/mois de côté pour les coups durs.`
        : `Alerte : Votre train de vie exige un matelas de ${formatCurrency(idealSafety)}. C'est la priorité n°1 avant tout investissement.`,
      actionLabel: isModest ? 'Mettre 20€ de côté' : 'Sécuriser maintenant'
    });
  } else if (savings > idealSafety * (isWealthy ? 1.2 : 1.5)) {
    // Si Livret A plein (> 22950), on propose mieux
    const excess = savings - idealSafety;
    const targetInvestment = savings > FINANCIAL_KNOWLEDGE.CEILINGS.LIVRET_A ? "l'Assurance Vie ou le PEA" : "des livrets boostés";
    opportunities.push({
      id: 'safety_excess', type: 'INVESTMENT', level: 'SUCCESS',
      title: 'Excès de prudence',
      message: `Votre sécurité est assurée. Vous perdez de l'argent en laissant ${formatCurrency(excess)} dormir. Regardez vers ${targetInvestment}.`,
      potentialGain: Math.round(excess * (FINANCIAL_KNOWLEDGE.RATES.MARKET_AVG - FINANCIAL_KNOWLEDGE.RATES.LIVRET_A)) 
    });
    tags.push("Écureuil");
  }

  // --- 3. ANALYSE ENDETTEMENT (Règle HCSF) ---
  const borrowingCapacity = Math.max(0, (totalIncome * 0.35) - context.mandatoryExpenses);
  const badDebts = profile.credits.filter(c => safeFloat(c.amount) < 300 && !c.name.toLowerCase().includes('immo'));
  
  if (debtRatio > FINANCIAL_KNOWLEDGE.THRESHOLDS.HCSF_DEBT_RATIO) {
      opportunities.push({
          id: 'debt_alert', type: 'DEBT', level: 'CRITICAL',
          title: 'Endettement élevé',
          message: `Vous dépassez les 35% d'endettement (${debtRatio.toFixed(0)}%). Cela bloquera tout projet immobilier futur.`,
          actionLabel: 'Voir les dettes'
      });
  } else if (isWealthy && borrowingCapacity > 1000) {
      // Conseil de riche : Utiliser le levier bancaire
      opportunities.push({
          id: 'leverage_opportunity', type: 'BUDGET', level: 'INFO',
          title: 'Capacité d\'emprunt disponible',
          message: `Vous avez une capacité d'emprunt d'environ ${formatCurrency(borrowingCapacity)}/mois non utilisée. L'immobilier locatif pourrait être un levier.`,
      });
  }

  if (badDebts.length > 0) {
    const totalBadMonthly = calculateListTotal(badDebts);
    const debtImpact = (totalBadMonthly / totalIncome) * 100;
    opportunities.push({
      id: 'toxic_debt', type: 'DEBT',
      level: debtImpact > 5 ? 'CRITICAL' : 'WARNING',
      title: 'Dette "Toxique"',
      message: `Ces petits crédits grignotent ${debtImpact.toFixed(1)}% de vos revenus. ${savings > 1000 ? "Utilisez votre épargne pour les solder immédiatement." : "Remboursez-les en priorité."}`,
      actionLabel: 'Simuler le remboursement',
      potentialGain: totalBadMonthly * 12
    });
  }

  // --- 4. OPTIMISATION FISCALE (LEP / PEA) ---
  // Si éligible LEP (Approximation RFR)
  if ((!isCouple && totalIncome < (FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_SINGLE / 12)) || (isCouple && totalIncome < (FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_COUPLE / 12))) {
      // On vérifie s'il n'y a pas déjà un LEP dans les comptes
      const hasLEP = profile.savingsContributions.some(s => s.name.toUpperCase().includes('LEP'));
      if (!hasLEP && savings > 500) {
          opportunities.push({
              id: 'lep_missing', type: 'INVESTMENT', level: 'SUCCESS',
              title: 'Droit au LEP (5%)',
              message: `Vu vos revenus, vous êtes probablement éligible au LEP. Il rapporte 2x plus que le Livret A, sans risque.`,
              actionLabel: 'Vérifier éligibilité',
              potentialGain: Math.round(Math.min(savings, FINANCIAL_KNOWLEDGE.CEILINGS.LEP) * (FINANCIAL_KNOWLEDGE.RATES.LEP - FINANCIAL_KNOWLEDGE.RATES.LIVRET_A))
          });
      }
  }

  // --- 5. VISION PATRIMOINE (FIRE / Retraite) ---
  const annualNeeds = (context.fixed + context.discretionaryExpenses) * 12;
  const fireNumber = annualNeeds * 25; // Règle des 4%
  const wealthRatio = (totalWealth / fireNumber) * 100;
  
  if (isWealthy && wealthRatio > 10) {
      opportunities.push({
          id: 'fire_track', type: 'INVESTMENT', level: 'INFO',
          title: 'Indépendance Financière',
          message: `Vous avez atteint ${wealthRatio.toFixed(1)}% de votre liberté financière totale. Continuez d'investir !`,
      });
      tags.push("FIRE");
  }

  // Tags automatiques
  if (isWealthy) tags.push("Aisé");
  if (savingsRatio > 30) tags.push("Investisseur");
  if (wantsRatio > (isWealthy ? 40 : 25)) tags.push("Bon vivant");
  if (isModest && savingsRatio > 5) tags.push("Guerrier");

  // Calcul du Score Global (Pondéré)
  let score = 100;
  if (context.safetyMonths < 1) score -= 40;
  else if (context.safetyMonths < context.rules.safetyMonths) score -= 15;
  if (needsRatio > (isModest ? 70 : 55)) score -= (isWealthy ? 20 : 10);
  if (savingsRatio < 5) score -= 15;
  if (opportunities.some(o => o.level === 'CRITICAL')) score -= 10;

  return {
    globalScore: Math.max(0, score),
    tags: tags.length ? tags : ["En construction"],
    ratios: { needs: needsRatio, wants: wantsRatio, savings: savingsRatio },
    opportunities: opportunities.sort((a, b) => (a.level === 'CRITICAL' ? -1 : 1))
  };
};
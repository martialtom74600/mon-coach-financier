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
    INFLATION: 0.025,    // 2.5% - L'ennemi invisible
    LIVRET_A: 0.03,      // 3.0% - Le classique
    LEP: 0.05,           // 5.0% - Le roi pour revenus modestes
    MARKET_AVG: 0.07,    // 7.0% - Bourse monde lissée
    SAFE_WITHDRAWAL: 0.04 // 4.0% - Règle FIRE
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
    RICH_INCOME: 4500,        // Seuil confort/aisance (Net avant impôt)
    POOR_INCOME: 1600,        // Seuil vigilance
    SURVIVAL_BUFFER: 1,       // Mois minium vital
    COMFORT_BUFFER: 6         // Mois max utile
  },
  // Tranches Marginales d'Imposition (Approx 2024 pour 1 part)
  TAX_BRACKETS: [
    { threshold: 11294, rate: 0.11 },
    { threshold: 28797, rate: 0.30 },
    { threshold: 82341, rate: 0.41 },
    { threshold: 177106, rate: 0.45 }
  ]
};

// ============================================================================
// 2. SOUS-MOTEURS (Calculs)
// ============================================================================

// Estime le Taux Marginal d'Imposition (TMI) pour savoir si la défiscalisation est utile
const estimateTMI = (netTaxableIncome: number, parts: number = 1) => {
    // On approxime le net imposable à 0.9 * net perçu (abattement 10%)
    const quotient = (netTaxableIncome * 12 * 0.9) / parts; 
    for (let i = FINANCIAL_KNOWLEDGE.TAX_BRACKETS.length - 1; i >= 0; i--) {
        if (quotient > FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].threshold) {
            return FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].rate;
        }
    }
    return 0; // Non imposable
};

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
    const rate = safeFloat(goal.projectedYield) || (FINANCIAL_KNOWLEDGE.RATES.MARKET_AVG * 100);
    const r = (rate / 100) / 12;
    // Formule valeur future avec versements mensuels
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
    
    if (isInflationSignificant) {
        strategies.push({ type: 'INCOME', title: 'Inflation', message: `Dans ${(differenceInMonths(new Date(goal.deadline), new Date())/12).toFixed(1)} ans, ce projet coûtera sûrement ${Math.round(inflationTarget)}€.`, disabled: true });
    }

    if (status === 'HARD') {
        const maxDeposit = Math.min(availableGlobalSavings, target * 0.3);
        if (availableGlobalSavings > 1000) {
            const tempGoal = { ...goal, currentSaved: safeFloat(goal.currentSaved) + maxDeposit };
            if (calculateMonthlyEffort(tempGoal) <= currentCapacity) {
                strategies.push({ type: 'BUDGET', title: "Boost Épargne", message: `Injecter ${Math.round(maxDeposit)}€ de votre épargne réduit la mensualité.`, value: maxDeposit, actionLabel: "Simuler virement" });
            }
        }
        
        if (!goal.isInvested && differenceInMonths(new Date(goal.deadline), new Date()) > 24) {
             strategies.push({ type: 'HYBRID', title: 'Placer cet argent', message: `Sur > 2 ans, ne laissez pas l'argent dormir. Placez-le pour réduire l'effort.`, actionLabel: "Activer les intérêts" });
        }

        const rate = safeFloat(goal.projectedYield);
        const monthsNeeded = calculateCompoundMonthsNeeded(target - safeFloat(goal.currentSaved), currentCapacity, rate);
        if (monthsNeeded < 360) {
            const newDate = addMonths(new Date(), monthsNeeded);
            strategies.push({ type: 'TIME', title: 'Patienter', message: `Atteignable en ${newDate.toLocaleDateString('fr-FR', {month:'long', year:'numeric'})} avec l'effort actuel.`, value: newDate.toISOString() });
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
  const essentialMonthlyNeeds = mandatoryExpenses + (discretionaryExpenses * 0.5); // On considère que 50% du variable est incompressible
  
  let safetyMonths = 0;
  if (essentialMonthlyNeeds > 0) safetyMonths = matelas / essentialMonthlyNeeds;
  else if (matelas > 0) safetyMonths = 99;

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
  
  // ✅ CORRECTION : On récupère safetyMonths du contexte ici
  const { safetyMonths } = context;

  const totalIncome = Math.max(1, context.monthlyIncome);
  const needsRatio = Math.round((context.fixed / totalIncome) * 100);
  const wantsRatio = Math.round((context.discretionaryExpenses / totalIncome) * 100);
  const savingsRatio = Math.round((context.capacityToSave / totalIncome) * 100);
  const debtRatio = context.engagementRate;
  
  const cash = safeFloat(profile.currentBalance);
  const savings = safeFloat(profile.savings);
  const invested = safeFloat(profile.investments);
  const totalWealth = context.totalWealth;

  // --- PARAMÈTRES SOCIAUX ---
  const adults = Math.max(1, safeFloat(profile.household?.adults));
  const children = Math.max(0, safeFloat(profile.household?.children));
  const parts = adults + (children * 0.5) + (children >= 3 ? 0.5 : 0); // Parts fiscales approx
  
  const isModest = totalIncome < FINANCIAL_KNOWLEDGE.THRESHOLDS.POOR_INCOME;
  const isWealthy = totalIncome > (FINANCIAL_KNOWLEDGE.THRESHOLDS.RICH_INCOME + (children * 400));
  const tmi = estimateTMI(totalIncome, parts);

  // --- 1. SÉCURITÉ & MATELAS ---
  // Un indépendant a besoin de plus de sécurité qu'un fonctionnaire
  const personaMultiplier = profile.persona === 'freelance' ? 1.5 : (profile.persona === 'salaried' ? 0.8 : 1);
  const monthlyBurnRate = context.fixed + Math.min(context.discretionaryExpenses, 800); // On compte le vital + un peu de vie
  const idealSafety = monthlyBurnRate * context.rules.safetyMonths * personaMultiplier;
  
  if (savings < monthlyBurnRate) {
    opportunities.push({
      id: 'safety_danger', type: 'SAVINGS', level: 'CRITICAL',
      title: 'Zone de danger',
      message: `Vous avez moins d'un mois de survie (${(savings/monthlyBurnRate).toFixed(1)} mois). Le moindre pépin vous mettra en défaut de paiement.`,
      actionLabel: 'Sécuriser 1000€ d\'urgence'
    });
  } else if (savings < idealSafety) {
    opportunities.push({
      id: 'safety_build', type: 'SAVINGS', level: isModest ? 'INFO' : 'WARNING',
      title: 'Sécurité en construction',
      message: `Objectif : Atteindre ${formatCurrency(idealSafety)} (${context.rules.safetyMonths} mois de charges). Vous y êtes presque.`,
      actionLabel: 'Compléter le matelas'
    });
  }

  // --- 2. GESTION DES DETTES (Bonne vs Mauvaise) ---
  // On isole les dettes qui ne sont PAS de l'immobilier
  const badDebts = profile.credits.filter(c => safeFloat(c.amount) > 0 && !c.name.toLowerCase().match(/(immo|maison|appart|locatif|scpi)/i));
  const totalBadDebt = calculateListTotal(badDebts);
  
  if (totalBadDebt > 0) {
      const isCritical = totalBadDebt > (context.capacityToSave + 100) || debtRatio > 45;
      opportunities.push({
          id: 'toxic_debt', type: 'DEBT', level: isCritical ? 'CRITICAL' : 'WARNING',
          title: isCritical ? 'Dette Toxique Critique' : 'Dette à éliminer',
          message: isCritical 
            ? `Vos crédits conso (${formatCurrency(totalBadDebt)}/mois) vous étouffent. C'est la priorité absolue avant tout investissement.`
            : `Vous payez ${formatCurrency(totalBadDebt)}/mois de "mauvaise dette". Utilisez votre épargne excédentaire pour solder ça.`,
          actionLabel: 'Plan de remboursement',
          potentialGain: totalBadDebt * 12
      });
  } else if (debtRatio > FINANCIAL_KNOWLEDGE.THRESHOLDS.HCSF_DEBT_RATIO) {
      opportunities.push({ id: 'high_debt', type: 'DEBT', level: 'WARNING', title: 'Endettement élevé', message: `Attention, vous dépassez les 35% d'endettement. Cela bloquera vos futurs projets.` });
  }

  // --- 3. OPTIMISATION CASH & PLACEMENTS ---
  // A. Pour les PROFIL MODESTES
  if (isModest || totalIncome < 30000/12) {
      // Détection LEP
      const isEligibleLEP = (totalIncome * 12) < (FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_SINGLE * (parts > 1.5 ? 1.7 : 1));
      const hasLEP = profile.savingsContributions.some(s => s.name.match(/LEP|Populaire/i));
      if (isEligibleLEP && !hasLEP && savings > 500) {
          opportunities.push({
              id: 'lep_missing', type: 'INVESTMENT', level: 'SUCCESS',
              title: 'Boost sans risque (LEP)',
              message: `Vous êtes probablement éligible au LEP (5% net). C'est le meilleur placement garanti du marché.`,
              actionLabel: 'Vérifier éligibilité',
              potentialGain: Math.min(savings, 10000) * (FINANCIAL_KNOWLEDGE.RATES.LEP - FINANCIAL_KNOWLEDGE.RATES.LIVRET_A)
          });
      }
  }

  // B. Pour les PROFIL AISÉS
  if (isWealthy || savings > 20000) {
      // Cash Drag (Trop d'argent sur compte courant)
      const maxCash = monthlyBurnRate * 1.5;
      const sleepingCash = Math.max(0, cash - maxCash);
      if (sleepingCash > 1000) {
          opportunities.push({
              id: 'cash_drag_rich', type: 'INVESTMENT', level: 'INFO',
              title: 'Argent dormant',
              message: `Vous laissez ${formatCurrency(sleepingCash)} sur le compte courant. Placez-les au moins sur un livret pour contrer l'inflation.`,
              potentialGain: sleepingCash * FINANCIAL_KNOWLEDGE.RATES.LIVRET_A
          });
      }

      // Excès de précaution -> Investissement
      const excessSavings = Math.max(0, savings - (idealSafety * 1.2)); // Marge de 20%
      if (excessSavings > 5000) {
          const strat = tmi >= 0.30 ? "PER (Défiscalisation)" : "PEA/AV (Bourse)";
          opportunities.push({
              id: 'invest_excess', type: 'INVESTMENT', level: 'SUCCESS',
              title: 'Optimisation Patrimoine',
              message: `Vous avez ${formatCurrency(excessSavings)} de "trop" en sécurité qui perdent de la valeur. Stratégie suggérée : ${strat}.`,
              potentialGain: excessSavings * (FINANCIAL_KNOWLEDGE.RATES.MARKET_AVG - FINANCIAL_KNOWLEDGE.RATES.INFLATION),
              actionLabel: 'Voir stratégies'
          });
          tags.push("Potentiel Investisseur");
      }

      // Levier Bancaire
      const borrowingCap = (totalIncome * 0.35) - context.mandatoryExpenses;
      if (borrowingCap > 800 && debtRatio < 25 && savings > 10000) {
           opportunities.push({
              id: 'leverage_immo', type: 'BUDGET', level: 'INFO',
              title: 'Levier Bancaire',
              message: `Vous avez une capacité d'emprunt vierge (~${formatCurrency(borrowingCap)}/mois). C'est le moment de regarder l'immobilier locatif.`,
          });
      }
  }

  // --- 4. LIFESTYLE CREEP (Piège dorée) ---
  if (wantsRatio > 40 && totalIncome > 2500) {
      opportunities.push({
          id: 'lifestyle_creep', type: 'BUDGET', level: 'WARNING',
          title: 'Train de vie élevé',
          message: `Vos dépenses plaisir prennent ${wantsRatio}% de vos revenus. C'est le frein principal à votre enrichissement futur.`,
          actionLabel: 'Auditer dépenses'
      });
      tags.push("Bon Vivant");
  }

  // --- SCORING GLOBAL ---
  let score = 100;
  // Correction de la référence à safetyMonths ici aussi (même si maintenant la variable est définie)
  if (safetyMonths < 1) score -= 40;
  else if (safetyMonths < context.rules.safetyMonths) score -= 15;
  if (totalBadDebt > 0) score -= 15;
  if (debtRatio > 35) score -= 10;
  if (context.capacityToSave < 0) score -= 30; // Budget dans le rouge
  else if (savingsRatio < 5) score -= 10; // Epargne faible
  if (invested > totalIncome) score += 10; // Bonus investisseur

  // Tags finaux
  if (isSurvivalMode(totalIncome, context.fixed)) tags.push("Mode Survie");
  if (isWealthy) tags.push("Aisé");
  if (tmi >= 0.30) tags.push("Forte Fiscalité");

  return {
    globalScore: Math.min(100, Math.max(0, score)),
    tags: [...new Set(tags)], // Dédoublonnage
    ratios: { needs: needsRatio, wants: wantsRatio, savings: savingsRatio },
    opportunities: opportunities.sort((a, b) => {
        const levels = { 'CRITICAL': 0, 'WARNING': 1, 'SUCCESS': 2, 'INFO': 3 };
        return levels[a.level] - levels[b.level];
    })
  };
};

// Helper local pour la survie
const isSurvivalMode = (income: number, fixed: number) => income < fixed + 200;
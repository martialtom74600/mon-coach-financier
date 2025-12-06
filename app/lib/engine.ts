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
    LEP: 0.05,           // 5.0% (Le roi pour revenus modestes)
    MARKET_AVG: 0.07,    // 7.0% (Bourse monde lissée)
    SAFE_WITHDRAWAL: 0.04 // 4.0% (Règle FIRE)
  },
  THRESHOLDS: {
    LEP_INCOME_SINGLE: 22000,
    LEP_INCOME_COUPLE: 34000,
    HCSF_DEBT_RATIO: 35,      // Max endettement légal
    RICH_INCOME: 4000,        // Net avant impôt (Seuil psychologique "Aisé")
    POOR_INCOME: 1600,        // Seuil vigilance
    SURVIVAL_BUFFER: 1,       // Mois minium vital
    COMFORT_BUFFER: 6         // Mois max utile
  },
  // Tranches Marginales d'Imposition (Approx 2024 pour 1 part)
  TAX_BRACKETS: [
    { threshold: 11294, rate: 0.11 },
    { threshold: 28797, rate: 0.30 }, // Seuil critique pour la défiscalisation
    { threshold: 82341, rate: 0.41 },
    { threshold: 177106, rate: 0.45 }
  ]
};

// ============================================================================
// 2. SOUS-MOTEURS (Calculs Utilitaires)
// ============================================================================

// Estime le Taux Marginal d'Imposition (TMI)
const estimateTMI = (netTaxableIncome: number, parts: number = 1) => {
    // On approxime le net imposable à 0.9 * net perçu (abattement 10% frais pro)
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

// --- SIMULATION D'OBJECTIFS ---
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

    if (monthlyEffortNeeded <= 0) return { status: 'DONE', label: 'Financé', color: 'green', mainMessage: "Objectif couvert.", strategies: [] };
    if (monthlyEffortNeeded > totalIncome) return { status: 'IMPOSSIBLE', label: 'Irréaliste', color: 'black', mainMessage: "Dépasse vos revenus.", strategies: [] };

    if (gap > 0) {
        status = 'HARD'; label = 'Difficile'; color = 'red';
        mainMessage = `Manque ${Math.round(gap)}€/mois.`;
    }

    const strategies: GoalStrategy[] = [];
    if (inflationGap > (target * 0.05)) {
        strategies.push({ type: 'INCOME', title: 'Inflation', message: `Attention, ce projet coûtera sûrement ${Math.round(inflationTarget)}€ à terme.`, disabled: true });
    }

    if (status === 'HARD') {
        // Stratégie Apport
        const maxDeposit = Math.min(availableGlobalSavings, target * 0.3);
        if (availableGlobalSavings > 1000) {
             const tempGoal = { ...goal, currentSaved: safeFloat(goal.currentSaved) + maxDeposit };
             if (calculateMonthlyEffort(tempGoal) <= currentCapacity) {
                strategies.push({ type: 'BUDGET', title: "Boost Épargne", message: `Injecter ${Math.round(maxDeposit)}€ réduit la mensualité.`, value: maxDeposit, actionLabel: "Simuler" });
             }
        }
        // Stratégie Placements
        if (!goal.isInvested && differenceInMonths(new Date(goal.deadline), new Date()) > 24) {
             strategies.push({ type: 'HYBRID', title: 'Placer cet argent', message: `Sur > 2 ans, placez cet argent à 4% pour réduire l'effort.`, actionLabel: "Activer intérêts" });
        }
        // Stratégie Temps
        const rate = safeFloat(goal.projectedYield);
        const monthsNeeded = calculateCompoundMonthsNeeded(target - safeFloat(goal.currentSaved), currentCapacity, rate);
        if (monthsNeeded < 360) {
            const newDate = addMonths(new Date(), monthsNeeded);
            strategies.push({ type: 'TIME', title: 'Patienter', message: `Possible en ${newDate.toLocaleDateString('fr-FR', {month:'short', year:'2-digit'})} avec l'effort actuel.`, value: newDate.toISOString() });
        }
    }
    return { status, label, color, mainMessage, gap: Math.max(0, gap), strategies };
};

// Répartition automatique du budget sur les objectifs
export const distributeGoals = (goals: Goal[], capacity: number) => {
  const maxProjectBudget = Math.max(0, capacity * (1 - CONSTANTS.BUFFER_RATIO));
  let available = maxProjectBudget;
  const allocations = [];

  const sorted = [...goals].sort((a, b) => {
    const pA = GOAL_CATEGORIES[a.category]?.priority || 3;
    const pB = GOAL_CATEGORIES[b.category]?.priority || 3;
    return (pA - pB) || (new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  });

  for (const goal of sorted) {
    const required = calculateMonthlyEffort(goal);
    let allocated = 0;
    if (available >= required) allocated = required;
    else if (available > 0) allocated = available;
    available -= allocated;
    
    allocations.push({
      id: goal.id, name: goal.name, tier: 'GROWTH',
      requestedEffort: required, allocatedEffort: allocated,
      status: allocated >= required ? 'FULL' : (allocated > 0 ? 'PARTIAL' : 'STARVED'),
      fillRate: required > 0 ? Math.round((allocated / required) * 100) : 100,
      message: allocated >= required ? 'Financé' : 'Budget restreint'
    });
  }
  return { allocations, totalAllocated: maxProjectBudget - available }; 
};

// ============================================================================
// 3. ORCHESTRATEUR PRINCIPAL (Engine)
// ============================================================================
export const computeFinancialPlan = (profile: Profile): SimulationResult => {
  const monthlyIncome = calculateListTotal(profile.incomes);
  const monthlyFixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
  const monthlySubs = calculateListTotal(profile.subscriptions);
  const monthlyCredits = calculateListTotal(profile.credits);
  const mandatoryExpenses = monthlyFixed + monthlySubs + monthlyCredits;
  const discretionaryExpenses = safeFloat(profile.variableCosts);
  const manualSavings = calculateListTotal(profile.savingsContributions);
  
  // Capacité théorique (avant projets)
  const capacityToSave = Math.max(0, monthlyIncome - mandatoryExpenses - discretionaryExpenses);

  const currentPersonaKey = (profile.persona || 'salaried').toUpperCase();
  const preset = PERSONA_PRESETS[currentPersonaKey] || PERSONA_PRESETS.SALARIED;
  const rules = { ...preset.rules };

  const { allocations, totalAllocated } = distributeGoals(profile.goals || [], capacityToSave);
  const realCashflow = Math.max(0, capacityToSave - totalAllocated);
  const securityBuffer = Math.round(capacityToSave * CONSTANTS.BUFFER_RATIO);
  
  const matelas = safeFloat(profile.savings);
  // On considère que 50% du variable est incompressible pour le calcul de survie
  const essentialMonthlyNeeds = mandatoryExpenses + (discretionaryExpenses * 0.5); 
  
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
      safetyMonths, engagementRate, rules, securityBuffer, availableForProjects: Math.max(0, (capacityToSave * 0.9) - totalAllocated)
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
// 🔥 4. LE DOCTEUR FINANCIER "IA" V8 (ULTIMATE) 🔥
// ============================================================================
export const analyzeProfileHealth = (
  profile: Profile, 
  context: SimulationResult['budget']
): DeepAnalysis => {
  const opportunities: OptimizationOpportunity[] = [];
  const tags: string[] = [];
  const { safetyMonths } = context;

  const totalIncome = Math.max(1, context.monthlyIncome);
  // Ratios 50/30/20
  const needsRatio = Math.round((context.fixed / totalIncome) * 100);
  const wantsRatio = Math.round((context.discretionaryExpenses / totalIncome) * 100);
  const savingsRatio = Math.round((context.capacityToSave / totalIncome) * 100);
  const debtRatio = context.engagementRate;
  
  const cash = safeFloat(profile.currentBalance);
  const savings = safeFloat(profile.savings);
  const invested = safeFloat(profile.investments);
  const totalWealth = context.totalWealth;

  // Contexte Familial & Fiscal
  const adults = Math.max(1, safeFloat(profile.household?.adults));
  const children = Math.max(0, safeFloat(profile.household?.children));
  const parts = adults + (children * 0.5) + (children >= 3 ? 0.5 : 0);
  const tmi = estimateTMI(totalIncome, parts);
  
  const isModest = totalIncome < FINANCIAL_KNOWLEDGE.THRESHOLDS.POOR_INCOME;
  const isWealthy = totalIncome > (FINANCIAL_KNOWLEDGE.THRESHOLDS.RICH_INCOME + (children * 500));
  
  const monthlyBurnRate = context.fixed + Math.min(context.discretionaryExpenses, 800);
  const totalOut = context.fixed + context.discretionaryExpenses + context.profitableExpenses;
  const cashflow = totalIncome - totalOut;
  const isDeficit = cashflow < -50; 

  // ----------------------------------------------------------------------
  // A. LES COUPE-CIRCUITS (Problèmes Vitaux)
  // ----------------------------------------------------------------------

  if (isDeficit) {
      opportunities.push({
          id: 'deficit_alert', type: 'BUDGET', level: 'CRITICAL',
          title: 'Hémorragie Financière',
          message: `STOP ! Vous dépensez ${formatCurrency(Math.abs(cashflow))} de plus que vous ne gagnez. Vous brûlez votre épargne. Réduisez vos dépenses variables immédiatement.`,
          actionLabel: 'Couper les dépenses'
      });
      tags.push("DANGER");
  }

  if (needsRatio > 70) {
      opportunities.push({
          id: 'needs_critical', type: 'BUDGET', level: 'CRITICAL',
          title: 'Charges Fixes Étouffantes',
          message: `Vos charges fixes (loyer, crédits) mangent ${needsRatio}% de vos revenus (Max recommandé: 50%). C'est insoutenable. Vous devez déménager ou augmenter vos revenus.`,
      });
  }

  // ----------------------------------------------------------------------
  // B. ANALYSE SÉCURITÉ (Survie vs Confort)
  // ----------------------------------------------------------------------
  const personaMultiplier = profile.persona === 'freelance' ? 1.5 : 0.8;
  const idealSafety = monthlyBurnRate * context.rules.safetyMonths * personaMultiplier;
  
  if (savings < monthlyBurnRate) {
    opportunities.push({
      id: 'safety_danger', type: 'SAVINGS', level: 'CRITICAL',
      title: 'Zone Rouge : Survie',
      message: `Vous avez moins d'un mois d'avance (${(savings/monthlyBurnRate).toFixed(1)} mois). Le moindre imprévu vous met en défaut. Arrêtez tout projet et créez un fond de 1000€.`,
      actionLabel: 'Sécuriser 1000€'
    });
  } else if (savings < idealSafety && !isDeficit) {
    opportunities.push({
      id: 'safety_build', type: 'SAVINGS', level: 'INFO',
      title: 'Matelas en construction',
      message: `Vous avez ${(savings/monthlyBurnRate).toFixed(1)} mois d'avance. C'est bien, mais pour votre profil, l'idéal est ${formatCurrency(idealSafety)} (3-6 mois).`,
      actionLabel: 'Verser 50€/mois'
    });
  } else if (savings > idealSafety * 1.5) {
     // Excès de sécurité = Perte d'argent
     const excess = savings - idealSafety;
     const loss = Math.round(excess * FINANCIAL_KNOWLEDGE.RATES.INFLATION);
     opportunities.push({
      id: 'safety_excess', type: 'INVESTMENT', level: 'WARNING',
      title: 'Votre argent dort trop',
      message: `Vous avez ${formatCurrency(excess)} de "trop" en sécurité qui se font manger par l'inflation (-${loss}€/an). Cet excédent doit être investi (PEA/AV).`,
      actionLabel: 'Placer l\'excédent'
    });
  }

  // ----------------------------------------------------------------------
  // C. DETTES (La chasse aux toxiques)
  // ----------------------------------------------------------------------
  const badDebts = profile.credits.filter(c => safeFloat(c.amount) > 0 && !c.name.toLowerCase().match(/(immo|maison|appart|scpi|locatif)/i));
  const totalBad = calculateListTotal(badDebts);

  if (totalBad > 0) {
      const debtImpact = (totalBad / totalIncome) * 100;
      const severity = debtImpact > 10 ? 'CRITICAL' : 'WARNING';
      opportunities.push({
          id: 'toxic_debt', type: 'DEBT', level: severity,
          title: 'Dette Toxique Détectée',
          message: `Vous avez ${badDebts.length} crédits conso/auto (${formatCurrency(totalBad)}/mois). C'est une dette qui vous appauvrit. Utilisez votre épargne pour les solder et retrouver du cashflow.`,
          actionLabel: 'Rembourser par anticipation',
          potentialGain: totalBad * 12
      });
  }

  // Levier Bancaire (Seulement pour les profils solides)
  if (debtRatio < 20 && savingsRatio > 15 && totalIncome > 2500 && isWealthy) {
      opportunities.push({
        id: 'leverage_opportunity', type: 'BUDGET', level: 'INFO',
        title: 'Levier Bancaire',
        message: `Vous n'utilisez pas votre capacité d'emprunt. C'est le seul moyen de s'enrichir avec l'argent de la banque (Immobilier locatif).`,
        actionLabel: 'Simuler un projet'
      });
  }

  // ----------------------------------------------------------------------
  // D. OPTIMISATION FLUX & BUDGET (Cash Drag & Automatisation)
  // ----------------------------------------------------------------------
  
  // Cash Drag : Argent qui traine sur le compte courant
  // Règle : Pas plus d'un mois de charges + 20% de marge sur le compte chèque
  const maxCash = context.fixed * 1.2;
  if (cash > maxCash && !isDeficit) {
       const overflow = cash - maxCash;
       const potential = Math.round(overflow * (isModest ? FINANCIAL_KNOWLEDGE.RATES.LEP : FINANCIAL_KNOWLEDGE.RATES.LIVRET_A));
       opportunities.push({
          id: 'cash_drag', type: 'BUDGET', level: 'INFO',
          title: 'Argent non productif',
          message: `Il y a ${formatCurrency(overflow)} qui "trainent" sur le compte courant. Même sur un livret, cela rapporterait ${potential}€/an sans effort.`,
          potentialGain: potential,
          actionLabel: 'Faire un virement'
       });
  }

  // Automatisation (Le secret des riches)
  const autoSavings = calculateListTotal(profile.savingsContributions);
  if (autoSavings === 0 && context.capacityToSave > 100) {
       opportunities.push({
          id: 'automate_savings', type: 'SAVINGS', level: 'WARNING',
          title: 'Aucune épargne auto',
          message: `Vous épargnez "ce qu'il reste". C'est une erreur. Programmez un virement de ${formatCurrency(Math.round(context.capacityToSave * 0.7))} en début de mois ("Pay yourself first").`,
          actionLabel: 'Programmer'
       });
  }

  // Lifestyle Creep (Augmentation du niveau de vie)
  if (wantsRatio > 40 && totalIncome > 2000) {
       opportunities.push({
          id: 'lifestyle_creep', type: 'BUDGET', level: 'WARNING',
          title: 'Train de vie élevé',
          message: `Vos dépenses plaisir prennent ${wantsRatio}% de vos revenus (Cible: 30%). Vous dépensez vos augmentations au lieu de les investir.`,
       });
  }

  // ----------------------------------------------------------------------
  // E. NIVEAUX AVANCÉS (Investissement & Fiscalité)
  // ----------------------------------------------------------------------
  
  // 1. LEP (Le cadeau fiscal pour les modestes)
  const isEligibleLEP = (totalIncome * 12) < (FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_SINGLE * (parts > 1.5 ? 1.7 : 1));
  const hasLEP = profile.savingsContributions.some(s => s.name.match(/LEP|Populaire/i));
  
  if (isEligibleLEP && !hasLEP && savings > 500) {
      opportunities.push({
          id: 'lep_missing', type: 'INVESTMENT', level: 'SUCCESS',
          title: 'Droit au LEP (5% Net)',
          message: `Vous semblez éligible au Livret d'Épargne Populaire. Il rapporte 2x plus que le Livret A, sans risque. Ouvrez-en un d'urgence.`,
          potentialGain: Math.min(savings, 10000) * (FINANCIAL_KNOWLEDGE.RATES.LEP - FINANCIAL_KNOWLEDGE.RATES.LIVRET_A),
          actionLabel: 'Vérifier éligibilité'
      });
  }

  // 2. PEA / AV (Pour ceux qui ont rempli le matelas)
  if (savings > idealSafety && invested === 0 && !isModest) {
      opportunities.push({
          id: 'first_invest', type: 'INVESTMENT', level: 'INFO',
          title: 'L\'inflation vous mange',
          message: `Votre sécurité est pleine. Pour ne pas vous appauvrir sur le long terme, vous devez investir l'excédent en Bourse (PEA/ETF) ou Assurance Vie.`,
          actionLabel: 'Pourquoi investir ?'
      });
  }

  // 3. Défiscalisation (Pour les gros salaires TMI 30%+)
  if (tmi >= 0.30 && context.capacityToSave > 500 && savings > idealSafety) {
      const taxSave = Math.round(1000 * tmi);
      opportunities.push({
          id: 'tax_optim', type: 'INVESTMENT', level: 'SUCCESS',
          title: `Réduisez vos impôts (TMI ${Math.round(tmi*100)}%)`,
          message: `L'État est votre 1er poste de dépense. Avec le PER, si vous placez 1000€, vous réduisez vos impôts de ${taxSave}€. C'est un rendement immédiat.`,
          potentialGain: taxSave * 3 // Sur une base de 3000€ placés
      });
  }

  // ----------------------------------------------------------------------
  // F. ENCOURAGEMENT & EXCELLENCE (Si tout est parfait)
  // ----------------------------------------------------------------------
  if (!opportunities.some(o => o.level === 'CRITICAL' || o.level === 'WARNING')) {
      if (savingsRatio < 20) {
          opportunities.push({
             id: 'push_20', type: 'SAVINGS', level: 'SUCCESS',
             title: 'Visez les 20%',
             message: `Situation saine ! Prochain niveau : monter votre taux d'épargne à 20% (actuel: ${savingsRatio}%). C'est la clé de l'indépendance.`,
          });
      } else if (invested < totalWealth * 0.3 && !isModest) {
           opportunities.push({
             id: 'invest_more', type: 'INVESTMENT', level: 'INFO',
             title: 'Diversification',
             message: `Excellent épargnant, mais patrimoine trop liquide. Visez 30% d'actifs investis (Bourse/Immo) pour dynamiser votre patrimoine.`
          });
      } else {
          opportunities.push({
             id: 'fire_track', type: 'INVESTMENT', level: 'SUCCESS',
             title: 'En route vers la liberté',
             message: `Votre profil est dans le top 5%. Finances optimisées, automatisées et diversifiées. Vous construisez activement votre liberté financière.`,
          });
      }
  }

  // --- SCORING GLOBAL (Pondéré) ---
  let score = 100;
  
  // Pénalités structurelles
  if (needsRatio > 50) score -= (needsRatio - 50); 
  if (wantsRatio > 30) score -= (wantsRatio - 30);
  if (context.safetyMonths < 3) score -= (3 - context.safetyMonths) * 10;
  if (debtRatio > 35) score -= 15;
  
  // Bonus de comportement
  if (savingsRatio > 15) score += 5;
  if (invested > savings) score += 5;
  if (autoSavings > 0) score += 5;

  // KILL SWITCH (Plafond de verre)
  if (isDeficit || needsRatio > 80 || savings < 100) {
      score = Math.min(score, 40); // On ne peut pas avoir un bon score si on coule
  }

  // Tags
  if (isSurvivalMode(totalIncome, context.fixed)) tags.push("Mode Survie");
  else if (savingsRatio > 25) tags.push("Fourmi");
  else if (wantsRatio > 45) tags.push("Cigale");
  
  if (invested > savings) tags.push("Investisseur");
  if (isWealthy) tags.push("Aisé");

  return {
    globalScore: Math.max(0, Math.min(100, Math.round(score))),
    tags: [...new Set(tags)],
    ratios: { needs: needsRatio, wants: wantsRatio, savings: savingsRatio },
    opportunities: opportunities.sort((a, b) => {
        const levels = { 'CRITICAL': 0, 'WARNING': 1, 'INFO': 2, 'SUCCESS': 3 };
        return levels[a.level] - levels[b.level];
    })
  };
};

const isSurvivalMode = (income: number, fixed: number) => income < fixed + 200;
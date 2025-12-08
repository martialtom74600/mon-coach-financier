import { differenceInMonths, isValid, addMonths, addYears, isSameMonth } from 'date-fns';
import { 
  Profile, Goal, SimulationResult, GoalDiagnosis, GoalStrategy, 
  DeepAnalysis, OptimizationOpportunity, 
  safeFloat, calculateListTotal, formatCurrency, 
  CONSTANTS, GOAL_CATEGORIES, PERSONA_PRESETS 
} from './definitions';

// ============================================================================
// 1. CONFIGURATION & TYPES
// ============================================================================

// Type pour l'injection de taux dynamiques (Stress Tests)
export type SimulationRates = typeof FINANCIAL_KNOWLEDGE.RATES;

const FINANCIAL_KNOWLEDGE = {
  RATES: { 
    INFLATION: 0.025,    // 2.5%
    LIVRET_A: 0.03,      // 3.0%
    LEP: 0.05,           // 5.0%
    MARKET_AVG: 0.07,    // 7.0% (Moyenne historique lissée)
    SAFE_WITHDRAWAL: 0.04 // 4.0% (Règle de Trinity)
  },
  THRESHOLDS: { 
    LEP_INCOME_SINGLE: 22000, 
    LEP_INCOME_COUPLE: 34000, 
    HCSF_DEBT_RATIO: 35,      
    RICH_INCOME: 4000,        
    POOR_INCOME: 1600,        
    SURVIVAL_BUFFER: 1000     
  },
  TAX_BRACKETS: [ 
    { t: 11294, r: 0.11 }, 
    { t: 28797, r: 0.30 }, 
    { t: 82341, r: 0.41 }, 
    { t: 177106, r: 0.45 } 
  ]
};

// GUIDES PÉDAGOGIQUES ( inchangés car statiques )
const ACTION_GUIDES = {
  LEP: {
    title: "Ouvrir un Livret d'Épargne Populaire (LEP)",
    definition: "Le LEP est le livret réglementé le plus rentable (5% net d'impôt). Il est réservé aux revenus modestes.",
    steps: ["Avis d'imposition N-1", "Vérifier RFR", "Contacter banque"],
    tips: ["Plafond : 10 000€", "Taux : 5.0% Net", "Argent disponible."]
  },
  PEA: {
    title: "Ouvrir un Plan Épargne Actions (PEA)",
    definition: "Enveloppe fiscale reine pour investir en bourse avec une fiscalité avantageuse après 5 ans.",
    steps: ["Choisir banque en ligne (frais bas)", "Ouvrir compte", "Prendre date (virement)", "Automatiser"],
    tips: ["Fiscalité douce après 5 ans", "Horizon long terme (10 ans+)"]
  },
  MATELAS: {
    title: "Constituer son Épargne de Précaution",
    definition: "Somme disponible immédiatement pour les coups durs sans s'endetter.",
    steps: ["Ouvrir Livret A/LDDS dédié", "Viser 1000€ urgence", "Viser 3 mois de charges"],
    tips: ["Automatiser le virement en début de mois"]
  },
  DETTE: {
    title: "Solder une dette toxique",
    definition: "Un crédit conso coûte plus cher que ce que l'épargne rapporte. Rembourser = Gain garanti.",
    steps: ["Lister crédits", "Remboursement anticipé", "Avalanche ou Boule de neige"],
    tips: ["Souvent sans pénalités si < 10k€"]
  }
};

// ============================================================================
// 2. MODULES DE CALCUL (OPTIMISÉS)
// ============================================================================

/**
 * Estime le TMI en tenant compte du statut (Salarié vs Indépendant)
 * @param isSalaried Par défaut true, applique l'abattement de 10%
 */
const estimateTMI = (netIncome: number, parts: number = 1, isSalaried: boolean = true) => {
    // Abattement 10% frais pro uniquement pour salariés
    const taxableIncome = netIncome * 12 * (isSalaried ? 0.9 : 1);
    const q = taxableIncome / Math.max(1, parts);
    
    for (let i = FINANCIAL_KNOWLEDGE.TAX_BRACKETS.length - 1; i >= 0; i--) {
        if (q > FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].t) return FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].r;
    }
    return 0;
};

/**
 * Calcul FIRE Corrigé : Utilise le RENDEMENT RÉEL (Taux - Inflation)
 * pour compenser la perte de pouvoir d'achat future.
 */
const calculateFIRE = (annualExpenses: number, currentWealth: number, monthlySavings: number, rates: SimulationRates) => {
    if (monthlySavings <= 0) return { years: 99, date: null };
    
    const target = annualExpenses / rates.SAFE_WITHDRAWAL;
    if (currentWealth >= target) return { years: 0, date: new Date() };
    
    // Taux Réel = (1+Nominal)/(1+Inflation) - 1  ~= Nominal - Inflation
    // On utilise l'approximation arithmétique pour la robustesse
    const realRateAnnual = rates.MARKET_AVG - rates.INFLATION;
    const realRateMonthly = realRateAnnual / 12;

    // Formule logarithmique directe pour trouver 'n' (nombre de mois)
    // Cible = PV * (1+r)^n + PMT * [((1+r)^n - 1) / r]
    // Résolution pour n (évite la boucle while)
    let months = 0;
    try {
        const numerator = Math.log((target * realRateMonthly + monthlySavings) / (currentWealth * realRateMonthly + monthlySavings));
        const denominator = Math.log(1 + realRateMonthly);
        months = numerator / denominator;
    } catch (e) {
        months = 999;
    }
    
    if (!isFinite(months) || months > 1200) return { years: 99, date: null }; // Cap à 100 ans

    return { 
        years: Math.round(months / 12), 
        date: addMonths(new Date(), Math.round(months)), 
        target // Cible en pouvoir d'achat d'aujourd'hui
    };
};

/**
 * Calcul Valeur Future Optimisé (O(1))
 * Utilise la formule mathématique directe au lieu d'une boucle.
 */
const simulateFutureWealth = (start: number, monthly: number, years: number, rate: number) => {
    if (years <= 0) return start;
    const r = rate / 12;
    const n = years * 12;
    
    // Formule FV des intérêts composés avec versements
    const compoundInterestFactor = Math.pow(1 + r, n);
    const futureValue = (start * compoundInterestFactor) + (monthly * (compoundInterestFactor - 1) / r);
    
    return Math.round(futureValue);
};

const calculateInflationImpact = (amt: number, date: Date, inflationRate: number) => {
    const years = differenceInMonths(date, new Date()) / 12;
    return years <= 0 ? amt : amt * Math.pow(1 + inflationRate, years);
};

const calculateCompoundMonths = (target: number, pmt: number, rate: number) => {
    if (pmt <= 0) return 999;
    if (rate <= 0) return Math.ceil(target / pmt);
    const r = (rate / 100) / 12;
    try { 
        const result = Math.ceil(Math.log(((target * r) / pmt) + 1) / Math.log(1 + r)); 
        return isFinite(result) ? result : 999;
    } catch { return 999; }
};

// ============================================================================
// 3. GESTION DES OBJECTIFS
// ============================================================================
export const calculateMonthlyEffort = (goal: Goal): number => {
  if (!goal.targetAmount || !goal.deadline) return 0;
  const targetDate = new Date(goal.deadline);
  
  // CORRECTION : Minimum 1 mois pour éviter division par 0 ou infini
  // Si c'est pour "demain", il faut payer la totalité maintenant.
  const months = Math.max(1, differenceInMonths(targetDate, new Date()));
  
  const current = safeFloat(goal.currentSaved);
  const target = safeFloat(goal.targetAmount);
  
  if (goal.isInvested) {
    const r = (safeFloat(goal.projectedYield) || 7) / 100 / 12;
    const fv = current * Math.pow(1 + r, months);
    const numerator = (target - fv) * r;
    const denominator = Math.pow(1 + r, months) - 1;
    return Math.max(0, denominator === 0 ? 0 : numerator / denominator);
  }
  return Math.max(0, target - current) / months;
};

export const simulateGoalProjection = (goal: Goal, monthlyContribution: number) => {
    // Ici on garde la boucle car on a besoin des points intermédiaires pour le graphique
    const projection = [];
    const today = new Date();
    const months = differenceInMonths(new Date(goal.deadline), today);
    const r = (goal.isInvested ? (safeFloat(goal.projectedYield) || 5) : 0) / 100 / 12;
    let balance = safeFloat(goal.currentSaved);
    let contributed = balance;
    let interests = 0;
    
    projection.push({ month: 0, date: today, balance, contributed, interests: 0 });
    for (let i = 1; i <= months; i++) {
        const gain = balance * r;
        balance += monthlyContribution + gain;
        contributed += monthlyContribution;
        interests += gain;
        projection.push({ 
            month: i, 
            date: addMonths(today, i), 
            balance: Math.round(balance), 
            contributed: Math.round(contributed), 
            interests: Math.round(interests) 
        });
    }
    return { projection, summary: { totalPocket: Math.round(contributed), totalInterests: Math.round(interests), finalAmount: Math.round(balance) }};
};

export const analyzeGoalStrategies = (goal: Goal, effort: number, capacity: number, income: number, globalSavings: number, rates: SimulationRates): GoalDiagnosis => {
    const gap = effort - capacity;
    const target = safeFloat(goal.targetAmount);
    // Utilisation du taux d'inflation dynamique
    const inflationGap = calculateInflationImpact(target, new Date(goal.deadline), rates.INFLATION) - target;
    
    let status: GoalDiagnosis['status'] = 'POSSIBLE';
    let mainMessage = "Budget OK.";
    let color = 'green';
    const strategies: GoalStrategy[] = [];

    if (effort > income) { status = 'IMPOSSIBLE'; color = 'black'; mainMessage = "Impossible : dépasse vos revenus."; }
    else if (gap > 0) { status = 'HARD'; color = 'red'; mainMessage = `Manque ${Math.round(gap)}€/mois.`; }

    if (inflationGap > target * 0.05) {
        strategies.push({ type: 'INCOME', title: 'Inflation', message: `Attention, ce projet coûtera réellement +${Math.round(inflationGap)}€ à terme.`, disabled: true });
    }

    if (status === 'HARD') {
        const deposit = Math.min(globalSavings, target * 0.3);
        if (globalSavings > 1000) strategies.push({ type: 'BUDGET', title: "Apport", message: `Injecter ${Math.round(deposit)}€ d'épargne.`, value: deposit, actionLabel: "Simuler" });
        if (!goal.isInvested && differenceInMonths(new Date(goal.deadline), new Date()) > 24) strategies.push({ type: 'HYBRID', title: 'Placer', message: `Placer cet argent à 4%+.`, actionLabel: "Activer intérêts" });
        
        const months = calculateCompoundMonths(target - safeFloat(goal.currentSaved), capacity, safeFloat(goal.projectedYield));
        if (months < 360) strategies.push({ type: 'TIME', title: 'Patienter', message: `Possible en ${addMonths(new Date(), months).toLocaleDateString('fr-FR', {month:'short', year:'2-digit'})}.`, value: addMonths(new Date(), months).toISOString() });
    }
    return { status, label: status, color, mainMessage, gap: Math.max(0, gap), strategies };
};

export const distributeGoals = (goals: Goal[], capacity: number) => {
    const max = Math.max(0, capacity * (1 - CONSTANTS.BUFFER_RATIO));
    let available = max;
    const allocations = [];
    const sorted = [...goals].sort((a, b) => (GOAL_CATEGORIES[a.category]?.priority || 3) - (GOAL_CATEGORIES[b.category]?.priority || 3));

    for (const g of sorted) {
        const req = calculateMonthlyEffort(g);
        const alloc = Math.min(available, req);
        available -= alloc;
        allocations.push({ 
            id: g.id, name: g.name, tier: 'GROWTH', 
            requestedEffort: req, allocatedEffort: alloc, 
            status: alloc >= req ? 'FULL' : 'PARTIAL', 
            fillRate: req > 0 ? Math.round(alloc/req*100) : 100 
        });
    }
    return { allocations, totalAllocated: max - available };
};

// ============================================================================
// 4. ORCHESTRATEUR (CORRIGÉ & ROBUSTE)
// ============================================================================
export const computeFinancialPlan = (
    profile: Profile, 
    customRates?: Partial<SimulationRates> // Injection de dépendances
): SimulationResult => {
  
  // Fusion des taux : Défaut + Custom
  const RATES = { ...FINANCIAL_KNOWLEDGE.RATES, ...customRates };

  const income = calculateListTotal(profile.incomes);
  
  // 1. Logement
  let housingCost = 0;
  if (profile.housing?.status === 'tenant' || profile.housing?.status === 'owner_loan') {
      housingCost = safeFloat(profile.housing?.monthlyCost);
  }

  // 2. Charges Fixes
  const annualExpensesTotal = calculateListTotal(profile.annualExpenses);

  const fixed = calculateListTotal(profile.fixedCosts) 
                + housingCost 
                + annualExpensesTotal 
                + calculateListTotal(profile.credits) 
                + calculateListTotal(profile.subscriptions);
  
  // 3. Vie Courante (Living / Discretionary Expenses)
  // CORRECTION : Variable renommée pour éviter la confusion "Fun" vs "Manger"
  const livingExpenses = safeFloat(profile.funBudget); 

  // 4. Épargne Manuelle déjà programmée
  const manualSavings = calculateListTotal(profile.savingsContributions);
  
  // 5. Capacité d'Investissement Réelle
  const capacityToSave = Math.max(0, income - fixed - livingExpenses);
  
  // Allocation des objectifs
  const { allocations, totalAllocated } = distributeGoals(profile.goals || [], capacityToSave);
  
  // Cashflow Libre
  const realCashflow = Math.max(0, capacityToSave - totalAllocated);
  
  // Patrimoine
  const matelas = safeFloat(profile.savings);
  const investedAmount = Array.isArray(profile.investments) 
        ? calculateListTotal(profile.investments as any) 
        : safeFloat(profile.investments);
  const currentBalance = safeFloat(profile.currentBalance);
  const totalWealth = matelas + investedAmount + currentBalance;

  // KPIs
  const burnRate = fixed + Math.min(livingExpenses, 800); // 800€ min pour survivre
  const safetyMonths = burnRate > 0 ? matelas / burnRate : 0;
  const engagementRate = income > 0 ? (fixed / income) * 100 : 0;
  
  // On passe 'RATES' dans le contexte pour que le docteur l'utilise
  return {
    budget: { 
      income, fixed, capacity: capacityToSave, remainingToLive: income - fixed - totalAllocated,
      monthlyIncome: income, mandatoryExpenses: fixed, discretionaryExpenses: livingExpenses,
      capacityToSave, profitableExpenses: manualSavings + totalAllocated, 
      totalGoalsEffort: totalAllocated, totalRecurring: fixed + manualSavings,
      realCashflow, matelas, investments: investedAmount, totalWealth,
      safetyMonths, engagementRate, 
      rules: PERSONA_PRESETS.SALARIED.rules, // À rendre dynamique selon profile.persona si besoin
      securityBuffer: 0, availableForProjects: 0,
      currentBalance // Ajouté au contexte
    },
    allocations, 
    freeCashFlow: realCashflow,
    usedRates: RATES // Pour affichage front
  };
};

export const simulateGoalScenario = (goalInput: any, profile: any, context: any, customRates?: Partial<SimulationRates>) => {
    const RATES = { ...FINANCIAL_KNOWLEDGE.RATES, ...customRates };
    const tempGoal = { ...goalInput, id: 'temp' };
    const effort = calculateMonthlyEffort(tempGoal);
    const diagnosis = analyzeGoalStrategies(
        tempGoal, effort, context.availableForProjects, 
        context.monthlyIncome, context.matelas, RATES
    );
    return { tempGoal, monthlyEffort: effort, projectionData: { projection: [], summary: { finalAmount: 0, totalInterests: 0, totalPocket: 0 } }, diagnosis };
};

// ============================================================================
// 🔥 5. LE DOCTEUR FINANCIER V13 (OPTIMISÉ & CONTEXTUEL) 🔥
// ============================================================================
export const analyzeProfileHealth = (
    profile: Profile, 
    context: SimulationResult['budget'],
    customRates?: Partial<SimulationRates>
): DeepAnalysis => {
  
  const RATES = { ...FINANCIAL_KNOWLEDGE.RATES, ...customRates };
  const opps: OptimizationOpportunity[] = [];
  const tags: string[] = [];

  const { safetyMonths } = context;
  const totalIncome = Math.max(1, context.monthlyIncome);
  
  // Ratios
  const needsRatio = Math.round((context.fixed / totalIncome) * 100);
  const wantsRatio = Math.round((context.discretionaryExpenses / totalIncome) * 100);
  const savingsRatio = Math.round((context.capacityToSave / totalIncome) * 100);
  const debtRatio = context.engagementRate;
  
  const cash = safeFloat(context.currentBalance);
  const savings = safeFloat(context.matelas);
  const invested = context.investments;
  const totalWealth = context.totalWealth;

  // Fiscalité & Statut
  const adults = Math.max(1, safeFloat(profile.household?.adults));
  const children = Math.max(0, safeFloat(profile.household?.children));
  const parts = adults + (children * 0.5) + (children >= 3 ? 0.5 : 0);
  
  // CORRECTION : Détection statut Freelance pour calcul TMI juste
  const isFreelance = profile.persona === 'freelance';
  const tmi = estimateTMI(totalIncome, parts, !isFreelance);
  
  const isModest = totalIncome < FINANCIAL_KNOWLEDGE.THRESHOLDS.POOR_INCOME;
  const isWealthy = totalIncome > (FINANCIAL_KNOWLEDGE.THRESHOLDS.RICH_INCOME + (children * 500));
  
  // Cashflow Checks
  const realExpenses = context.fixed + context.discretionaryExpenses;
  const operationalCashflow = totalIncome - realExpenses;
  const isLivingAboveMeans = operationalCashflow < 0;
  const netCashflow = operationalCashflow - context.profitableExpenses;
  const isOverSaving = !isLivingAboveMeans && netCashflow < 0;

  // Projections (Avec Taux Dynamiques)
  const fireData = calculateFIRE((context.fixed + context.discretionaryExpenses) * 12, totalWealth, context.capacityToSave, RATES);
  const wealth10y = simulateFutureWealth(totalWealth, context.capacityToSave, 10, RATES.MARKET_AVG);
  const wealth20y = simulateFutureWealth(totalWealth, context.capacityToSave, 20, RATES.MARKET_AVG);
  
  // --- DIAGNOSTIC ---

  // 1. URGENCE VITALE
  if (isLivingAboveMeans) {
      opps.push({
          id: 'deficit_alert', type: 'BUDGET', level: 'CRITICAL',
          title: 'Hémorragie Financière',
          message: `STOP ! Vous vivez au-dessus de vos moyens (${formatCurrency(Math.abs(operationalCashflow))} de perte/mois).`,
      });
      tags.push("DANGER");
  } else if (isOverSaving) {
      opps.push({
          id: 'oversaving_alert', type: 'BUDGET', level: 'WARNING',
          title: 'Épargne trop agressive',
          message: `Attention, vos virements automatiques (${formatCurrency(context.profitableExpenses)}) mettent votre compte courant dans le rouge.`,
      });
  }

  // 2. SÉCURITÉ
  const monthlyBurnRate = context.fixed + Math.min(context.discretionaryExpenses, 800);
  const personaMultiplier = isFreelance ? 1.5 : 0.8; // Freelance a besoin de plus de sécurité
  const idealSafety = monthlyBurnRate * (context.rules?.safetyMonths || 3) * personaMultiplier;
  
  if (savings < FINANCIAL_KNOWLEDGE.THRESHOLDS.SURVIVAL_BUFFER) {
    opps.push({
      id: 'safety_danger', type: 'SAVINGS', level: 'CRITICAL',
      title: 'Zone Rouge : 0 Sécurité',
      message: `Règle d'or : Avoir 1000€ de sécurité. Vous avez ${formatCurrency(savings)}.`,
      actionLabel: `Sécuriser les ${formatCurrency(1000 - savings)} manquants`,
      guide: ACTION_GUIDES.MATELAS
    });
  } else if (savings < idealSafety && !isLivingAboveMeans) {
    const manque = idealSafety - savings;
    opps.push({
      id: 'safety_build', type: 'SAVINGS', level: 'INFO',
      title: 'Renforcez la digue',
      message: `Votre cible de sérénité est à ${formatCurrency(idealSafety)}. Il manque ${formatCurrency(manque)}.`,
      actionLabel: 'Méthode du Matelas',
      guide: ACTION_GUIDES.MATELAS
    });
  } else {
     // CORRECTION CASH DRAG : On vérifie les besoins court terme avant de crier
     const shortTermNeeds = (profile.goals || [])
        .filter(g => g.deadline && differenceInMonths(new Date(g.deadline), new Date()) <= 24)
        .reduce((sum, g) => sum + Math.max(0, safeFloat(g.targetAmount) - safeFloat(g.currentSaved)), 0);

     const maxCashAllowed = idealSafety + shortTermNeeds + 2000; // Buffer de confort

     if (savings > maxCashAllowed) {
        const excess = savings - maxCashAllowed;
        const loss = Math.round(excess * RATES.INFLATION);
        opps.push({
          id: 'safety_excess', type: 'INVESTMENT', level: 'WARNING',
          title: 'Perte de Pouvoir d\'Achat',
          message: `Vous avez ${formatCurrency(excess)} qui dorment inutilement (Sécurité + Projets court terme couverts). L'inflation vous prend ${formatCurrency(loss)}/an.`,
          potentialGain: Math.round(excess * (RATES.MARKET_AVG - RATES.LIVRET_A)), // Gain vs Livret A
        });
     }
  }

  // ALERTE IMMO
  if (profile.housing?.status === 'tenant' && totalIncome > 3000 && safetyMonths > 6) {
      opps.push({
          id: 'buy_home', type: 'INVESTMENT', level: 'INFO',
          title: 'Acheter ou Louer ?',
          message: `Revenus solides + Épargne. Avez-vous évalué l'achat de votre RP ?`,
      });
  }

  // 3. DETTES TOXIQUES
  const badDebts = profile.credits.filter(c => safeFloat(c.amount) > 0 && !c.name.toLowerCase().match(/(immo|maison|appart|scpi|locatif)/i));
  const totalBad = calculateListTotal(badDebts);

  if (totalBad > 0) {
      const debtImpact = (totalBad / totalIncome) * 100;
      opps.push({
          id: 'toxic_debt', type: 'DEBT', level: debtImpact > 10 ? 'CRITICAL' : 'WARNING',
          title: 'Dette Toxique',
          message: `Rembourser vos crédits conso (${formatCurrency(totalBad)}/mois), c'est un placement garanti à 5-10%.`,
          actionLabel: 'Plan de remboursement',
          potentialGain: totalBad * 12,
          guide: ACTION_GUIDES.DETTE
      });
  }

  // 4. OPTIMISATION CASH (Compte courant)
  const maxCurrentAccount = context.fixed * 1.5; // Un peu plus large que 1.2
  if (cash > maxCurrentAccount && !isLivingAboveMeans) {
       const overflow = cash - maxCurrentAccount;
       const potential = Math.round(overflow * (isModest ? RATES.LEP : RATES.LIVRET_A));
       opps.push({
          id: 'cash_drag', type: 'BUDGET', level: 'INFO',
          title: 'Argent Improductif',
          message: `Il y a ${formatCurrency(overflow)} en trop sur le compte courant.`,
          potentialGain: potential,
       });
  }

  // Automatisation
  const autoSavings = calculateListTotal(profile.savingsContributions);
  if (autoSavings === 0 && context.capacityToSave > 100) {
       opps.push({
          id: 'automate_savings', type: 'SAVINGS', level: 'WARNING',
          title: 'Le piège de la volonté',
          message: `Automatisez un virement de ${formatCurrency(Math.round(context.capacityToSave * 0.7))} dès le début du mois.`,
       });
  }

  // Lifestyle Creep
  if (wantsRatio > 40 && totalIncome > 2000) {
       opps.push({
          id: 'lifestyle_creep', type: 'BUDGET', level: 'WARNING',
          title: 'Inflation du Train de Vie',
          message: `Vos dépenses plaisir (${wantsRatio}%) freinent votre enrichissement.`,
       });
  }

  // 5. NIVEAU AVANCÉ
  
  // LEP (Eligibilité dynamique)
  const limitLEP = parts > 1.5 ? FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_COUPLE : FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_SINGLE;
  // Note: C'est une approx, la vraie règle utilise le RFR N-2, mais c'est une bonne estimation
  const isEligibleLEP = (totalIncome * 12) * 0.9 < limitLEP; 
  const hasLEP = profile.savingsContributions.some(s => s.name.match(/LEP|Populaire/i)) || profile.investments.some((i: any) => i.name?.match(/LEP/i)); // Check élargi
  
  if (isEligibleLEP && !hasLEP && savings > 500) {
      opps.push({
          id: 'lep_missing', type: 'INVESTMENT', level: 'SUCCESS',
          title: 'Cadeau Fiscal (LEP)',
          message: `Vous êtes éligible au LEP (${(RATES.LEP * 100).toFixed(1)}% Net).`,
          potentialGain: Math.min(savings, 10000) * (RATES.LEP - RATES.LIVRET_A),
          guide: ACTION_GUIDES.LEP
      });
  }

  // Fiscalité (PEA/PER)
  if (tmi >= 0.30 && context.capacityToSave > 500 && savings > idealSafety) {
      const taxSave = Math.round(1000 * tmi);
      opps.push({
          id: 'tax_optim', type: 'INVESTMENT', level: 'SUCCESS',
          title: `Réduisez vos impôts (TMI ${Math.round(tmi*100)}%)`,
          message: `L'État finance ${Math.round(tmi*100)}% de votre épargne retraite (PER) via la déduction d'impôt.`,
          potentialGain: taxSave * 2, // Gain estimé arbitraire pour motiver
          guide: ACTION_GUIDES.PEA // Ou PER si tu as le guide
      });
  }

  // 6. SCORING & TAGS
  let score = 100;
  if (needsRatio > 55) score -= (needsRatio - 55) * 1.5;
  if (wantsRatio > 30) score -= (wantsRatio - 30);
  if (safetyMonths < 3) score -= (3 - safetyMonths) * 15;
  if (debtRatio > 35) score -= 20;
  if (isLivingAboveMeans || needsRatio > 85 || savings < 500) {
      score = Math.min(score, 35);
  }
  if (savingsRatio > 20) score += 5;
  if (invested > savings && safetyMonths > 3) score += 5;

  if (isLivingAboveMeans) tags.push("Alerte");
  else if (savingsRatio > 30) tags.push("Fourmi");
  else if (wantsRatio > 45) tags.push("Cigale");
  
  if (invested > savings * 0.5) tags.push("Investisseur");
  if (isWealthy) tags.push("Aisé");
  if (isModest) tags.push("Modeste");

  return {
    globalScore: Math.max(0, Math.min(100, Math.round(score))),
    tags: [...new Set(tags)],
    ratios: { needs: needsRatio, wants: wantsRatio, savings: savingsRatio },
    projections: { wealth10y, wealth20y, fireYear: fireData.years },
    opportunities: opps.sort((a, b) => {
        const levels: Record<string, number> = { 'CRITICAL': 0, 'WARNING': 1, 'INFO': 2, 'SUCCESS': 3 };
        return levels[a.level] - levels[b.level];
    })
  };
};
// app/lib/engine.ts
import { differenceInMonths, addMonths } from 'date-fns';
import { 
  Profile, Goal, SimulationResult, GoalDiagnosis, GoalStrategy, 
  DeepAnalysis, OptimizationOpportunity, 
  safeFloat, calculateListTotal, formatCurrency, 
  CONSTANTS, GOAL_CATEGORIES, PERSONA_PRESETS 
} from './definitions';

// ============================================================================
// 1. CONFIGURATION & ACTION GUIDES
// ============================================================================

export type SimulationRates = typeof FINANCIAL_KNOWLEDGE.RATES;

const FINANCIAL_KNOWLEDGE = {
  RATES: { 
    INFLATION: 0.025,    
    LIVRET_A: 0.03,      
    LEP: 0.05,           
    MARKET_AVG: 0.07,    
    SAFE_WITHDRAWAL: 0.04 
  },
  THRESHOLDS: { 
    LEP_INCOME_SINGLE: 22000, 
    LEP_INCOME_COUPLE: 34000, 
    HCSF_DEBT_RATIO: 35,      
    RICH_INCOME: 4000,        
    POOR_INCOME: 1600,        
    SURVIVAL_BUFFER: 1000,
    MIN_RAV: 900 
  },
  TAX_BRACKETS: [ 
    { t: 11294, r: 0.11 }, 
    { t: 28797, r: 0.30 }, 
    { t: 82341, r: 0.41 }, 
    { t: 177106, r: 0.45 } 
  ]
};

type ActionGuide = {
    title: string;
    definition: string;
    steps: string[];
    tips: string[];
    difficulty?: 'Facile' | 'Moyen' | 'Difficile';
    impact?: 'Immédiat' | 'Long terme';
};

const ACTION_GUIDES: Record<string, ActionGuide> = {
  // --- BASICS ---
  BUDGET_CUT: { 
    title: "Optimiser les Charges Fixes", 
    definition: "Récupérer du pouvoir d'achat sans baisser son niveau de vie.", 
    steps: ["Lister les abonnements.", "Utiliser la loi Hamon (Assurances).", "Renégocier Mobile/Internet."], 
    tips: ["Supprimez ce qui n'est pas utilisé depuis 30j."], difficulty: 'Facile', impact: 'Immédiat' 
  },
  DETTE: { 
    title: "Éradiquer les Mauvaises Dettes", 
    definition: "Les crédits conso coûtent plus cher que l'épargne ne rapporte.", 
    steps: ["Lister les taux.", "Rembourser le taux le plus élevé en premier."], 
    tips: ["Coupez les cartes revolving."], difficulty: 'Difficile', impact: 'Immédiat' 
  },
  
  // --- LIVRETS & CASH ---
  LIVRET_OPEN: { 
    title: "Constituer un Matelas de Sécurité", 
    definition: "Votre pare-feu contre les imprévus (panne, santé).", 
    steps: ["Ouvrir un Livret A ou LDDS.", "Viser 3 mois de charges.", "Automatiser 50€/mois."], 
    tips: ["Ne touchez jamais à cet argent pour le plaisir."], difficulty: 'Facile', impact: 'Immédiat' 
  },
  LIVRET_BOOST: { 
    title: "Renforcer votre Sécurité", 
    definition: "Votre épargne de précaution est un peu faible.", 
    steps: ["Augmenter le virement mensuel vers vos livrets.", "Vérifier si vous avez atteint le plafond (22 950€)."], 
    tips: ["Dormir tranquille n'a pas de prix."], difficulty: 'Facile', impact: 'Immédiat' 
  },
  LEP_OPEN: { 
    title: "Ouvrir un LEP (5% Net)", 
    definition: "Le placement sans risque le plus rentable. Réservé aux revenus modestes.", 
    steps: ["Vérifier avis d'imposition.", "Prendre RDV banque."], 
    tips: ["Plafond 10 000€."], difficulty: 'Facile', impact: 'Immédiat' 
  },

  // --- PEA (BOURSE) ---
  PEA_OPEN: { 
    title: "Ouvrir un PEA", 
    definition: "La meilleure niche fiscale pour investir en Bourse.", 
    steps: ["Choisir banque en ligne (frais < 0.5%).", "Prendre date (compteur 5 ans).", "Acheter un ETF Monde."], 
    tips: ["Évitez les banques traditionnelles."], difficulty: 'Moyen', impact: 'Long terme' 
  },
  PEA_BOOST: { 
    title: "Optimiser votre PEA", 
    definition: "Vous avez l'outil, maintenant il faut le remplir.", 
    steps: ["Augmenter le DCA (versement mensuel).", "Vérifier que vous n'avez pas trop de liquidités non investies.", "Viser le plafond 150k€."], 
    tips: ["L'argent sur le compte espèce ne rapporte rien."], difficulty: 'Facile', impact: 'Long terme' 
  },

  // --- ASSURANCE VIE ---
  AV_OPEN: {
    title: "Ouvrir une Assurance Vie",
    definition: "Le couteau suisse de l'épargne (Projets & Succession).",
    steps: ["Choisir contrat sans frais d'entrée.", "Mixer Fonds Euros (Sécurité) et UC (Performance)."],
    tips: ["Ouvrez pour prendre date."], difficulty: 'Moyen', impact: 'Long terme'
  },
  AV_BOOST: {
    title: "Dynamiser votre Assurance Vie",
    definition: "Votre AV dort peut-être sur un fonds euros peu performant.",
    steps: ["Vérifier les frais de gestion (<0.6%).", "Arbitrer une partie vers des ETF ou SCPI si horizon long.", "Vérifier la clause bénéficiaire."],
    tips: ["Si votre contrat a > 8 ans, profitez des abattements."], difficulty: 'Moyen', impact: 'Long terme'
  },

  // --- CRYPTO ---
  CRYPTO_OPEN: {
    title: "Découvrir les Crypto (Prudence)",
    definition: "Une classe d'actif volatile mais performante pour diversifier (max 5%).",
    steps: ["Ouvrir un compte sur une plateforme régulée (PSAN).", "Commencer par Bitcoin/Ethereum uniquement.", "Ne mettre que ce qu'on peut perdre."],
    tips: ["Not your keys, not your coins."], difficulty: 'Difficile', impact: 'Long terme'
  },
  CRYPTO_BOOST: {
    title: "Sécuriser vos Cryptos",
    definition: "Vous avez des cryptos, pensez à sécuriser vos gains.",
    steps: ["Avez-vous un Ledger (Cold Wallet) ?", "Rebalencez si ça dépasse 10% de votre patrimoine.", "Déclarez vos comptes aux impôts."],
    tips: ["Prendre des profits n'a jamais tué personne."], difficulty: 'Moyen', impact: 'Long terme'
  },

  // --- IMMO / SCPI ---
  SCPI_OPEN: {
    title: "Investir en Pierre-Papier (SCPI)",
    definition: "L'immobilier sans les soucis de gestion.",
    steps: ["Définir budget.", "Choisir SCPI diversifiées (Santé/Logistique).", "Étudier l'achat à crédit."],
    tips: ["Placement long terme (8 ans min)."], difficulty: 'Moyen', impact: 'Long terme'
  },
  SCPI_BOOST: {
    title: "Réinvestir vos loyers SCPI",
    definition: "Faites rouler la boule de neige immobilière.",
    steps: ["Optez pour le réinvestissement automatique des dividendes.", "Vérifiez la fiscalité (TMI)."],
    tips: ["Attention à la fiscalité des revenus fonciers."], difficulty: 'Facile', impact: 'Long terme'
  },

  // --- PER (RETRAITE) ---
  PER_OPEN: {
    title: "Ouvrir un PER (Défiscalisation)",
    definition: "Réduire ses impôts aujourd'hui pour sa retraite demain.",
    steps: ["Vérifier TMI (>=30%).", "Ouvrir PER frais bas.", "Verser avant le 31/12."],
    tips: ["Argent bloqué jusqu'à la retraite."], difficulty: 'Difficile', impact: 'Long terme'
  },
  PER_BOOST: {
    title: "Maximiser le plafond PER",
    definition: "Utilisez votre plafond fiscal non utilisé des 3 dernières années.",
    steps: ["Regarder avis d'imposition (Plafond Retraite).", "Faire un versement exceptionnel."],
    tips: ["C'est le moment de gommer une grosse année fiscale."], difficulty: 'Moyen', impact: 'Long terme'
  }
};

// ============================================================================
// 2. MODULES DE CALCUL
// ============================================================================

const calculateFIRE = (annualExpenses: number, currentWealth: number, monthlySavings: number, rates: SimulationRates) => {
    if (monthlySavings <= 0) return { years: 99, date: null };
    const target = annualExpenses / rates.SAFE_WITHDRAWAL;
    if (currentWealth >= target) return { years: 0, date: new Date() };
    const realRateAnnual = rates.MARKET_AVG - rates.INFLATION;
    const realRateMonthly = realRateAnnual / 12;
    let months = 0;
    try {
        const numerator = Math.log((target * realRateMonthly + monthlySavings) / (currentWealth * realRateMonthly + monthlySavings));
        const denominator = Math.log(1 + realRateMonthly);
        months = numerator / denominator;
    } catch (e) { months = 999; }
    if (!isFinite(months) || months > 1200) return { years: 99, date: null };
    return { years: Math.round(months / 12), date: addMonths(new Date(), Math.round(months)), target };
};

const simulateFutureWealth = (start: number, monthly: number, years: number, rate: number) => {
    if (years <= 0) return start;
    const r = rate / 12;
    const n = years * 12;
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

// ✅ HELPER INTELLIGENT : Vérifie si l'utilisateur possède déjà un actif
// Il regarde dans TOUTES les listes (Stocks & Flux)
const hasAsset = (profile: Profile, typeKeys: string[]): boolean => {
  // On regroupe tout pour être sûr de ne rien rater
  const allItems = [
    ...(profile.investments || []),
    ...(profile.savingsContributions || [])
  ];
  
  if (allItems.length === 0) return false;
  
  return allItems.some(inv => {
    // 1. Vérification par ID strict (ex: 'pea', 'av')
    if ((inv as any).type && typeKeys.includes((inv as any).type)) return true;
    
    // 2. Vérification par mot-clé dans le nom (Fallback)
    const nameLower = (inv.name || '').toLowerCase();
    return typeKeys.some(key => {
      if (key === 'pea') return nameLower.includes('pea') || nameLower.includes('plan epargne action');
      if (key === 'av') return nameLower.includes('assurance') || nameLower.includes('vie') || nameLower.includes('av ');
      if (key === 'crypto') return nameLower.includes('crypto') || nameLower.includes('bitcoin') || nameLower.includes('eth');
      if (key === 'scpi') return nameLower.includes('scpi') || nameLower.includes('civil') || nameLower.includes('immo');
      if (key === 'per') return nameLower.includes('per') || nameLower.includes('retraite');
      if (key === 'livret') return nameLower.includes('livret') || nameLower.includes('ldd') || nameLower.includes('lep');
      return nameLower.includes(key);
    });
  });
};

// ============================================================================
// 3. GESTION DES OBJECTIFS & BUDGET
// ============================================================================

export const calculateMonthlyEffort = (goal: Goal): number => {
  if (!goal.targetAmount || !goal.deadline) return 0;
  const targetDate = new Date(goal.deadline);
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
        projection.push({ month: i, date: addMonths(today, i), balance: Math.round(balance), contributed: Math.round(contributed), interests: Math.round(interests) });
    }
    return { projection, summary: { totalPocket: Math.round(contributed), totalInterests: Math.round(interests), finalAmount: Math.round(balance) }};
};

export const analyzeGoalStrategies = (goal: Goal, effort: number, capacity: number, income: number, globalSavings: number, rates: SimulationRates): GoalDiagnosis => {
    const gap = effort - capacity;
    const target = safeFloat(goal.targetAmount);
    const inflationGap = calculateInflationImpact(target, new Date(goal.deadline), rates.INFLATION) - target;
    let status: GoalDiagnosis['status'] = 'POSSIBLE';
    let mainMessage = "Budget OK.";
    let color = 'green';
    const strategies: GoalStrategy[] = [];

    if (effort > income) { status = 'IMPOSSIBLE'; color = 'black'; mainMessage = "Impossible."; }
    else if (gap > 0) { status = 'HARD'; color = 'red'; mainMessage = `Manque ${Math.round(gap)}€/mois.`; }

    if (inflationGap > target * 0.05) strategies.push({ type: 'INCOME', title: 'Inflation', message: `Coût réel futur : +${Math.round(inflationGap)}€.` });

    if (status === 'HARD') {
        const deposit = Math.min(globalSavings, target * 0.3);
        if (globalSavings > 1000) strategies.push({ type: 'BUDGET', title: "Apport", message: `Injecter ${Math.round(deposit)}€ d'épargne.`, value: deposit });
        const months = calculateCompoundMonths(target - safeFloat(goal.currentSaved), capacity, safeFloat(goal.projectedYield));
        if (months < 360) strategies.push({ type: 'TIME', title: 'Patienter', message: `Possible en ${addMonths(new Date(), months).toLocaleDateString('fr-FR', {month:'short', year:'2-digit'})}.` });
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
        allocations.push({ id: g.id, name: g.name, tier: 'GROWTH', requestedEffort: req, allocatedEffort: alloc, status: alloc >= req ? 'FULL' : 'PARTIAL', fillRate: req > 0 ? Math.round(alloc/req*100) : 100 });
    }
    return { allocations, totalAllocated: max - available };
};

// ============================================================================
// 4. ORCHESTRATEUR (MOTEUR PRINCIPAL)
// ============================================================================

export const computeFinancialPlan = (profile: Profile, customRates?: Partial<SimulationRates>): SimulationResult => {
  const RATES = { ...FINANCIAL_KNOWLEDGE.RATES, ...customRates };
  
  // Calculs de base
  const income = calculateListTotal(profile.incomes);
  let housingCost = 0;
  if (profile.housing?.status === 'tenant' || profile.housing?.status === 'owner_loan') {
      housingCost = safeFloat(profile.housing?.monthlyCost);
  }
  const annualExpensesTotal = calculateListTotal(profile.annualExpenses);
  const fixed = calculateListTotal(profile.fixedCosts) + housingCost + annualExpensesTotal + calculateListTotal(profile.credits) + calculateListTotal(profile.subscriptions);
  const variable = calculateListTotal(profile.variableCosts || []);
  const funBudget = safeFloat(profile.funBudget); 
  const manualSavings = calculateListTotal(profile.savingsContributions);
  
  const mandatoryAndVital = fixed + variable;
  const rawCapacity = income - mandatoryAndVital - funBudget;
  const endOfMonthBalance = rawCapacity - manualSavings;
  const totalSavingsCapacity = Math.max(0, rawCapacity);
  const netCashflow = Math.max(0, totalSavingsCapacity - manualSavings);

  // Patrimoine (Récupération des valeurs pré-calculées par la page profil)
  const matelas = safeFloat(profile.savings);
  const investedStock = safeFloat(profile.investedAmount);
  const currentBalance = safeFloat(profile.currentBalance);
  const totalWealth = matelas + investedStock + currentBalance;

  // KPIs
  const burnRate = mandatoryAndVital + Math.min(funBudget, 500); 
  const safetyMonths = burnRate > 0 ? matelas / burnRate : 0;
  const debtTotal = calculateListTotal(profile.credits) + (profile.housing?.status === 'owner_loan' ? housingCost : 0);
  const debtRatio = income > 0 ? (debtTotal / income) * 100 : 0;

  // Allocation
  const { allocations, totalAllocated } = distributeGoals(profile.goals || [], netCashflow);

  return {
    budget: { 
      income, fixed, variable, variableExpenses: variable, monthlyIncome: income, mandatoryExpenses: fixed, discretionaryExpenses: funBudget,
      capacityToSave: totalSavingsCapacity, rawCapacity, endOfMonthBalance, profitableExpenses: manualSavings + totalAllocated, 
      totalRecurring: fixed + variable + manualSavings, remainingToLive: Math.max(0, income - mandatoryAndVital - manualSavings), 
      realCashflow: netCashflow, matelas, investments: investedStock, totalWealth, safetyMonths, engagementRate: debtRatio,
      rules: PERSONA_PRESETS.SALARIED.rules, securityBuffer: 0, availableForProjects: 0, currentBalance, capacity: totalSavingsCapacity, totalGoalsEffort: totalAllocated
    },
    allocations, freeCashFlow: netCashflow, usedRates: RATES
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
// 5. LE DOCTEUR FINANCIER V2 (SMART RECOMMENDATION EDITION)
// ============================================================================

export const analyzeProfileHealth = (
    profile: Profile, 
    context: SimulationResult['budget'],
    customRates?: Partial<SimulationRates>
): DeepAnalysis => {
  
  const RATES = { ...FINANCIAL_KNOWLEDGE.RATES, ...customRates };
  const opps: OptimizationOpportunity[] = [];
  const tags: string[] = [];
  
  const { safetyMonths, engagementRate } = context;
  const totalIncome = Math.max(1, context.monthlyIncome);
  const needsTotal = context.fixed + (context.variableExpenses || 0);
  const rawCapacity = context.rawCapacity; 
  const endOfMonthBalance = context.endOfMonthBalance;

  // --- PORTE 1 : SURVIE (URGENCES) ---
  if (endOfMonthBalance < 0) {
      if (rawCapacity < 0) {
          return {
              globalScore: 10, tags: ["DANGER"], ratios: { needs: 100, wants: 0, savings: 0 }, projections: { wealth10y: 0, wealth20y: 0, fireYear: 99 },
              opportunities: [{ id: 'CRITICAL_DEFICIT', type: 'BUDGET', level: 'CRITICAL', title: 'URGENCE ABSOLUE', message: `Déficit structurel de ${formatCurrency(rawCapacity)}.`, guide: ACTION_GUIDES.BUDGET_CUT }]
          };
      } else {
          return {
              globalScore: 30, tags: ["SURCHAUFFE"], ratios: { needs: 60, wants: 20, savings: 20 }, projections: { wealth10y: 0, wealth20y: 0, fireYear: 99 },
              opportunities: [{ id: 'OVER_INVEST', type: 'INVESTMENT', level: 'CRITICAL', title: 'Surchauffe', message: `Vous investissez trop (${formatCurrency(context.profitableExpenses)}) par rapport à vos moyens.`, guide: ACTION_GUIDES.BUDGET_CUT }]
          };
      }
  }

  // --- PORTE 2 : SÉCURITÉ (MATELAS) ---
  const savings = safeFloat(context.matelas);
  const isFreelance = profile.persona === 'freelance';
  const targetMonths = isFreelance ? 6 : 3;
  const idealSafety = (needsTotal + Math.min(context.discretionaryExpenses, 500)) * targetMonths;

  if (savings < FINANCIAL_KNOWLEDGE.THRESHOLDS.SURVIVAL_BUFFER) {
    opps.push({
      id: 'safety_danger', type: 'SAVINGS', level: 'CRITICAL',
      title: 'Zone Rouge', message: `Pas d'épargne de précaution.`,
      guide: ACTION_GUIDES.LIVRET_OPEN // Pas de matelas = on ouvre un livret
    });
  } else if (savings < idealSafety) {
    // Il a un peu de sous, mais pas assez. A-t-il déjà un Livret ?
    if (hasAsset(profile, ['livret', 'ldd', 'lep'])) {
      opps.push({
        id: 'safety_boost', type: 'SAVINGS', level: isFreelance ? 'CRITICAL' : 'WARNING',
        title: 'Sécurité Fragile', message: `Renforcez vos livrets pour atteindre ${targetMonths} mois (${formatCurrency(idealSafety)}).`,
        guide: ACTION_GUIDES.LIVRET_BOOST // Il a déjà un début, on booste
      });
    } else {
      opps.push({
        id: 'safety_build', type: 'SAVINGS', level: isFreelance ? 'CRITICAL' : 'WARNING',
        title: 'Sécurité Fragile', message: `Visez ${targetMonths} mois (${formatCurrency(idealSafety)}).`,
        guide: ACTION_GUIDES.LIVRET_OPEN
      });
    }
  }

  if (engagementRate > FINANCIAL_KNOWLEDGE.THRESHOLDS.HCSF_DEBT_RATIO) {
      opps.push({
          id: 'debt_alert', type: 'DEBT', level: 'WARNING',
          title: 'Surchauffe Crédit',
          message: `Endettement à ${Math.round(engagementRate)}%. Attention au refus bancaire futur.`,
          guide: ACTION_GUIDES.DETTE
      });
  }

  // --- PORTE 3 : INVESTISSEMENT & OPTIMISATION (SMART LOGIC) ---
  const cash = safeFloat(context.currentBalance);
  const invested = context.investments;
  const totalWealth = context.totalWealth;
  
  // A. TROP DE CASH (CASH DRAG)
  if (savings >= idealSafety && cash > context.fixed * 1.5) {
       const overflow = cash - context.fixed * 1.5;
       
       let guideToUse = ACTION_GUIDES.PEA_OPEN; // Par défaut : Ouvre un PEA
       let msg = `L'inflation mange vos ${formatCurrency(overflow)}. Placez-les.`;

       if (hasAsset(profile, ['pea'])) {
           guideToUse = ACTION_GUIDES.PEA_BOOST; // Il a un PEA -> On booste
           msg = `Vos ${formatCurrency(overflow)} dorment. Envoyez-les vers votre PEA.`;
       } else if (hasAsset(profile, ['av'])) {
           guideToUse = ACTION_GUIDES.AV_BOOST; // Pas de PEA mais une AV -> On booste l'AV
           msg = `Vos ${formatCurrency(overflow)} dorment. Renforcez votre Assurance Vie.`;
       }

       opps.push({
          id: 'cash_drag', type: 'INVESTMENT', level: 'INFO',
          title: 'Argent qui dort', message: msg,
          guide: guideToUse, potentialGain: overflow * 0.05 
       });
  }

  // B. INVESTISSEUR DÉBUTANT (LATE STARTER)
  const age = safeFloat(profile.age) || 30;
  if (age > 25 && invested < 1000 && savings > 3000) {
      let guideToUse = ACTION_GUIDES.PEA_OPEN;
      if (hasAsset(profile, ['pea'])) guideToUse = ACTION_GUIDES.PEA_BOOST; // Cas rare (a un PEA vide)

      opps.push({
          id: 'late_starter', type: 'INVESTMENT', level: 'WARNING',
          title: 'Réveil nécessaire', message: `Votre argent stagne. Commencez l'investissement.`,
          guide: guideToUse
      });
  }

  // C. OPTIMISATION FISCALE (PER)
  if (totalIncome > 3500 && invested < 20000) {
      if (hasAsset(profile, ['per'])) {
          opps.push({ 
             id: 'tax_optim_boost', type: 'INVESTMENT', level: 'INFO', 
             title: 'Défiscalisation', message: 'Optimisez vos versements PER avant fin d\'année.', 
             guide: ACTION_GUIDES.PER_BOOST 
          });
      } else {
          opps.push({ 
             id: 'tax_optim_open', type: 'INVESTMENT', level: 'INFO', 
             title: 'Trop d\'impôts ?', message: 'Avec vos revenus, le PER devient très intéressant.', 
             guide: ACTION_GUIDES.PER_OPEN 
          });
      }
  }
  
  // D. LEP (Le Cheat Code)
  const isEligibleLEP = (profile.household?.adults === 1 && totalIncome * 12 < FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_SINGLE) ||
                        (profile.household?.adults >= 2 && totalIncome * 12 < FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_COUPLE);
  
  if (isEligibleLEP && savings < 10000) {
      if (!hasAsset(profile, ['lep', 'populaire'])) {
          opps.push({
              id: 'lep_opp', type: 'SAVINGS', level: 'SUCCESS',
              title: 'Droit au LEP', message: `Livret à 5% net disponible. Foncez.`,
              guide: ACTION_GUIDES.LEP_OPEN,
              potentialGain: (10000 - savings) * 0.02
          });
      }
  }

  // E. DIVERSIFICATION (SCPI / CRYPTO)
  if (totalWealth > 50000 && invested > 10000) {
      if (!hasAsset(profile, ['crypto']) && (profile.age as number) < 40) {
          opps.push({
              id: 'div_crypto', type: 'INVESTMENT', level: 'INFO',
              title: 'Diversification Crypto', message: 'Allouez 1% à 5% de votre patrimoine aux actifs numériques.',
              guide: ACTION_GUIDES.CRYPTO_OPEN
          });
      } else if (hasAsset(profile, ['crypto'])) {
          opps.push({
              id: 'div_crypto_boost', type: 'INVESTMENT', level: 'INFO',
              title: 'Sécuriser Crypto', message: 'Pensez à sécuriser vos gains crypto sur un Cold Wallet.',
              guide: ACTION_GUIDES.CRYPTO_BOOST
          });
      }

      if (!hasAsset(profile, ['scpi', 'immo']) && !profile.housing?.status.includes('owner')) {
          opps.push({
              id: 'div_scpi', type: 'INVESTMENT', level: 'INFO',
              title: 'Immobilier Papier', message: 'Ajoutez de la pierre à votre patrimoine sans gestion.',
              guide: ACTION_GUIDES.SCPI_OPEN
          });
      }
  }

  // --- SCORING FINAL ---
  let score = 100;
  const needsRatio = Math.round((needsTotal / totalIncome) * 100);
  const wantsRatio = Math.round((context.discretionaryExpenses / totalIncome) * 100);
  const savingsRatio = Math.round((context.capacityToSave / totalIncome) * 100);

  if (needsRatio > 55) score -= (needsRatio - 55) * 1.5;
  if (wantsRatio > 30) score -= (wantsRatio - 30);
  if (savingsRatio > 20) score += 5;
  
  if (savingsRatio > 25) tags.push("Fourmi");
  else if (wantsRatio > 40) tags.push("Cigale");
  if (invested > savings * 0.5) tags.push("Investisseur");

  const wealth10y = simulateFutureWealth(totalWealth, context.capacityToSave, 10, RATES.MARKET_AVG);
  const wealth20y = simulateFutureWealth(totalWealth, context.capacityToSave, 20, RATES.MARKET_AVG);

  return {
    globalScore: Math.max(0, Math.min(100, Math.round(score))),
    tags: [...new Set(tags)],
    ratios: { needs: needsRatio, wants: wantsRatio, savings: savingsRatio },
    projections: { wealth10y, wealth20y, fireYear: 99 },
    opportunities: opps.sort((a, b) => {
        const levels: Record<string, number> = { 'CRITICAL': 0, 'WARNING': 1, 'SUCCESS': 2, 'INFO': 3 };
        return levels[a.level] - levels[b.level];
    })
  };
};
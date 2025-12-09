// app/lib/engine.ts
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
    MIN_RAV: 900 // Reste à vivre minimum vital
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
  // --- NIVEAU 1 : SÉCURITÉ & TRÉSORERIE ---
  
  LEP: { 
    title: "Ouvrir un Livret d'Épargne Populaire (LEP)", 
    definition: "Le placement sans risque le plus rentable de France (net d'impôt). Réservé aux revenus modestes.", 
    steps: [
      "Retrouver votre dernier avis d'imposition (Revenu Fiscal de Référence).", 
      "Vérifier l'éligibilité (Plafond env. 22k€ pour 1 part, 34k€ pour 2 parts).", 
      "Prendre rendez-vous avec votre banque (ou changer si elle ne le propose pas)."
    ], 
    tips: [
      "Même si vous ne payez pas d'impôts, déclarez vos revenus pour avoir l'avis d'imposition nécessaire.",
      "Plafond de versement : 10 000€."
    ],
    difficulty: 'Facile',
    impact: 'Immédiat'
  },

  MATELAS: { 
    title: "Constituer son Épargne de Précaution", 
    definition: "Votre pare-feu contre les imprévus (panne auto, chômage, santé). C'est la priorité n°1 avant d'investir.", 
    steps: [
      "Calculer 3 mois de dépenses contraintes (Loyer + Courses + Factures).", 
      "Ouvrir un Livret A ou un LDDS dédié uniquement à ça.", 
      "Mettre en place un virement automatique (ex: 50€) dès le début du mois."
    ], 
    tips: [
      "Ne touchez JAMAIS à cet argent pour des loisirs ou des vacances.",
      "Si vous puisez dedans, la priorité absolue est de le reconstituer."
    ],
    difficulty: 'Moyen',
    impact: 'Immédiat'
  },

  // --- NIVEAU 2 : ASSAINISSEMENT ---

  DETTE: { 
    title: "Éradiquer les Mauvaises Dettes", 
    definition: "Les crédits conso (revolving) coûtent plus cher que ce que l'épargne rapporte. S'en débarrasser est le meilleur investissement.", 
    steps: [
      "Lister toutes les dettes avec leur taux d'intérêt et capital restant.", 
      "Méthode Avalanche : Rembourser en priorité la dette avec le taux le plus élevé.", 
      "Méthode Boule de Neige : Rembourser la plus petite dette pour se motiver psychologiquement."
    ], 
    tips: [
      "Contactez les créanciers pour négocier un échelonnement si besoin.",
      "Coupez les cartes de crédit revolving."
    ],
    difficulty: 'Difficile',
    impact: 'Immédiat'
  },

  BUDGET_CUT: { 
    title: "Optimiser les Charges Fixes", 
    definition: "Récupérer du pouvoir d'achat sans baisser son niveau de vie, juste en arrêtant de payer pour rien.", 
    steps: [
      "Lister les abonnements récurrents (Netflix, Salle de sport, Box).", 
      "Utiliser la Loi Hamon pour changer d'assurance auto/habitation (souvent -20% de gain).", 
      "Appeler son opérateur mobile/internet pour menacer de partir."
    ], 
    tips: [
      "Supprimez les abonnements que vous n'avez pas utilisés depuis 30 jours.",
      "Utilisez des comparateurs en ligne (LeLynx, LesFurets...)."
    ],
    difficulty: 'Facile',
    impact: 'Immédiat'
  },

  // --- NIVEAU 3 : INVESTISSEMENT LONG TERME ---

  INVEST_START: { 
    title: "Démarrer l'investissement", 
    definition: "Faire travailler son argent pour battre l'inflation.", 
    steps: [
      "Ouvrir une Assurance Vie ou un PEA.", 
      "Mettre 50€/mois en DCA (versement programmé).", 
      "Ne pas regarder les courbes tous les jours."
    ], 
    tips: [
      "Le temps est votre meilleur allié.",
      "Commencez petit, mais commencez maintenant."
    ],
    difficulty: 'Moyen',
    impact: 'Long terme'
  },

  PEA: { 
    title: "Ouvrir un PEA (Plan Épargne Actions)", 
    definition: "L'enveloppe fiscale royale pour investir en Bourse avec une fiscalité adoucie après 5 ans.", 
    steps: [
      "Choisir un courtier en ligne ou une banque en ligne (frais < 0.5% par ordre).", 
      "Ouvrir le compte pour 'prendre date' (le compteur fiscal de 5 ans démarre).", 
      "Mettre en place un versement mensuel programmé (DCA)."
    ], 
    tips: [
      "Fuyez les grandes banques traditionnelles (frais de garde trop élevés).",
      "Privilégiez les ETF Monde (MSCI World) pour diversifier sans effort."
    ],
    difficulty: 'Moyen',
    impact: 'Long terme'
  },

  AV_FONDS_EUROS: {
    title: "Ouvrir une Assurance Vie (Fonds Euros)",
    definition: "Le couteau suisse de l'épargne. Plus souple que le PER, plus rentable que le Livret A (sur les bons contrats).",
    steps: [
      "Comparer les contrats : 0€ frais d'entrée, 0€ frais d'arbitrage.",
      "Vérifier le rendement du Fonds Euros sur les 3 dernières années.",
      "Désigner proprement sa clause bénéficiaire (transmission)."
    ],
    tips: [
      "Idéal pour les projets à moyen terme (achat immo dans 3-5 ans).",
      "Évitez les contrats proposés par votre banquier (souvent chargés en frais)."
    ],
    difficulty: 'Moyen',
    impact: 'Long terme'
  },

  SCPI: {
    title: "Investir en SCPI (Pierre-Papier)",
    definition: "Devenir propriétaire immobilier sans gérer les locataires ni les fuites d'eau.",
    steps: [
      "Définir si on achète en direct (revenus complémentaires) ou dans une Assurance Vie (capitalisation).",
      "Diversifier sur 2 ou 3 SCPI (Santé, Logistique, Bureaux).",
      "Étudier l'achat à crédit pour profiter de l'effet de levier."
    ],
    tips: [
      "Attention aux frais d'entrée élevés (env. 10%). C'est un placement sur 8-10 ans minimum.",
      "Les revenus sont imposés comme des revenus fonciers (attention à la tranche d'impôt)."
    ],
    difficulty: 'Difficile',
    impact: 'Long terme'
  },

  // --- NIVEAU 4 : OPTIMISATION FISCALE & REVENUS ---

  PER: {
    title: "Ouvrir un PER (Plan Épargne Retraite)",
    definition: "Bloquer de l'argent pour la retraite en réduisant ses impôts aujourd'hui. Puissant si vous payez beaucoup d'impôts.",
    steps: [
      "Vérifier votre Tranche Marginale d'Imposition (TMI). Intéressant surtout si TMI ≥ 30%.",
      "Calculer le plafond de déduction disponible sur votre avis d'impôt.",
      "Choisir un PER en gestion libre avec des frais bas (ETF)."
    ],
    tips: [
      "Attention : l'argent est bloqué jusqu'à la retraite (sauf achat résidence principale).",
      "L'économie d'impôt à l'entrée est 'rendue' à la sortie, mais vous aurez sûrement une TMI plus faible à la retraite."
    ],
    difficulty: 'Difficile',
    impact: 'Long terme'
  },

  SALARY_NEGOTIATION: {
    title: "Négocier une Augmentation",
    definition: "La meilleure façon d'augmenter son épargne n'est pas de moins dépenser, mais de plus gagner.",
    steps: [
      "Lister vos réalisations concrètes des 12 derniers mois.",
      "Faire une étude de marché sur les salaires de votre poste (Glassdoor, LinkedIn).",
      "Solliciter un entretien formel avec votre manager."
    ],
    tips: [
      "Ne parlez pas de vos besoins perso ('J'ai un loyer à payer'), mais de votre valeur pro.",
      "Si le salaire est bloqué, négociez des avantages (télétravail, formation, prime)."
    ],
    difficulty: 'Difficile',
    impact: 'Immédiat'
  }
};

// ============================================================================
// 2. MODULES DE CALCUL
// ============================================================================

const estimateTMI = (netIncome: number, parts: number = 1, isSalaried: boolean = true) => {
    const taxableIncome = netIncome * 12 * (isSalaried ? 0.9 : 1);
    const q = taxableIncome / Math.max(1, parts);
    for (let i = FINANCIAL_KNOWLEDGE.TAX_BRACKETS.length - 1; i >= 0; i--) {
        if (q > FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].t) return FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].r;
    }
    return 0;
};

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

// ============================================================================
// 3. GESTION DES OBJECTIFS
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
export const computeFinancialPlan = (
    profile: Profile, 
    customRates?: Partial<SimulationRates>
): SimulationResult => {
  
  const RATES = { ...FINANCIAL_KNOWLEDGE.RATES, ...customRates };
  
  // 1. REVENUS
  const income = calculateListTotal(profile.incomes);
  
  // 2. CHARGES FIXES
  let housingCost = 0;
  if (profile.housing?.status === 'tenant' || profile.housing?.status === 'owner_loan') {
      housingCost = safeFloat(profile.housing?.monthlyCost);
  }
  const annualExpensesTotal = calculateListTotal(profile.annualExpenses);
  const fixed = calculateListTotal(profile.fixedCosts) + housingCost + annualExpensesTotal + calculateListTotal(profile.credits) + calculateListTotal(profile.subscriptions);
  
  // 3. CHARGES VARIABLES
  const variable = calculateListTotal(profile.variableCosts || []);

  // 4. BUDGET PLAISIR
  const funBudget = safeFloat(profile.funBudget); 

  // 5. FLUX D'INVESTISSEMENT
  const manualSavings = calculateListTotal(profile.savingsContributions);
  
  // 6. CAPACITÉ D'ÉPARGNE & SOLDE (LE CŒUR DU CALCUL)
  const mandatoryAndVital = fixed + variable;
  
  // Capacité Théorique (Revenus - Charges)
  const rawCapacity = income - mandatoryAndVital - funBudget;
  
  // [CRITIQUE] Solde Réel Fin de Mois (Capacité - Investissements forcés)
  // C'est ce chiffre qui détermine si tu es à découvert à cause de tes virements
  const endOfMonthBalance = rawCapacity - manualSavings;

  // Pour l'affichage UI, on garde le 0 minimum pour ne pas casser les graphes
  const totalSavingsCapacity = Math.max(0, rawCapacity);
  
  // 7. CASHFLOW NET (Argent dispo pour les objectifs, après investissements manuels)
  const netCashflow = Math.max(0, totalSavingsCapacity - manualSavings);

  // Allocation des objectifs
  const { allocations, totalAllocated } = distributeGoals(profile.goals || [], netCashflow);
  
  // 8. PATRIMOINE
  const matelas = safeFloat(profile.savings);
  const investedStock = safeFloat(profile.investedAmount);
  const currentBalance = safeFloat(profile.currentBalance);
  const totalWealth = matelas + investedStock + currentBalance;

  // KPIs pour le docteur
  const burnRate = mandatoryAndVital + Math.min(funBudget, 500); 
  const safetyMonths = burnRate > 0 ? matelas / burnRate : 0;
  
  const debtTotal = calculateListTotal(profile.credits) + (profile.housing?.status === 'owner_loan' ? housingCost : 0);
  const debtRatio = income > 0 ? (debtTotal / income) * 100 : 0;
  
  const remainingBeforeFun = Math.max(0, income - mandatoryAndVital - manualSavings);

  return {
    budget: { 
      income, 
      fixed, 
      variable, 
      variableExpenses: variable, // Alias pour compatibilité
      monthlyIncome: income, 
      mandatoryExpenses: fixed,
      variableExpenses: variable, 
      discretionaryExpenses: funBudget,
      
      capacityToSave: totalSavingsCapacity, 
      
      // Les deux indicateurs de vérité
      rawCapacity, 
      endOfMonthBalance, 

      profitableExpenses: manualSavings + totalAllocated, 
      
      totalRecurring: fixed + variable + manualSavings, 
      
      remainingToLive: remainingBeforeFun, 
      realCashflow: netCashflow, 
      
      matelas, 
      investments: investedStock, 
      totalWealth,
      safetyMonths, 
      engagementRate: debtRatio,
      rules: PERSONA_PRESETS.SALARIED.rules,
      securityBuffer: 0, 
      availableForProjects: 0,
      currentBalance,
      capacity: totalSavingsCapacity,
      totalGoalsEffort: totalAllocated
    },
    allocations, 
    freeCashFlow: netCashflow,
    usedRates: RATES
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
// 5. LE DOCTEUR FINANCIER V2 (SUPERCHARGED - LOGIC GATES EDITION)
// ============================================================================
export const analyzeProfileHealth = (
    profile: Profile, 
    context: SimulationResult['budget'],
    customRates?: Partial<SimulationRates>
): DeepAnalysis => {
  
  const RATES = { ...FINANCIAL_KNOWLEDGE.RATES, ...customRates };
  const opps: OptimizationOpportunity[] = [];
  const tags: string[] = [];
  
  // Données de base
  const { safetyMonths, engagementRate } = context;
  const totalIncome = Math.max(1, context.monthlyIncome);
  const needsTotal = context.fixed + (context.variableExpenses || 0);
  
  // On récupère les deux indicateurs clés
  const rawCapacity = context.rawCapacity; 
  const endOfMonthBalance = context.endOfMonthBalance;

  // =================================================================
  // PORTE 1 : SURVIE & TRÉSORERIE (KILL SWITCH)
  // On vérifie si le compte finit dans le rouge, quelle qu'en soit la cause.
  // =================================================================
  
  if (endOfMonthBalance < 0) {
      // CAS A : DÉFICIT STRUCTUREL (On vit au-dessus de ses moyens avant même d'épargner)
      if (rawCapacity < 0) {
          return {
              globalScore: 10,
              tags: ["DANGER", "DÉFICIT"],
              ratios: { 
                needs: Math.round((needsTotal / totalIncome) * 100), 
                wants: Math.round((context.discretionaryExpenses / totalIncome) * 100), 
                savings: 0 
              },
              projections: { wealth10y: 0, wealth20y: 0, fireYear: 99 },
              opportunities: [{
                 id: 'CRITICAL_DEFICIT', type: 'BUDGET', level: 'CRITICAL',
                 title: 'URGENCE ABSOLUE',
                 message: `Vous vivez au-dessus de vos moyens. Déficit : ${formatCurrency(rawCapacity)}.`,
                 guide: ACTION_GUIDES.BUDGET_CUT,
                 potentialGain: Math.abs(rawCapacity) * 12
              }]
          };
      } 
      // CAS B : SURCHAUFFE D'INVESTISSEMENT (On investit l'argent qu'on n'a pas)
      else {
          const investAmount = context.profitableExpenses; // Montant investi
          return {
              globalScore: 30, // Score faible car situation intenable
              tags: ["SURCHAUFFE", "DÉFICIT"],
              ratios: { 
                  needs: Math.round((needsTotal / totalIncome) * 100), 
                  wants: Math.round((context.discretionaryExpenses / totalIncome) * 100), 
                  savings: Math.round((investAmount / totalIncome) * 100)
              },
              projections: { wealth10y: 0, wealth20y: 0, fireYear: 99 },
              opportunities: [{
                 id: 'OVER_INVESTMENT', type: 'INVESTMENT', level: 'CRITICAL',
                 title: 'Surchauffe Investissement',
                 message: `Vous investissez trop (${formatCurrency(investAmount)}) par rapport à votre reste à vivre. Vous êtes à découvert de ${formatCurrency(endOfMonthBalance)}. Réduisez vos versements.`,
                 guide: ACTION_GUIDES.BUDGET_CUT,
                 potentialGain: Math.abs(endOfMonthBalance) * 12
              }]
          };
      }
  }

  // 1.2 Le Reste à Vivre (Pauvreté)
  const rav = totalIncome - context.fixed; 
  if (rav < FINANCIAL_KNOWLEDGE.THRESHOLDS.MIN_RAV) {
      return {
          globalScore: 20,
          tags: ["SURVIE"],
          ratios: { needs: 100, wants: 0, savings: 0 },
          projections: { wealth10y: 0, wealth20y: 0, fireYear: 99 },
          opportunities: [{
             id: 'CRITICAL_POVERTY', type: 'BUDGET', level: 'CRITICAL',
             title: 'Reste à vivre critique',
             message: `Il vous reste moins de ${FINANCIAL_KNOWLEDGE.THRESHOLDS.MIN_RAV}€ pour vivre après vos charges fixes.`,
             guide: ACTION_GUIDES.BUDGET_CUT
          }]
      };
  }

  // =================================================================
  // PORTE 2 : SÉCURITÉ (SAFETY CHECK & CAPPING)
  // =================================================================
  
  let scoreCap = 100; 
  const isFreelance = profile.persona === 'freelance';
  const targetMonths = isFreelance ? 6 : 3;
  const idealSafety = (needsTotal + Math.min(context.discretionaryExpenses, 500)) * targetMonths;
  const savings = safeFloat(context.matelas);

  if (savings < FINANCIAL_KNOWLEDGE.THRESHOLDS.SURVIVAL_BUFFER) {
    scoreCap = 30;
    opps.push({
      id: 'safety_danger', type: 'SAVINGS', level: 'CRITICAL',
      title: 'Zone Rouge', message: `Pas d'épargne de précaution. Priorité absolue : mettre 1000€ de côté.`,
      guide: ACTION_GUIDES.MATELAS
    });
  } else if (savings < idealSafety) {
    scoreCap = 60;
    const level = isFreelance ? 'CRITICAL' : 'WARNING';
    opps.push({
      id: 'safety_build', type: 'SAVINGS', level: level,
      title: 'Sécurité Fragile',
      message: `Visez ${targetMonths} mois de charges (${formatCurrency(idealSafety)}) pour être serein.`,
      guide: ACTION_GUIDES.MATELAS
    });
  }

  if (engagementRate > FINANCIAL_KNOWLEDGE.THRESHOLDS.HCSF_DEBT_RATIO) {
      scoreCap = Math.min(scoreCap, 50); 
      opps.push({
          id: 'debt_alert', type: 'DEBT', level: 'WARNING',
          title: 'Surchauffe Crédit',
          message: `Endettement à ${Math.round(engagementRate)}%. Attention au refus bancaire futur.`,
          guide: ACTION_GUIDES.DETTE
      });
  }

  // =================================================================
  // PORTE 3 : PERFORMANCE & OPTIMISATION
  // =================================================================

  const cash = safeFloat(context.currentBalance);
  const invested = context.investments;
  const totalWealth = context.totalWealth;
  const age = safeFloat(profile.age) || 30;

  const needsRatio = Math.round((needsTotal / totalIncome) * 100);
  const wantsRatio = Math.round((context.discretionaryExpenses / totalIncome) * 100);
  const savingsRatio = Math.round((context.capacityToSave / totalIncome) * 100);

  const fireData = calculateFIRE((needsTotal + context.discretionaryExpenses) * 12, totalWealth, context.capacityToSave, RATES);
  const wealth10y = simulateFutureWealth(totalWealth, context.capacityToSave, 10, RATES.MARKET_AVG);
  const wealth20y = simulateFutureWealth(totalWealth, context.capacityToSave, 20, RATES.MARKET_AVG);

  if (savings >= idealSafety && cash > context.fixed * 1.5) {
       const overflow = cash - context.fixed * 1.5;
       opps.push({
          id: 'cash_drag', type: 'INVESTMENT', level: 'INFO',
          title: 'Argent qui dort',
          message: `Vous perdez de l'argent (inflation). Placez ces ${formatCurrency(overflow)}.`,
          guide: ACTION_GUIDES.PEA,
          potentialGain: overflow * 0.05 
       });
  }

  if (age > 30 && invested < 1000 && savings > 5000) {
      opps.push({
          id: 'late_starter', type: 'INVESTMENT', level: 'WARNING',
          title: 'Réveil nécessaire',
          message: `Votre argent stagne. Commencez l'investissement maintenant.`,
          guide: ACTION_GUIDES.INVEST_START
      });
  }

  if (totalIncome > 4000 && invested < 5000) {
      opps.push({ 
          id: 'tax_optim', type: 'INVESTMENT', level: 'INFO', 
          title: 'Défiscalisation', 
          message: 'Revenus élevés : regardez le PER.', 
          guide: ACTION_GUIDES.PER, // Nouveau guide connecté
          potentialGain: 1000 
      });
  }

  const isEligibleLEP = (profile.household?.adults === 1 && totalIncome * 12 < FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_SINGLE) ||
                        (profile.household?.adults >= 2 && totalIncome * 12 < FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_COUPLE);
  
  if (isEligibleLEP && savings < 10000) {
      opps.push({
          id: 'lep_opp', type: 'SAVINGS', level: 'SUCCESS',
          title: 'Droit au LEP', message: `Livret à 5% net disponible. Foncez.`,
          guide: ACTION_GUIDES.LEP,
          potentialGain: (10000 - savings) * (0.05 - 0.03) 
      });
  }

  // =================================================================
  // SCORING FINAL
  // =================================================================
  let score = 100;
  
  if (needsRatio > 55) score -= (needsRatio - 55) * 1.5;
  if (wantsRatio > 30) score -= (wantsRatio - 30);
  
  if (savingsRatio > 20) score += 5;
  if (invested > savings && safetyMonths > targetMonths) score += 5;

  score = Math.min(score, scoreCap);

  if (savingsRatio > 25) tags.push("Fourmi");
  else if (wantsRatio > 40) tags.push("Cigale");
  if (invested > savings * 0.5) tags.push("Investisseur");
  if (scoreCap < 50) tags.push("Fragile");

  return {
    globalScore: Math.max(0, Math.min(100, Math.round(score))),
    tags: [...new Set(tags)],
    ratios: { needs: needsRatio, wants: wantsRatio, savings: savingsRatio },
    projections: { wealth10y, wealth20y, fireYear: fireData.years },
    opportunities: opps.sort((a, b) => {
        const levels: Record<string, number> = { 'CRITICAL': 0, 'WARNING': 1, 'SUCCESS': 2, 'INFO': 3 };
        return levels[a.level] - levels[b.level];
    })
  };
};
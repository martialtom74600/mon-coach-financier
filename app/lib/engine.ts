import { differenceInMonths, isValid, addMonths, addYears, isSameMonth } from 'date-fns';
import { 
  Profile, Goal, SimulationResult, GoalDiagnosis, GoalStrategy, 
  DeepAnalysis, OptimizationOpportunity, 
  safeFloat, calculateListTotal, formatCurrency, 
  CONSTANTS, GOAL_CATEGORIES, PERSONA_PRESETS 
} from './definitions';

// ============================================================================
// 1. BASE DE CONNAISSANCE (Le "Cerveau" Statique)
// ============================================================================
const FINANCIAL_KNOWLEDGE = {
  RATES: { 
    INFLATION: 0.025,    // 2.5%
    LIVRET_A: 0.03,      // 3.0%
    LEP: 0.05,           // 5.0%
    MARKET_AVG: 0.07,    // 7.0%
    SAFE_WITHDRAWAL: 0.04 // 4.0%
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

// GUIDES PÉDAGOGIQUES
const ACTION_GUIDES = {
  LEP: {
    title: "Ouvrir un Livret d'Épargne Populaire (LEP)",
    definition: "Le LEP est le livret réglementé le plus rentable (5% net d'impôt). Il est réservé aux revenus modestes et permet de protéger votre épargne de l'inflation sans aucun risque.",
    steps: [
      "Munissez-vous de votre dernier avis d'imposition (N-1 ou N-2).",
      "Vérifiez votre Revenu Fiscal de Référence (RFR) sur l'avis.",
      "Contactez votre banque (messagerie ou RDV) pour demander l'ouverture.",
      "Si votre banque refuse alors que vous êtes éligible, insistez : c'est un droit."
    ],
    tips: ["Plafond : 10 000€", "Taux : 5.0% Net", "L'argent reste disponible à tout moment."]
  },
  PEA: {
    title: "Ouvrir un Plan Épargne Actions (PEA)",
    definition: "Le PEA est une enveloppe fiscale qui permet d'investir en bourse avec une fiscalité très avantageuse après 5 ans. C'est l'outil roi pour le long terme.",
    steps: [
      "Choisissez une banque en ligne ou un courtier (Boursorama, Fortuneo, Bourse Direct...) pour éviter les frais abusifs.",
      "Ouvrez le compte en ligne (10 minutes, justificatif d'identité + domicile).",
      "Faites un premier virement (même 10€) pour 'prendre date' fiscale.",
      "Programmez un virement automatique mensuel pour lisser les risques."
    ],
    tips: ["Zéro impôt sur les gains après 5 ans (juste les prélèvements sociaux 17.2%)", "Ne paniquez pas si ça baisse, visez 10 ans minimum."]
  },
  MATELAS: {
    title: "Constituer son Épargne de Précaution",
    definition: "C'est votre pare-choc financier. Une somme d'argent disponible immédiatement pour couvrir les coups durs (panne auto, chômage...) sans s'endetter.",
    steps: [
      "Ouvrez un Livret A ou un LDDS dédié uniquement à ça.",
      "Visez d'abord 1000€ de 'Sécurité Totale'.",
      "Ensuite, visez 3 mois de charges fixes.",
      "Ne touchez JAMAIS à cet argent pour des plaisirs ou des cadeaux."
    ],
    tips: ["Automatisez le virement en début de mois (Payez-vous en premier)."]
  },
  DETTE: {
    title: "Solder une dette toxique",
    definition: "Un crédit consommation coûte souvent plus cher (4-10%) que ce que votre épargne vous rapporte (3%). Rembourser, c'est gagner de l'argent à coup sûr.",
    steps: [
      "Listez vos crédits et triez-les par taux d'intérêt décroissant.",
      "Contactez l'organisme pour demander le montant exact pour un remboursement anticipé total ou partiel.",
      "Utilisez votre épargne excédentaire (au-delà du matelas de sécurité) pour solder le plus petit crédit en premier.",
      "Redirigez la mensualité libérée vers le crédit suivant (Boule de neige)."
    ],
    tips: ["Pas de pénalités si remboursement < 10 000€ sur 12 mois glissants."]
  }
};

// ============================================================================
// 2. MODULES DE CALCUL
// ============================================================================

const estimateTMI = (netIncome: number, parts: number = 1) => {
    const q = (netIncome * 12 * 0.9) / parts; 
    for (let i = FINANCIAL_KNOWLEDGE.TAX_BRACKETS.length - 1; i >= 0; i--) {
        if (q > FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].t) return FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].r;
    }
    return 0;
};

const calculateFIRE = (annualExpenses: number, currentWealth: number, monthlySavings: number) => {
    if (monthlySavings <= 0) return { years: 99, date: null };
    const target = annualExpenses / FINANCIAL_KNOWLEDGE.RATES.SAFE_WITHDRAWAL;
    if (currentWealth >= target) return { years: 0, date: new Date() };
    
    let wealth = currentWealth;
    let months = 0;
    while (wealth < target && months < 600) { 
        wealth += monthlySavings;
        wealth *= (1 + (FINANCIAL_KNOWLEDGE.RATES.MARKET_AVG / 12));
        months++;
    }
    return { years: Math.round(months / 12), date: addMonths(new Date(), months), target };
};

const simulateFutureWealth = (start: number, monthly: number, years: number) => {
    const r = 0.05 / 12; 
    let total = start;
    for(let i=0; i < years * 12; i++) total = (total + monthly) * (1 + r);
    return Math.round(total);
};

const calculateInflationImpact = (amt: number, date: Date) => {
    const years = differenceInMonths(date, new Date()) / 12;
    return years <= 0 ? amt : amt * Math.pow(1 + FINANCIAL_KNOWLEDGE.RATES.INFLATION, years);
};

const calculateCompoundMonths = (target: number, pmt: number, rate: number) => {
    if (pmt <= 0) return 999;
    if (rate <= 0) return Math.ceil(target / pmt);
    const r = (rate / 100) / 12;
    try { return Math.ceil(Math.log(((target * r) / pmt) + 1) / Math.log(1 + r)); } catch { return 999; }
};

export const simulateCashflowTimeline = (profile: Profile, capacityToSave: number) => {
  const months = 60; 
  let currentCash = safeFloat(profile.savings) + safeFloat(profile.currentBalance);
  const goals = (profile.goals || []).filter(g => g.deadline && g.targetAmount);
  
  for (let i = 1; i <= months; i++) {
    const date = addMonths(new Date(), i);
    currentCash += capacityToSave;
    const goalsHit = goals.filter(g => isSameMonth(new Date(g.deadline), date));
    
    for (const g of goalsHit) {
      currentCash -= safeFloat(g.targetAmount);
      if (currentCash < -500) { 
          return { date, goalName: g.name, deficit: Math.abs(currentCash) };
      }
    }
  }
  return null;
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
    return Math.max(0, (target - fv) * (r / (Math.pow(1 + r, months) - 1)));
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

export const analyzeGoalStrategies = (goal: Goal, effort: number, capacity: number, discretionary: number, income: number, globalSavings: number): GoalDiagnosis => {
    const gap = effort - capacity;
    const target = safeFloat(goal.targetAmount);
    const inflationGap = calculateInflationImpact(target, new Date(goal.deadline)) - target;
    
    let status: GoalDiagnosis['status'] = 'POSSIBLE';
    let mainMessage = "Budget OK.";
    let color = 'green';
    const strategies: GoalStrategy[] = [];

    if (effort > income) { status = 'IMPOSSIBLE'; color = 'black'; mainMessage = "Impossible : dépasse vos revenus."; }
    else if (gap > 0) { status = 'HARD'; color = 'red'; mainMessage = `Manque ${Math.round(gap)}€/mois.`; }

    if (inflationGap > target * 0.05) strategies.push({ type: 'INCOME', title: 'Inflation', message: `Attention, ce projet coûtera réellement +${Math.round(inflationGap)}€ à terme.`, disabled: true });

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
        allocations.push({ id: g.id, name: g.name, tier: 'GROWTH', requestedEffort: req, allocatedEffort: alloc, status: alloc >= req ? 'FULL' : 'PARTIAL', fillRate: req > 0 ? Math.round(alloc/req*100) : 100, message: '' });
    }
    return { allocations, totalAllocated: max - available };
};

// ============================================================================
// 4. ORCHESTRATEUR (CORRIGÉ & ÉPURÉ)
// ============================================================================
export const computeFinancialPlan = (profile: Profile): SimulationResult => {
  const income = calculateListTotal(profile.incomes);
  
  // 1. Logement
  let housingCost = 0;
  if (profile.housing?.status === 'tenant' || profile.housing?.status === 'owner_loan') {
      housingCost = safeFloat(profile.housing?.monthlyCost);
  }

  // 2. Charges Fixes (Mensualisées)
  // Rappel : calculateListTotal gère déjà la fréquence si vos données sont propres
  // (ex: si annualExpenses contient frequency='annuel', calculateListTotal doit le gérer)
  // Si calculateListTotal ne gère pas la fréquence, il faut faire :
  // const annualMonthly = calculateListTotal(profile.annualExpenses) / 12;
  // Mais ici on suppose que votre utilitaire est intelligent ou que vous gérez le /12 si besoin.
  // D'après votre retour précédent, on ne divise PAS une deuxième fois ici.
  const annualExpensesTotal = calculateListTotal(profile.annualExpenses);

  const fixed = calculateListTotal(profile.fixedCosts) 
                + housingCost 
                + annualExpensesTotal 
                + calculateListTotal(profile.credits) 
                + calculateListTotal(profile.subscriptions);
  
  // ✅ FIX 3: Vie Courante (Living Expenses)
  // Plus de foodBudget ou funBudget séparés. Tout est dans "funBudget" (utilisé comme Vie Courante).
  // On renomme la variable locale pour que ce soit clair dans la logique.
  const livingExpenses = safeFloat(profile.funBudget); 

  const manualSavings = calculateListTotal(profile.savingsContributions);
  
  // ✅ FIX 4: Capacité d'épargne (Placements)
  // C'est ce qu'il reste après avoir payé les charges fixes ET la vie courante.
  const capacityToSave = Math.max(0, income - fixed - livingExpenses);
  
  const { allocations, totalAllocated } = distributeGoals(profile.goals || [], capacityToSave);
  const realCashflow = Math.max(0, capacityToSave - totalAllocated);
  
  const matelas = safeFloat(profile.savings);
  
  // Gestion des investissements sous forme de liste
  const investedAmount = Array.isArray(profile.investments) 
        ? calculateListTotal(profile.investments as any) 
        : safeFloat(profile.investments);

  // Burn Rate : De combien j'ai besoin pour vivre (Fixes + Vie courante "de base")
  const burnRate = fixed + Math.min(livingExpenses, 800); 
  const safetyMonths = burnRate > 0 ? matelas / burnRate : 99;
  const engagementRate = income > 0 ? (fixed / income) * 100 : 0;
  
  const totalWealth = matelas + investedAmount + safeFloat(profile.currentBalance);

  return {
    budget: { 
      income, 
      fixed, // Total des charges contraintes
      capacity: capacityToSave, // C'est votre budget "Placements"
      remainingToLive: income - fixed - totalAllocated,
      monthlyIncome: income, 
      mandatoryExpenses: fixed, 
      discretionaryExpenses: livingExpenses, // C'est votre budget "Vie Courante"
      capacityToSave,
      profitableExpenses: manualSavings + totalAllocated, 
      totalGoalsEffort: totalAllocated, 
      totalRecurring: fixed + manualSavings,
      realCashflow: realCashflow, 
      matelas, 
      investments: investedAmount, 
      totalWealth,
      safetyMonths, 
      engagementRate, 
      rules: PERSONA_PRESETS.SALARIED.rules, 
      securityBuffer: 0, 
      availableForProjects: 0
    },
    allocations, freeCashFlow: realCashflow
  };
};

export const simulateGoalScenario = (goalInput: any, profile: any, context: any) => {
    const tempGoal = { ...goalInput, id: 'temp' };
    const effort = calculateMonthlyEffort(tempGoal);
    const diagnosis = analyzeGoalStrategies(tempGoal, effort, context.availableForProjects, 0, context.monthlyIncome, context.matelas);
    return { tempGoal, monthlyEffort: effort, projectionData: { projection: [], summary: { finalAmount: 0, totalInterests: 0, totalPocket: 0 } }, diagnosis };
};

// ============================================================================
// 🔥 5. LE DOCTEUR FINANCIER V12 (VERSION AUDIT PUR) 🔥
// ============================================================================
export const analyzeProfileHealth = (profile: Profile, context: SimulationResult['budget']): DeepAnalysis => {
  const opps: OptimizationOpportunity[] = [];
  const tags: string[] = [];
  const { safetyMonths } = context;

  const totalIncome = Math.max(1, context.monthlyIncome);
  const needsRatio = Math.round((context.fixed / totalIncome) * 100);
  // On utilise discretionaryExpenses qui correspond maintenant à "Vie Courante"
  const wantsRatio = Math.round((context.discretionaryExpenses / totalIncome) * 100);
  const savingsRatio = Math.round((context.capacityToSave / totalIncome) * 100);
  const debtRatio = context.engagementRate;
  
  const cash = safeFloat(profile.currentBalance);
  const savings = safeFloat(profile.savings);
  const invested = context.investments;
  const totalWealth = context.totalWealth;

  const adults = Math.max(1, safeFloat(profile.household?.adults));
  const children = Math.max(0, safeFloat(profile.household?.children));
  const parts = adults + (children * 0.5) + (children >= 3 ? 0.5 : 0);
  const tmi = estimateTMI(totalIncome, parts);
  
  const isModest = totalIncome < FINANCIAL_KNOWLEDGE.THRESHOLDS.POOR_INCOME;
  const isWealthy = totalIncome > (FINANCIAL_KNOWLEDGE.THRESHOLDS.RICH_INCOME + (children * 500));
  
  const monthlyBurnRate = context.fixed + Math.min(context.discretionaryExpenses, 800);
  
  // 1. Dépenses réelles (sans épargne)
  const realExpenses = context.fixed + context.discretionaryExpenses;
  // 2. Cashflow opérationnel (Vivre au-dessus de ses moyens ?)
  const operationalCashflow = totalIncome - realExpenses;
  const isLivingAboveMeans = operationalCashflow < 0;
  // 3. Cashflow net (après épargne programmée)
  const netCashflow = operationalCashflow - context.profitableExpenses;
  const isOverSaving = !isLivingAboveMeans && netCashflow < 0;

  const fireData = calculateFIRE((context.fixed + context.discretionaryExpenses) * 12, totalWealth, context.capacityToSave);
  const wealth10y = simulateFutureWealth(totalWealth, context.capacityToSave, 10);
  const wealth20y = simulateFutureWealth(totalWealth, context.capacityToSave, 20);
  
  // --- DIAGNOSTIC ---

  // 1. URGENCE VITALE
  if (isLivingAboveMeans) {
      opps.push({
          id: 'deficit_alert', type: 'BUDGET', level: 'CRITICAL',
          title: 'Hémorragie Financière',
          message: `STOP ! Vous vivez au-dessus de vos moyens (${formatCurrency(Math.abs(operationalCashflow))} de perte/mois). Votre épargne ne suffira pas à combler le trou éternellement.`,
      });
      tags.push("DANGER");
  } else if (isOverSaving) {
      opps.push({
          id: 'oversaving_alert', type: 'BUDGET', level: 'WARNING',
          title: 'Épargne trop agressive',
          message: `Bravo pour votre épargne ! Mais attention, vos virements automatiques (${formatCurrency(context.profitableExpenses)}) mettent votre compte courant dans le rouge (-${formatCurrency(Math.abs(netCashflow))}). Ralentissez le rythme pour éviter les agios.`,
      });
  }

  // 2. SÉCURITÉ
  const personaMultiplier = profile.persona === 'freelance' ? 1.5 : 0.8;
  const idealSafety = monthlyBurnRate * context.rules.safetyMonths * personaMultiplier;
  
  if (savings < FINANCIAL_KNOWLEDGE.THRESHOLDS.SURVIVAL_BUFFER) {
    opps.push({
      id: 'safety_danger', type: 'SAVINGS', level: 'CRITICAL',
      title: 'Zone Rouge : 0 Sécurité',
      message: `Règle d'or : Avoir 1000€ de sécurité. Vous avez ${formatCurrency(savings)}. Une panne de voiture vous mettrait en danger immédiat.`,
      actionLabel: `Sécuriser les ${formatCurrency(1000 - savings)} manquants`,
      guide: ACTION_GUIDES.MATELAS
    });
  } else if (savings < idealSafety && !isLivingAboveMeans) {
    const manque = idealSafety - savings;
    opps.push({
      id: 'safety_build', type: 'SAVINGS', level: 'INFO',
      title: 'Renforcez la digue',
      message: `Votre cible de sérénité est à ${formatCurrency(idealSafety)} (selon votre train de vie). Il vous manque ${formatCurrency(manque)} pour être totalement à l'abri.`,
      actionLabel: 'Méthode du Matelas',
      guide: ACTION_GUIDES.MATELAS
    });
  } else if (savings > idealSafety * 1.5) {
     const excess = savings - idealSafety;
     const loss = Math.round(excess * FINANCIAL_KNOWLEDGE.RATES.INFLATION);
     opps.push({
      id: 'safety_excess', type: 'INVESTMENT', level: 'WARNING',
      title: 'Perte de Pouvoir d\'Achat',
      message: `Vous avez ${formatCurrency(excess)} qui dorment au-delà de votre sécurité nécessaire. L'inflation vous "vole" l'équivalent de ${formatCurrency(loss)} par an sur cette somme.`,
      potentialGain: Math.round(excess * 0.05),
    });
  }

  // ALERTE PROPRIÉTAIRE / LOCATAIRE
  if (profile.housing?.status === 'tenant' && totalIncome > 3000 && safetyMonths > 3) {
      opps.push({
          id: 'buy_home', type: 'INVESTMENT', level: 'INFO',
          title: 'Acheter ou Louer ?',
          message: `Vous avez des revenus solides et une épargne de sécurité. Il serait peut-être temps d'évaluer si l'achat de votre résidence principale est pertinent.`,
      });
  }

  // 3. DETTES
  const badDebts = profile.credits.filter(c => safeFloat(c.amount) > 0 && !c.name.toLowerCase().match(/(immo|maison|appart|scpi|locatif)/i));
  const totalBad = calculateListTotal(badDebts);

  if (totalBad > 0) {
      const debtImpact = (totalBad / totalIncome) * 100;
      const severity = debtImpact > 10 ? 'CRITICAL' : 'WARNING';
      opps.push({
          id: 'toxic_debt', type: 'DEBT', level: severity,
          title: 'Dette Toxique Détectée',
          message: `Vous remboursez ${formatCurrency(totalBad)}/mois de crédits conso. C'est de l'argent perdu. Utilisez votre épargne pour les solder et regagner ${formatCurrency(totalBad)} de pouvoir d'achat mensuel.`,
          actionLabel: 'Plan de remboursement',
          potentialGain: totalBad * 12,
          guide: ACTION_GUIDES.DETTE
      });
  }

  // Levier Bancaire
  if (debtRatio < 25 && savingsRatio > 15 && totalIncome > 2500 && isWealthy) {
      opps.push({
        id: 'leverage_opportunity', type: 'BUDGET', level: 'INFO',
        title: 'Levier Bancaire Inexploité',
        message: `Votre taux d'endettement est très faible (${Math.round(debtRatio)}%). La banque pourrait financer vos projets (Immobilier locatif) pour vous enrichir avec l'argent des autres.`,
      });
  }

  // 4. OPTIMISATION DU CASH
  const maxCash = context.fixed * 1.2;
  if (cash > maxCash && !isLivingAboveMeans) {
       const overflow = cash - maxCash;
       const potential = Math.round(overflow * (isModest ? FINANCIAL_KNOWLEDGE.RATES.LEP : FINANCIAL_KNOWLEDGE.RATES.LIVRET_A));
       opps.push({
          id: 'cash_drag', type: 'BUDGET', level: 'INFO',
          title: 'Argent Improductif',
          message: `Il y a ${formatCurrency(overflow)} en trop sur votre compte courant. C'est une perte sèche de ~${potential}€/an d'intérêts potentiels.`,
          potentialGain: potential,
       });
  }

  // Automatisation
  const autoSavings = calculateListTotal(profile.savingsContributions);
  if (autoSavings === 0 && context.capacityToSave > 100) {
       opps.push({
          id: 'automate_savings', type: 'SAVINGS', level: 'WARNING',
          title: 'Le piège de la volonté',
          message: `Vous épargnez "ce qu'il reste". Programmez un virement de ${formatCurrency(Math.round(context.capacityToSave * 0.7))} dès le début du mois pour sécuriser votre avenir sans y penser.`,
       });
  }

  // Lifestyle Creep
  if (wantsRatio > 40 && totalIncome > 2000) {
       opps.push({
          id: 'lifestyle_creep', type: 'BUDGET', level: 'WARNING',
          title: 'Inflation du Train de Vie',
          message: `La règle idéale est max 30% de plaisirs. Vous êtes à ${wantsRatio}%. C'est ${formatCurrency(context.discretionaryExpenses - (totalIncome * 0.3))} qui ne construisent pas votre avenir.`,
       });
  }

  // 5. NIVEAU AVANCÉ
  
  // LEP
  const isEligibleLEP = (totalIncome * 12) < (FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_SINGLE * (parts > 1.5 ? 1.7 : 1));
  const hasLEP = profile.savingsContributions.some(s => s.name.match(/LEP|Populaire/i));
  if (isEligibleLEP && !hasLEP && savings > 500) {
      opps.push({
          id: 'lep_missing', type: 'INVESTMENT', level: 'SUCCESS',
          title: 'Cadeau Fiscal (LEP)',
          message: `Avec vos revenus, vous avez droit au LEP (5% Net). Pour ${formatCurrency(savings)} placés, c'est ${formatCurrency(savings * 0.05)} d'intérêts/an garantis.`,
          potentialGain: Math.min(savings, 10000) * (FINANCIAL_KNOWLEDGE.RATES.LEP - FINANCIAL_KNOWLEDGE.RATES.LIVRET_A),
          actionLabel: 'Comment ouvrir un LEP ?',
          guide: ACTION_GUIDES.LEP
      });
  }

  // Fiscalité
  if (tmi >= 0.30 && context.capacityToSave > 500 && savings > idealSafety) {
      const taxSave = Math.round(1000 * tmi);
      opps.push({
          id: 'tax_optim', type: 'INVESTMENT', level: 'SUCCESS',
          title: `Réduisez vos impôts (TMI ${Math.round(tmi*100)}%)`,
          message: `L'État prend ${Math.round(tmi*100)}% de vos revenus marginaux. En plaçant sur un PER, l'État finance en réalité ${Math.round(tmi*100)}% de votre épargne via la déduction d'impôt.`,
          potentialGain: taxSave * 3,
          actionLabel: 'Comprendre le PEA',
          guide: ACTION_GUIDES.PEA
      });
  }

  // 6. ENCOURAGEMENT
  if (!opps.some(o => o.level === 'CRITICAL' || o.level === 'WARNING')) {
      if (savingsRatio < 20) {
          opps.push({
             id: 'push_20', type: 'SAVINGS', level: 'SUCCESS',
             title: 'Visez les 20%',
             message: `Votre situation est saine ! Prochain niveau : monter votre taux d'épargne à 20% (actuel: ${savingsRatio}%). C'est la clé de l'indépendance.`,
          });
      } else if (invested < totalWealth * 0.3 && !isModest) {
           opps.push({
             id: 'invest_more', type: 'INVESTMENT', level: 'INFO',
             title: 'Diversification',
             message: `Excellent épargnant, mais votre patrimoine est trop liquide. Visez 30% d'actifs investis (Bourse/Immo) pour dynamiser votre patrimoine sur le long terme.`,
          });
      } else {
          opps.push({
             id: 'fire_track', type: 'INVESTMENT', level: 'SUCCESS',
             title: 'En route vers la liberté',
             message: `Votre profil est dans le top 5%. Finances optimisées, automatisées et diversifiées. Vous construisez activement votre liberté financière.`,
          });
      }
  }

  // --- SCORING GLOBAL ---
  let score = 100;
  if (needsRatio > 50) score -= (needsRatio - 50);
  if (wantsRatio > 30) score -= (wantsRatio - 30);
  if (safetyMonths < 3) score -= (3 - safetyMonths) * 10;
  if (debtRatio > 35) score -= 15;
  if (isLivingAboveMeans || needsRatio > 80 || savings < 100) {
      score = Math.min(score, 40);
  }
  if (savingsRatio > 20) score += 5;
  if (invested > savings) score += 5;

  if (isLivingAboveMeans) tags.push("Alerte");
  else if (savingsRatio > 30) tags.push("Fourmi");
  else if (wantsRatio > 45) tags.push("Cigale");
  
  if (invested > savings) tags.push("Investisseur");
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
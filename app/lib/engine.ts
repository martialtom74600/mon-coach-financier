import { differenceInMonths, isValid, addMonths, addYears } from 'date-fns';
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
    INFLATION: 0.025,    // 2.5% : Pour calculer la perte de pouvoir d'achat
    LIVRET_A: 0.03,      // 3.0% : Taux sans risque de base
    LEP: 0.05,           // 5.0% : Taux boosté sous condition de revenus
    MARKET_AVG: 0.07,    // 7.0% : Rendement moyen Bourse/Immo long terme
    SAFE_WITHDRAWAL: 0.04 // 4.0% : Règle pour la rente (FIRE)
  },
  THRESHOLDS: { 
    LEP_INCOME_SINGLE: 22000, // Revenu Fiscal de Référence approx (1 part)
    LEP_INCOME_COUPLE: 34000, // Revenu Fiscal de Référence approx (2 parts)
    HCSF_DEBT_RATIO: 35,      // 35% max endettement (Règle Banque de France)
    RICH_INCOME: 4000,        // Seuil "Aisé" (Net avant impôt)
    POOR_INCOME: 1600,        // Seuil "Modeste"
    SURVIVAL_BUFFER: 1000     // Minimum vital absolu sur un livret
  },
  TAX_BRACKETS: [ 
    { t: 11294, r: 0.11 }, 
    { t: 28797, r: 0.30 }, // Seuil critique : ici la défiscalisation devient puissante
    { t: 82341, r: 0.41 }, 
    { t: 177106, r: 0.45 } 
  ]
};

// ============================================================================
// 2. MODULES DE CALCUL (Les Algorithmes)
// ============================================================================

// A. FISCALITÉ : Estime le Taux Marginal d'Imposition (TMI)
const estimateTMI = (netIncome: number, parts: number = 1) => {
    // On approxime le net imposable (0.9 * net perçu pour l'abattement 10%)
    const q = (netIncome * 12 * 0.9) / parts; 
    for (let i = FINANCIAL_KNOWLEDGE.TAX_BRACKETS.length - 1; i >= 0; i--) {
        if (q > FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].t) return FINANCIAL_KNOWLEDGE.TAX_BRACKETS[i].r;
    }
    return 0;
};

// B. PROJECTION : Calculateur FIRE (Liberté Financière)
const calculateFIRE = (annualExpenses: number, currentWealth: number, monthlySavings: number) => {
    if (monthlySavings <= 0) return { years: 99, date: null };
    // Règle des 4% : Il faut 25x ses dépenses annuelles pour être rentier
    const target = annualExpenses / FINANCIAL_KNOWLEDGE.RATES.SAFE_WITHDRAWAL;
    
    if (currentWealth >= target) return { years: 0, date: new Date() };
    
    let wealth = currentWealth;
    let months = 0;
    // Simulation mois par mois avec intérêts composés
    while (wealth < target && months < 600) { // Limite à 50 ans pour éviter boucle infinie
        wealth += monthlySavings;
        wealth *= (1 + (FINANCIAL_KNOWLEDGE.RATES.MARKET_AVG / 12));
        months++;
    }
    return { years: Math.round(months / 12), date: addMonths(new Date(), months), target };
};

// C. PROJECTION : Patrimoine Futur
const simulateFutureWealth = (start: number, monthly: number, years: number) => {
    const r = 0.05 / 12; // Hypothèse prudente (Mixte Sécurisé/Risqué)
    let total = start;
    for(let i=0; i < years * 12; i++) total = (total + monthly) * (1 + r);
    return Math.round(total);
};

// D. TEMPS : Impact de l'inflation
const calculateInflationImpact = (amt: number, date: Date) => {
    const years = differenceInMonths(date, new Date()) / 12;
    return years <= 0 ? amt : amt * Math.pow(1 + FINANCIAL_KNOWLEDGE.RATES.INFLATION, years);
};

// E. TEMPS : Durée nécessaire pour atteindre un but
const calculateCompoundMonths = (target: number, pmt: number, rate: number) => {
    if (pmt <= 0) return 999;
    if (rate <= 0) return Math.ceil(target / pmt);
    const r = (rate / 100) / 12;
    try { return Math.ceil(Math.log(((target * r) / pmt) + 1) / Math.log(1 + r)); } catch { return 999; }
};

// ============================================================================
// 3. GESTION DES OBJECTIFS (Simulateur Achat/Projet)
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
        
        if (!goal.isInvested && differenceInMonths(new Date(goal.deadline), new Date()) > 24) 
            strategies.push({ type: 'HYBRID', title: 'Placer', message: `Placer cet argent à 4%+.`, actionLabel: "Activer intérêts" });

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
// 4. ORCHESTRATEUR (Calcul du Plan)
// ============================================================================
export const computeFinancialPlan = (profile: Profile): SimulationResult => {
  const income = calculateListTotal(profile.incomes);
  const fixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses) + calculateListTotal(profile.credits) + calculateListTotal(profile.subscriptions);
  const discretionary = safeFloat(profile.variableCosts);
  const manualSavings = calculateListTotal(profile.savingsContributions);
  
  const capacityToSave = Math.max(0, income - fixed - discretionary);
  const { allocations, totalAllocated } = distributeGoals(profile.goals || [], capacityToSave);
  const realCashflow = Math.max(0, capacityToSave - totalAllocated);
  
  const matelas = safeFloat(profile.savings);
  const burnRate = fixed + Math.min(discretionary, 800); 
  const safetyMonths = burnRate > 0 ? matelas / burnRate : 99;
  const engagementRate = income > 0 ? (fixed / income) * 100 : 0;
  const totalWealth = matelas + safeFloat(profile.investments) + safeFloat(profile.currentBalance);

  return {
    budget: { 
      income, fixed, capacity: capacityToSave, remainingToLive: income - fixed - totalAllocated,
      monthlyIncome: income, mandatoryExpenses: fixed, discretionaryExpenses: discretionary, capacityToSave,
      profitableExpenses: manualSavings + totalAllocated, totalGoalsEffort: totalAllocated, totalRecurring: fixed + manualSavings,
      realCashflow: realCashflow, matelas, investments: safeFloat(profile.investments), totalWealth,
      safetyMonths, engagementRate, rules: PERSONA_PRESETS.SALARIED.rules, securityBuffer: 0, availableForProjects: 0
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
// 🔥 5. LE DOCTEUR FINANCIER V11 (OMNISCIENT) 🔥
// ============================================================================
export const analyzeProfileHealth = (profile: Profile, context: SimulationResult['budget']): DeepAnalysis => {
  const opps: OptimizationOpportunity[] = [];
  const tags: string[] = [];
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

  // --- A. CONTEXTE (Qui est l'utilisateur ?) ---
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

  // --- B. PROJECTIONS FUTURES (L'Oracle) ---
  const fireData = calculateFIRE((context.fixed + context.discretionaryExpenses) * 12, totalWealth, context.capacityToSave);
  const wealth10y = simulateFutureWealth(totalWealth, context.capacityToSave, 10);
  const wealth20y = simulateFutureWealth(totalWealth, context.capacityToSave, 20);
  
  // ========================================================================
  // C. DIAGNOSTIC PAR PRIORITÉ
  // ========================================================================

  // 1. URGENCE VITALE (Coupe-circuits)
  if (isDeficit) {
      opps.push({
          id: 'deficit_alert', type: 'BUDGET', level: 'CRITICAL',
          title: 'Hémorragie Financière',
          message: `STOP ! Vous dépensez ${formatCurrency(Math.abs(cashflow))} de plus que vous ne gagnez. À ce rythme, votre épargne sera siphonnée. Il faut réduire les dépenses variables immédiatement.`,
          actionLabel: 'Couper les dépenses'
      });
      tags.push("DANGER");
  }

  if (needsRatio > 70) {
      opps.push({
          id: 'needs_critical', type: 'BUDGET', level: 'CRITICAL',
          title: 'Prison Budgétaire',
          message: `Vos charges fixes (loyer, crédits) engloutissent ${needsRatio}% de vos revenus. C'est structurellement insoutenable. Vous travaillez uniquement pour payer vos factures.`,
      });
  }

  // 2. SÉCURITÉ (Survie vs Optimisation)
  const personaMultiplier = profile.persona === 'freelance' ? 1.5 : 0.8;
  const idealSafety = monthlyBurnRate * context.rules.safetyMonths * personaMultiplier;
  
  if (savings < FINANCIAL_KNOWLEDGE.THRESHOLDS.SURVIVAL_BUFFER) {
    opps.push({
      id: 'safety_danger', type: 'SAVINGS', level: 'CRITICAL',
      title: 'Zone Rouge : 0 Sécurité',
      message: `Vous vivez sans filet. Une panne de voiture ou un retard de salaire vous mettrait en défaut de paiement. Créez un fond d'urgence de 1000€ avant de dépenser 1€ de plus.`,
      actionLabel: 'Sécuriser 1000€'
    });
  } else if (savings < idealSafety && !isDeficit) {
    opps.push({
      id: 'safety_build', type: 'SAVINGS', level: 'INFO',
      title: 'Renforcez la digue',
      message: `Votre matelas (${(savings/monthlyBurnRate).toFixed(1)} mois) est un début. Pour votre profil, l'idéal de sérénité est à ${formatCurrency(idealSafety)}.`,
      actionLabel: 'Verser 50€/mois'
    });
  } else if (savings > idealSafety * 1.5) {
     // Problème de riche / écureuil
     const excess = savings - idealSafety;
     const loss = Math.round(excess * FINANCIAL_KNOWLEDGE.RATES.INFLATION);
     opps.push({
      id: 'safety_excess', type: 'INVESTMENT', level: 'WARNING',
      title: 'Perte de Pouvoir d\'Achat',
      message: `Vous avez ${formatCurrency(excess)} qui dorment inutilement. L'inflation vous prend ~${Math.round(excess * 0.025)}€/an. Cet argent doit être investi pour rapporter.`,
      actionLabel: 'Placer l\'excédent',
      potentialGain: Math.round(excess * 0.05)
    });
  }

  // 3. DETTES (La chasse aux toxiques)
  const badDebts = profile.credits.filter(c => safeFloat(c.amount) > 0 && !c.name.toLowerCase().match(/(immo|maison|appart|scpi|locatif)/i));
  const totalBad = calculateListTotal(badDebts);

  if (totalBad > 0) {
      const debtImpact = (totalBad / totalIncome) * 100;
      const severity = debtImpact > 10 ? 'CRITICAL' : 'WARNING';
      opps.push({
          id: 'toxic_debt', type: 'DEBT', level: severity,
          title: 'Dette Toxique Détectée',
          message: `Vous avez ${badDebts.length} crédits conso (${formatCurrency(totalBad)}/mois). Ils vous appauvrissent chaque mois. Utilisez votre épargne pour les solder et retrouver votre liberté.`,
          actionLabel: 'Rembourser par anticipation',
          potentialGain: totalBad * 12
      });
  }

  // Levier Bancaire (Seulement pour les profils solides)
  if (debtRatio < 25 && savingsRatio > 15 && totalIncome > 2500 && isWealthy) {
      opps.push({
        id: 'leverage_opportunity', type: 'BUDGET', level: 'INFO',
        title: 'Levier Bancaire Inexploité',
        message: `Votre solvabilité est excellente. Vous pourriez utiliser l'argent de la banque pour vous enrichir (Immobilier locatif) au lieu d'épargner uniquement votre salaire.`,
        actionLabel: 'Simuler un projet'
      });
  }

  // 4. OPTIMISATION DU CASH (Pour TOUS les profils)
  // Cash Drag
  const maxCash = context.fixed * 1.2;
  if (cash > maxCash && !isDeficit) {
       const overflow = cash - maxCash;
       const potential = Math.round(overflow * (isModest ? FINANCIAL_KNOWLEDGE.RATES.LEP : FINANCIAL_KNOWLEDGE.RATES.LIVRET_A));
       opps.push({
          id: 'cash_drag', type: 'BUDGET', level: 'INFO',
          title: 'Argent Improductif',
          message: `Il y a ${formatCurrency(overflow)} en trop sur votre compte courant. C'est une perte sèche. Placez-les, c'est de l'argent gratuit.`,
          potentialGain: potential,
          actionLabel: 'Faire un virement'
       });
  }

  // Automatisation
  const autoSavings = calculateListTotal(profile.savingsContributions);
  if (autoSavings === 0 && context.capacityToSave > 100) {
       opps.push({
          id: 'automate_savings', type: 'SAVINGS', level: 'WARNING',
          title: 'Le piège de la volonté',
          message: `Vous épargnez "ce qu'il reste". Programmez un virement de ${formatCurrency(Math.round(context.capacityToSave * 0.7))} en début de mois pour sécuriser votre avenir sans y penser.`,
          actionLabel: 'Programmer'
       });
  }

  // Lifestyle Creep
  if (wantsRatio > 40 && totalIncome > 2000) {
       opps.push({
          id: 'lifestyle_creep', type: 'BUDGET', level: 'WARNING',
          title: 'Inflation du Train de Vie',
          message: `Vos dépenses plaisir prennent ${wantsRatio}% de vos revenus (Cible: 30%). Vous consommez votre richesse future au lieu de la construire.`,
       });
  }

  // 5. NIVEAU AVANCÉ (Fiscalité & Investissement)
  
  // LEP (Pour le Modeste)
  const isEligibleLEP = (totalIncome * 12) < (FINANCIAL_KNOWLEDGE.THRESHOLDS.LEP_INCOME_SINGLE * (parts > 1.5 ? 1.7 : 1));
  const hasLEP = profile.savingsContributions.some(s => s.name.match(/LEP|Populaire/i));
  if (isEligibleLEP && !hasLEP && savings > 500) {
      opps.push({
          id: 'lep_missing', type: 'INVESTMENT', level: 'SUCCESS',
          title: 'Cadeau Fiscal (LEP)',
          message: `Vous avez droit au LEP (5% Net). C'est le placement le plus rentable et sûr du marché. Ouvrez-en un d'urgence, c'est mathématique.`,
          potentialGain: Math.min(savings, 10000) * (FINANCIAL_KNOWLEDGE.RATES.LEP - FINANCIAL_KNOWLEDGE.RATES.LIVRET_A),
          actionLabel: 'Vérifier éligibilité'
      });
  }

  // Fiscalité (Pour le Riche)
  if (tmi >= 0.30 && context.capacityToSave > 500 && savings > idealSafety) {
      const taxSave = Math.round(1000 * tmi);
      opps.push({
          id: 'tax_optim', type: 'INVESTMENT', level: 'SUCCESS',
          title: `Réduisez vos impôts (TMI ${Math.round(tmi*100)}%)`,
          message: `L'État est votre 1er poste de dépense. Avec le PER, 1000€ placés = ${taxSave}€ d'impôts en moins. Profitez de cet avantage.`,
          potentialGain: taxSave * 3 // Sur une base de 3000€ placés
      });
  }

  // 6. ENCOURAGEMENT (Si le profil est Excellent)
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
             message: `Excellent épargnant, mais votre patrimoine est trop liquide. Visez 30% d'actifs investis (Bourse/Immo) pour dynamiser votre patrimoine sur le long terme.`
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
  if (isDeficit || needsRatio > 80 || savings < 100) {
      score = Math.min(score, 40); // Plafond de verre pour les profils à risque
  }
  if (savingsRatio > 20) score += 5;
  if (invested > savings) score += 5;

  // Tags
  if (isDeficit) tags.push("Alerte");
  else if (savingsRatio > 30) tags.push("Fourmi");
  else if (wantsRatio > 45) tags.push("Cigale");
  
  if (invested > savings) tags.push("Investisseur");
  if (isWealthy) tags.push("Aisé");
  if (isModest) tags.push("Modeste");

  return {
    globalScore: Math.max(0, Math.min(100, Math.round(score))),
    tags: [...new Set(tags)],
    ratios: { needs: needsRatio, wants: wantsRatio, savings: savingsRatio },
    // Projections incluses pour l'affichage V5
    projections: { wealth10y, wealth20y, fireYear: fireData.years },
    opportunities: opps.sort((a, b) => {
        const levels = { 'CRITICAL': 0, 'WARNING': 1, 'INFO': 2, 'SUCCESS': 3 };
        return levels[a.level] - levels[b.level];
    })
  };
};
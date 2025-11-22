export const STORAGE_KEY = 'financial_coach_data_v1';

// --- CONSTANTES GLOBALES ---
export const CONSTANTS = {
  AVG_WORK_DAYS_MONTH: 21.6, 
  SAFE_SAVINGS_RATE: 0.03,
  INVESTMENT_RATE: 0.07,
  INFLATION_RATE: 0.02,
  WEALTHY_THRESHOLD: 12,
};

// --- 1. LES 5 PROFILS TYPES (EXCLUSIFS) ---
export const PERSONA_PRESETS = {
  STUDENT: {
    id: 'student',
    label: 'Étudiant(e)',
    description: 'Budget serré, études, besoins flexibles.',
    rules: { safetyMonths: 1, maxDebt: 40, minLiving: 100 } 
  },
  SALARIED: {
    id: 'salaried',
    label: 'Salarié / Stable',
    description: 'Revenus réguliers (CDI, Fonctionnaire).',
    rules: { safetyMonths: 3, maxDebt: 35, minLiving: 300 }
  },
  FREELANCE: {
    id: 'freelance',
    label: 'Indépendant / Freelance',
    description: 'Revenus variables, risque plus élevé.',
    rules: { safetyMonths: 6, maxDebt: 30, minLiving: 500 }
  },
  RETIRED: {
    id: 'retired',
    label: 'Retraité(e)',
    description: 'Revenus fixes, préservation du capital.',
    rules: { safetyMonths: 6, maxDebt: 25, minLiving: 400 }
  },
  UNEMPLOYED: {
    id: 'unemployed',
    label: 'En recherche / Transition',
    description: 'Revenus précaires, prudence maximale.',
    rules: { safetyMonths: 6, maxDebt: 0, minLiving: 200 } // Zéro dette tolérée
  }
};

export const INITIAL_PROFILE = {
  firstName: '',
  persona: 'salaried',
  household: {
    adults: 1,
    children: 0
  },
  savings: 0,
  incomes: [],
  fixedCosts: [],
  subscriptions: [],
  credits: [],
  savingsContributions: [],
  annualExpenses: [],
};

export const PURCHASE_TYPES = {
  NEED: { id: 'need', label: 'Besoin Vital', description: 'Nourriture, Santé, Réparation indispensable', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  USEFUL: { id: 'useful', label: 'Confort / Utile', description: 'Gain de temps, Travail, Sport', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  DESIRE: { id: 'desire', label: 'Envie / Plaisir', description: 'Gadget, Mode, Sortie, Déco', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export const PAYMENT_MODES = {
  CASH_SAVINGS: 'Épargne (Je tape dans le stock)',
  CASH_ACCOUNT: 'Compte Courant (Je paie avec le salaire)',
  SPLIT: 'Paiement 3x/4x (Dette court terme)',
  CREDIT: 'Crédit / LOA (Dette long terme)',
  SUBSCRIPTION: 'Abonnement (Charge fixe)',
};

// --- FONCTIONS UTILITAIRES ---

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatCurrency = (amount: any) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(num);
};

const calculateFutureValue = (principal: number, rate: number, years: number) => {
  return principal * Math.pow((1 + rate), years);
};

// --- ANALYSE DU PROFIL (V6) ---
export const calculateFinancials = (profile: any) => {
  const getMonthlyTotal = (items: any[]) =>
    (items || []).reduce((acc, item) => {
      let amount = Math.abs(parseFloat(item.amount) || 0);
      if (item.frequency === 'annuel') amount = amount / 12;
      return acc + amount;
    }, 0);

  const monthlyIncome = getMonthlyTotal(profile.incomes);
  const monthlyFixed = getMonthlyTotal(profile.fixedCosts) + getMonthlyTotal(profile.annualExpenses);
  const monthlySubs = getMonthlyTotal(profile.subscriptions);
  const monthlyCredits = getMonthlyTotal(profile.credits);
  const monthlySavingsContrib = getMonthlyTotal(profile.savingsContributions);

  const essentialExpenses = monthlyFixed; 
  const totalRecurring = essentialExpenses + monthlySubs + monthlyCredits + monthlySavingsContrib;
  const remainingToLive = monthlyIncome - totalRecurring;
  
  let engagementRate = 0;
  if (monthlyIncome > 0) {
    engagementRate = ((essentialExpenses + monthlySubs + monthlyCredits) / monthlyIncome) * 100;
  } else if (essentialExpenses + monthlySubs + monthlyCredits > 0) {
    engagementRate = 100;
  }

  const matelas = Math.abs(parseFloat(profile.savings) || 0);
  
  // 2. Calcul Dynamique des Règles (FAMILLE + PERSONA)
  const currentPersonaKey = (profile.persona || 'salaried').toUpperCase();
  // @ts-ignore
  const baseRules = PERSONA_PRESETS[currentPersonaKey]?.rules || PERSONA_PRESETS.SALARIED.rules;

  // Ajustement du Seuil de Survie selon la Famille
  const adults = Math.max(1, parseInt(profile.household?.adults) || 1);
  const children = Math.max(0, parseInt(profile.household?.children) || 0);
  
  // Formule : Base + 150€/adulte supp + 120€/enfant
  const adjustedMinLiving = baseRules.minLiving + ((adults - 1) * 150) + (children * 120);

  const userRules = {
    ...baseRules,
    minLiving: adjustedMinLiving
  };

  let safetyMonths = 0;
  if (essentialExpenses > 0) {
    safetyMonths = matelas / essentialExpenses;
  } else if (matelas > 0) {
    safetyMonths = 99;
  }
  
  const dailyIncome = monthlyIncome > 0 ? monthlyIncome / CONSTANTS.AVG_WORK_DAYS_MONTH : 0;

  return {
    monthlyIncome,
    essentialExpenses,
    monthlySubs,
    monthlyCredits,
    monthlySavingsContrib,
    totalRecurring,
    remainingToLive,
    engagementRate,
    matelas,
    safetyMonths,
    dailyIncome,
    rules: userRules, 
    firstName: profile.firstName || 'Utilisateur',
    persona: profile.persona || 'salaried'
  };
};

// --- LE CERVEAU V6 (ADAPTATIF) ---

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

  // --- 1. CALCULS PHYSIQUES ---
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

  // --- 2. AJUSTEMENTS CONTEXTE ---
  if (isReimbursable) {
    realCost = 0; creditCost = 0; opportunityCost = 0; timeToWork = 0;
  } else if (isPro) {
    opportunityCost = 0;
  }

  if (currentStats.dailyIncome > 1 && !isReimbursable) {
    const costToCompare = purchase.paymentMode === 'SUBSCRIPTION' ? (amount * 12) : realCost;
    timeToWork = costToCompare / currentStats.dailyIncome;
  }

  // --- 3. RECALCUL RATIOS ---
  const newMonthlyExpenses = currentStats.essentialExpenses + (monthlyCost > 0 ? monthlyCost : 0);
  let newSafetyMonths = 0;
  if (newMonthlyExpenses > 0) newSafetyMonths = newMatelas / newMonthlyExpenses;
  else if (newMatelas > 0) newSafetyMonths = 99;

  let newEngagementRate = 0;
  if (currentStats.monthlyIncome > 0) {
    newEngagementRate = ((currentStats.essentialExpenses + currentStats.monthlySubs + currentStats.monthlyCredits + monthlyCost) / currentStats.monthlyIncome) * 100;
  } else if ((currentStats.essentialExpenses + monthlyCost) > 0) {
    newEngagementRate = 100;
  }

  // --- 4. MOTEUR DE RÈGLES ADAPTATIF ---
  const issues = [];
  const tips = [];
  let score = 100;

  if (purchase.paymentMode === 'CASH_SAVINGS' && amount > currentStats.matelas) {
      issues.push({ level: 'red', text: `FONDS INSUFFISANTS : Tu n'as que ${formatCurrency(currentStats.matelas)} d'épargne.` });
      tips.push({ type: 'stop', title: "Achat Impossible", text: "Tu ne peux pas dépenser l'argent que tu n'as pas." });
      score -= 100;
  }

  const missingCash = rules.minLiving - newRV; 
  const isLiquidityIssue = purchase.paymentMode === 'CASH_ACCOUNT' && missingCash > 0;
  
  if (isLiquidityIssue) {
      if (newMatelas > missingCash) {
          issues.push({ level: 'orange', text: `Trésorerie : Compte courant sous le seuil de confort (${formatCurrency(rules.minLiving)}).` });
          tips.push({ type: 'action', title: "Virement nécessaire", text: `Fais un virement de ${formatCurrency(missingCash)} depuis ton épargne.` });
          score -= 20;
      } else {
          if (!isReimbursable) {
              issues.push({ level: 'red', text: `DANGER VITAL : Il ne te restera que ${formatCurrency(newRV)} pour vivre.` });
              score -= 100;
          } else {
              issues.push({ level: 'orange', text: `Trésorerie tendue en attendant le remboursement.` });
              score -= 30;
          }
      }
  }
  
  if (!isReimbursable) {
      if (newSafetyMonths < 1) {
          if (currentStats.safetyMonths > 0) {
             issues.push({ level: 'red', text: `Épargne épuisée (${newSafetyMonths.toFixed(1)} mois).` });
             score -= 40;
          }
      } else if (newSafetyMonths < rules.safetyMonths) {
          issues.push({ level: 'orange', text: `Fragilité : Ton objectif est de ${rules.safetyMonths} mois d'avance.` });
          score -= 20;
      }
  }

  const isWealthy = newSafetyMonths > CONSTANTS.WEALTHY_THRESHOLD;

  if (newEngagementRate > 45 && !isReimbursable) {
    if (monthlyCost > 0) {
        issues.push({ level: 'red', text: `SURENDETTEMENT : Charges à ${newEngagementRate.toFixed(0)}%.` });
        score -= 40;
    } else if (!isWealthy) {
        issues.push({ level: 'orange', text: `Charges structurelles élevées (${newEngagementRate.toFixed(0)}%).` });
        score -= 15;
    }
  } else if (newEngagementRate > rules.maxDebt && monthlyCost > 0) {
      issues.push({ level: 'orange', text: `Attention : Tu dépasses ton seuil d'endettement (${rules.maxDebt}%).` });
      score -= 15;
  }

  const checkPsychology = !isPro && !isReimbursable;
  const isSmallPleasure = amount < (currentStats.monthlyIncome * 0.02);

  if (checkPsychology) {
    if (opportunityCost > amount && !isSmallPleasure && purchase.type !== 'need') {
        tips.push({ type: 'investor', title: "Coût d'opportunité", text: `Placé à 7%, cet argent vaudrait ${formatCurrency(amount + opportunityCost)} dans 10 ans.` });
    }
    if (timeToWork > 3 && purchase.type === 'desire') {
        tips.push({ type: 'time', title: "Temps de vie", text: `Cet objet représente ${Math.ceil(timeToWork)} jours de travail.` });
    }
    
    const isLuxuryUseful = purchase.type === 'useful' && amount > (currentStats.monthlyIncome * 3);
    if ((purchase.type === 'desire' || isLuxuryUseful) && (purchase.paymentMode === 'CREDIT' || purchase.paymentMode === 'SPLIT')) {
        issues.push({ level: 'red', text: "Crédit Conso sur un Passif." });
        tips.push({ type: 'stop', title: "Règle d'Or", text: "On ne s'endette jamais pour du plaisir." });
        score -= 30;
    }
  }

  // --- VERDICT ---
  let verdict = 'green';
  if (score < 50 || issues.some((i: any) => i.level === 'red')) verdict = 'red';
  else if (score < 80 || issues.some((i: any) => i.level === 'orange')) verdict = 'orange';

  let smartTip = "";
  const liquidityTip: any = tips.find((t: any) => t.title === "Virement nécessaire");

  if (verdict === 'red') {
      const stopTip: any = tips.find((t: any) => t.type === 'stop');
      smartTip = stopTip ? stopTip.text : "Stop 🛑 Cet achat est dangereux pour tes finances.";
  }
  else if (liquidityTip) {
      smartTip = `⚠️ Attention Logistique : ${liquidityTip.text}`;
  }
  else if (isReimbursable) {
      smartTip = "Opération neutre 🔄 C'est une avance. Note-le bien.";
  }
  else if (verdict === 'orange') {
      if (timeToWork > 5 && purchase.type === 'desire') {
          smartTip = `⚠️ C'est risqué. Travailler ${Math.ceil(timeToWork)} jours pour ce plaisir alors que ta situation est fragile ?`;
      } else {
          smartTip = "⚠️ Attention. Ta situation est fragile. Assure-toi que c'est indispensable.";
      }
  }
  else {
      if (opportunityCost > amount && !isSmallPleasure && purchase.type !== 'need') {
        smartTip = `💡 Info Investisseur : Placé à 7%, cet argent vaudrait ${formatCurrency(amount + opportunityCost)} dans 10 ans.`;
      } else if (timeToWork > 3 && purchase.type === 'desire') {
        smartTip = `💡 Info Temps : Cet objet représente ${Math.ceil(timeToWork)} jours de travail.`;
      } else {
        smartTip = `✅ Feu vert ${currentStats.firstName} ! Tout est au vert, profite.`;
      }
  }

  return { verdict, score, issues, tips, newMatelas, newRV, newSafetyMonths, newEngagementRate, realCost, creditCost, opportunityCost, timeToWork, smartTip };
};
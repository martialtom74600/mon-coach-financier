export const STORAGE_KEY = 'financial_coach_data_v1';

// --- CONSTANTES SCIENTIFIQUES & FINANCIÈRES ---
export const CONSTANTS = {
  AVG_WORK_DAYS_MONTH: 21.6, 
  SAFE_SAVINGS_RATE: 0.03,   // 3% (Livret A / Fonds Euro)
  INVESTMENT_RATE: 0.07,     // 7% (Bourse / ETF Monde lissé sur 15 ans)
  INFLATION_RATE: 0.02,      // 2% Cible BCE
  MAX_DEBT_RATIO: 35,        // 35% Norme HCSF
  MIN_LIVING_REMAINDER: 200, // Seuil de survie absolue
};

export const INITIAL_PROFILE = {
  savings: 0,
  incomes: [],
  fixedCosts: [],
  subscriptions: [],
  credits: [],
  savingsContributions: [],
  annualExpenses: [],
};

export const PURCHASE_TYPES = {
  NEED: {
    id: 'need',
    label: 'Besoin Vital',
    description: 'Nourriture, Santé, Réparation indispensable',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  USEFUL: {
    id: 'useful',
    label: 'Confort / Utile',
    description: 'Gain de temps, Travail, Sport',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  DESIRE: {
    id: 'desire',
    label: 'Envie / Plaisir',
    description: 'Gadget, Mode, Sortie, Déco',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
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

// --- ANALYSE DU PROFIL ---
export const calculateFinancials = (profile: any) => {
  const getMonthly = (items: any[]) =>
    items.reduce((acc, item) => {
      let amount = Math.abs(parseFloat(item.amount) || 0);
      if (item.frequency === 'annuel') amount = amount / 12;
      return acc + amount;
    }, 0);

  const monthlyIncome = getMonthly(profile.incomes);
  const monthlyFixed = getMonthly(profile.fixedCosts) + getMonthly(profile.annualExpenses);
  const monthlySubs = getMonthly(profile.subscriptions);
  const monthlyCredits = getMonthly(profile.credits);
  const monthlySavingsContrib = getMonthly(profile.savingsContributions);

  const essentialExpenses = monthlyFixed; 
  const totalRecurring = essentialExpenses + monthlySubs + monthlyCredits + monthlySavingsContrib;
  const remainingToLive = monthlyIncome - totalRecurring;
  
  const engagementRate = monthlyIncome > 0
    ? ((essentialExpenses + monthlySubs + monthlyCredits) / monthlyIncome) * 100
    : 0;

  const matelas = Math.abs(parseFloat(profile.savings) || 0);
  
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
  };
};

// --- LE CERVEAU V4 (ANALYSE MULTI-DIMENSIONNELLE) ---

export const analyzePurchaseImpact = (currentStats: any, purchase: any) => {
  const amount = Math.abs(parseFloat(purchase.amount) || 0);
  const { isReimbursable = false, isPro = false } = purchase;

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
    realCost = 0;
    creditCost = 0;
    opportunityCost = 0;
    timeToWork = 0;
  } 
  else if (isPro) {
    opportunityCost = 0;
  }

  if (currentStats.dailyIncome > 1 && !isReimbursable) {
    const costToCompare = purchase.paymentMode === 'SUBSCRIPTION' ? (amount * 12) : realCost;
    timeToWork = costToCompare / currentStats.dailyIncome;
  }

  // --- 3. RECALCUL RATIOS ---

  const newMonthlyExpenses = currentStats.essentialExpenses + (monthlyCost > 0 ? monthlyCost : 0);
  
  let newSafetyMonths = 0;
  if (newMonthlyExpenses > 0) {
    newSafetyMonths = newMatelas / newMonthlyExpenses;
  } else if (newMatelas > 0) {
    newSafetyMonths = 99;
  }

  const newEngagementRate = currentStats.monthlyIncome > 0
      ? ((currentStats.essentialExpenses +
          currentStats.monthlySubs +
          currentStats.monthlyCredits +
          monthlyCost) /
          currentStats.monthlyIncome) * 100
      : 0;


  // --- 4. MOTEUR DE RÈGLES & CONSEILS MULTIPLES ---
  const issues = [];
  const tips = []; // Liste des conseils structurés
  let score = 100;

  const isCashFlowBridge = purchase.paymentMode === 'CASH_ACCOUNT' && newRV < 0 && currentStats.matelas > Math.abs(newRV);

  // --- RÈGLES BLOQUANTES ---
  if (newRV < 0) {
    if (isCashFlowBridge) {
        issues.push({ level: 'orange', text: `Trésorerie : Manque ${formatCurrency(Math.abs(newRV))} sur le compte courant.` });
        tips.push({ type: 'action', title: "Mouvement Logistique", text: `Tu as l'épargne nécessaire. Transfère ${formatCurrency(Math.abs(newRV))} de ton livret vers ton compte courant AVANT d'acheter.` });
        score -= 20; 
    } else if (isReimbursable) {
        issues.push({ level: 'orange', text: `Avance de trésorerie risquée.` });
        tips.push({ type: 'warning', title: "Surveille ta tréso", text: "C'est remboursable, mais assure-toi d'avoir assez de cash pour tenir jusqu'au remboursement." });
        score -= 30;
    } else {
        issues.push({ level: 'red', text: `MUR FINANCIER : Ton budget explose.` });
        tips.push({ type: 'stop', title: "Impossible en l'état", text: `Il te manque ${formatCurrency(Math.abs(newRV))}. Tu ne peux pas faire cet achat sans t'endetter dangereusement.` });
        score -= 100;
    }
  }
  
  // --- SÉCURITÉ ---
  if (!isReimbursable) {
      if (newSafetyMonths < 1) {
        issues.push({ level: 'red', text: `Épargne épuisée (${newSafetyMonths.toFixed(1)} mois).` });
        tips.push({ type: 'stop', title: "Danger Sécurité", text: "Tu vides complètement ton matelas de sécurité. Au moindre pépin (voiture, santé), tu es à la rue." });
        score -= 40;
      } else if (newSafetyMonths < 3) {
        issues.push({ level: 'orange', text: `Matelas faible (< 3 mois).` });
        tips.push({ type: 'warning', title: "Reconstitue ton épargne", text: "Cet achat fragilise ta sécurité. Engage-toi à remettre de l'argent de côté le mois prochain." });
        score -= 20;
      }
  }

  // --- ENDETTEMENT ---
  if (newEngagementRate > 45 && !isReimbursable) {
    if (monthlyCost > 0) {
        issues.push({ level: 'red', text: `SURENDETTEMENT : Charges à ${newEngagementRate.toFixed(0)}%.` });
        tips.push({ type: 'stop', title: "Stop aux charges", text: "Tes charges fixes sont trop lourdes. N'ajoute surtout pas un nouveau crédit ou abonnement." });
        score -= 40;
    } else {
        issues.push({ level: 'orange', text: `Charges structurelles élevées (${newEngagementRate.toFixed(0)}%).` });
        // Pas de tip bloquant ici car c'est du cash, juste un warning structurel
        score -= 15;
    }
  }

  // --- PSYCHOLOGIE & COMPORTEMENT ---
  const checkPsychology = !isPro && !isReimbursable;
  const isSmallPleasure = amount < (currentStats.monthlyIncome * 0.02);

  if (checkPsychology) {
    // Investisseur (Coût d'opportunité)
    if (opportunityCost > amount && !isSmallPleasure && purchase.type !== 'need') {
        tips.push({ 
            type: 'investor', 
            title: "Perspective Investisseur", 
            text: `Le coût caché est énorme : si tu plaçais ces ${formatCurrency(amount)} à 7% au lieu de les dépenser, tu aurais ${formatCurrency(amount + opportunityCost)} dans 10 ans.` 
        });
    }

    // Travailleur (Temps de vie)
    if (timeToWork > 3 && purchase.type === 'desire') {
        tips.push({ 
            type: 'time', 
            title: "Perspective Temporelle", 
            text: `Cet objet te coûte ${Math.ceil(timeToWork)} jours de travail complets assis au bureau. Est-ce que ça les vaut vraiment ?` 
        });
    }

    // Règle des 7 jours
    if (purchase.type === 'desire' && !isSmallPleasure && amount > 300 && newSafetyMonths < 6) {
        issues.push({ level: 'orange', text: "Grosse somme pour une envie." });
        tips.push({ 
            type: 'psychology', 
            title: "Biais Cognitif", 
            text: "C'est une grosse somme pour un plaisir. Attends 7 jours. Si tu en as toujours envie la semaine prochaine, reviens l'acheter." 
        });
        score -= 10;
    }

    // Crédit Toxique
    const isLuxuryUseful = purchase.type === 'useful' && amount > (currentStats.monthlyIncome * 3);
    if ((purchase.type === 'desire' || isLuxuryUseful) && (purchase.paymentMode === 'CREDIT' || purchase.paymentMode === 'SPLIT')) {
        issues.push({ level: 'red', text: "Crédit Conso sur un Passif." });
        tips.push({ type: 'stop', title: "Règle d'Or", text: "On ne s'endette JAMAIS pour du plaisir ou du luxe. Si tu n'as pas le cash, tu n'as pas les moyens." });
        score -= 30;
    }
  }

  // Conseil par défaut si la liste est vide
  if (tips.length === 0) {
      if (isPro) tips.push({ type: 'success', title: "Investissement Pro", text: "C'est un outil de travail. Si cela augmente ta productivité, c'est un excellent choix." });
      else if (isReimbursable) tips.push({ type: 'info', title: "Avance de frais", text: "Pense à bien scanner ton justificatif tout de suite pour ne pas oublier le remboursement." });
      else tips.push({ type: 'success', title: "Feu vert", text: "Tu as les moyens, la sécurité et le budget. Profite de ton achat sans culpabilité !" });
  }

  // VERDICT FINAL
  let verdict = 'green';
  if (score < 50 || issues.some((i) => i.level === 'red')) verdict = 'red';
  else if (score < 80 || issues.some((i) => i.level === 'orange')) verdict = 'orange';

  // SmartTip de secours pour la compatibilité (ne devrait plus être utilisé par l'UI)
  const smartTip = tips.length > 0 ? tips[0].text : "Analyse terminée.";

  return { 
    verdict, 
    score, 
    issues, 
    tips, // C'est ce tableau qui contient toute la richesse
    newMatelas, 
    newRV, 
    newSafetyMonths, 
    newEngagementRate,
    realCost, 
    creditCost, 
    opportunityCost, 
    timeToWork,
    smartTip
  };
};
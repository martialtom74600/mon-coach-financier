import { CONSTANTS, PERSONA_PRESETS } from './constants';
// On importe depuis utils pour éviter les doublons d'export (generateId)
import { calculateFutureValue, formatCurrency, calculateListTotal, generateId } from './utils';
// On garde timeline séparé
import { generateTimeline } from './timeline';
import { addMonths, addDays } from 'date-fns';

// --- CALCULS DU PROFIL (DASHBOARD) ---
// (CETTE FONCTION EST STRICTEMENT IDENTIQUE À TA VERSION ACTUELLE)
export const calculateFinancials = (profile: any) => {
  
  // 1. REVENUS
  const monthlyIncome = calculateListTotal(profile.incomes);

  // 2. DÉPENSES OBLIGATOIRES
  const monthlyFixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
  const monthlySubs = calculateListTotal(profile.subscriptions);
  const monthlyCredits = calculateListTotal(profile.credits);
  
  const mandatoryExpenses = monthlyFixed + monthlySubs + monthlyCredits;

  // 3. DÉPENSES RENTABLES
  const profitableExpenses = calculateListTotal(profile.savingsContributions);

  // 4. DÉPENSES DE CHOIX
  const discretionaryExpenses = Math.abs(parseFloat(profile.variableCosts) || 0);

  // TOTAUX
  const totalRecurring = mandatoryExpenses + profitableExpenses;
  const remainingToLive = monthlyIncome - totalRecurring;
  
  // Capacité d'épargne
  const capacityToSave = Math.max(0, remainingToLive - discretionaryExpenses);
  const realCashflow = monthlyIncome - (mandatoryExpenses + discretionaryExpenses + profitableExpenses);

  // --- RENDEMENT PROJETÉ ---
  const yieldRate = (parseFloat(profile.investmentYield) || 0) / 100;
  const projectedAnnualYield = (profitableExpenses * 12) * yieldRate;

  // --- STOCKS ---
  const matelas = Math.abs(parseFloat(profile.savings) || 0); 
  const investments = Math.abs(parseFloat(profile.investments) || 0); 
  const totalWealth = matelas + investments + (parseFloat(profile.currentBalance) || 0);

  // --- RÈGLES ---
  const currentPersonaKey = (profile.persona || 'salaried').toUpperCase();
  // @ts-ignore
  const baseRules = PERSONA_PRESETS[currentPersonaKey]?.rules || PERSONA_PRESETS.SALARIED.rules;
  
  const adults = Math.max(1, parseInt(profile.household?.adults) || 1);
  const children = Math.max(0, parseInt(profile.household?.children) || 0);
  const adjustedMinLiving = baseRules.minLiving + ((adults - 1) * 150) + (children * 120);

  const userRules = { ...baseRules, minLiving: adjustedMinLiving };

  // Ratios
  const essentialMonthlyNeeds = mandatoryExpenses + (discretionaryExpenses * 0.5);
  let safetyMonths = 0;
  if (essentialMonthlyNeeds > 0) safetyMonths = matelas / essentialMonthlyNeeds;
  else if (matelas > 0) safetyMonths = 99;
  
  const dailyIncome = monthlyIncome > 0 ? monthlyIncome / CONSTANTS.AVG_WORK_DAYS_MONTH : 0;
  const engagementRate = monthlyIncome > 0 ? (mandatoryExpenses / monthlyIncome) * 100 : 0;

  return {
    monthlyIncome,
    mandatoryExpenses,
    discretionaryExpenses,
    profitableExpenses,
    projectedAnnualYield,
    totalRecurring,
    remainingToLive,
    realCashflow,
    engagementRate,
    matelas,
    investments,
    totalWealth,
    safetyMonths,
    dailyIncome,
    capacityToSave,
    rules: userRules, 
    firstName: profile.firstName || 'Utilisateur',
    persona: profile.persona || 'salaried'
  };
};

// ============================================================================
// NOUVEAU : LE TRANSFORMER (ÉTAPE 1)
// Il traduit l'intention d'achat en événements pour le moteur
// ============================================================================
const getSimulatedEvents = (purchase: any) => {
    const events = [];
    const amount = Math.abs(parseFloat(purchase.amount) || 0);
    // On normalise la date à midi
    const date = new Date(purchase.date);
    date.setHours(12,0,0,0);

    const mode = purchase.paymentMode;

    // Cas 1 : Cash (Compte Courant)
    if (mode === 'CASH_ACCOUNT') {
        events.push({ id: generateId(), name: purchase.name, amount: -amount, type: 'purchase', date: date });
        // Gestion Note de frais
        if (purchase.isReimbursable) {
            events.push({ id: generateId(), name: `Remboursement: ${purchase.name}`, amount: amount, type: 'income', date: addDays(date, 30) });
        }
    }
    // Cas 2 : Abonnement (Projection 24 mois)
    else if (mode === 'SUBSCRIPTION') {
        for (let i = 0; i < 24; i++) {
            events.push({ id: generateId(), name: purchase.name, amount: -amount, type: 'subscription', date: addMonths(date, i) });
        }
    }
    // Cas 3 : Crédit / Split
    else if (mode === 'CREDIT' || mode === 'SPLIT') {
        const months = Math.max(1, parseInt(purchase.duration) || 3);
        const rate = mode === 'CREDIT' ? parseFloat(purchase.rate || 0) : 0;
        const totalPaid = amount * (1 + (rate / 100) * (months / 12)); 
        const monthlyPart = totalPaid / months;

        for (let i = 0; i < months; i++) {
            events.push({
                id: generateId(), name: `${purchase.name} (${i + 1}/${months})`, amount: -monthlyPart, type: 'debt', date: addMonths(date, i)
            });
        }
    }
    // Cas 4 : Cash Savings -> Aucun événement timeline (géré dans le statique)

    return events;
};


// --- MOTEUR D'ANALYSE D'ACHAT (MODIFIÉ) ---
// On ajoute 'profile' et 'history' (optionnels) pour activer la simulation
export const analyzePurchaseImpact = (currentStats: any, purchase: any, profile: any = null, history: any[] = []) => {
  const amount = Math.abs(parseFloat(purchase.amount) || 0);
  const { isReimbursable = false, isPro = false } = purchase;
  const rules = currentStats.rules;

  // --- ANALYSE STATIQUE (GARDEE IDENTIQUE A TON CODE) ---
  let newMatelas = currentStats.matelas;
  let newRV = currentStats.remainingToLive;
  let monthlyCost = 0;
  let creditCost = 0;
  let opportunityCost = 0;
  let timeToWork = 0;
  let realCost = amount;

  // TA Logique Switch/Case existante
  if (purchase.paymentMode === 'CASH_SAVINGS') {
    newMatelas = Math.max(0, currentStats.matelas - amount);
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (purchase.paymentMode === 'CASH_ACCOUNT') {
    newRV = currentStats.remainingToLive - amount;
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (purchase.paymentMode === 'SUBSCRIPTION') {
    monthlyCost = amount;
    newRV = currentStats.remainingToLive - monthlyCost;
    const totalPaid5Years = amount * 12 * 5;
    if(!isReimbursable) opportunityCost = calculateFutureValue(totalPaid5Years, CONSTANTS.INVESTMENT_RATE, 5) - totalPaid5Years;
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
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  }

  if (isReimbursable) { realCost = 0; creditCost = 0; opportunityCost = 0; timeToWork = 0; }
  else if (isPro) { opportunityCost = 0; }

  if (currentStats.dailyIncome > 1 && !isReimbursable) {
    const costToCompare = purchase.paymentMode === 'SUBSCRIPTION' ? (amount * 12) : realCost;
    timeToWork = costToCompare / currentStats.dailyIncome;
  }

  const newMonthlyExpenses = currentStats.mandatoryExpenses + (monthlyCost > 0 ? monthlyCost : 0) + (currentStats.discretionaryExpenses * 0.5);
  let newSafetyMonths = 0;
  if (newMonthlyExpenses > 0) newSafetyMonths = newMatelas / newMonthlyExpenses;
  else if (newMatelas > 0) newSafetyMonths = 99;

  let newEngagementRate = 0;
  if (currentStats.monthlyIncome > 0) {
    newEngagementRate = ((currentStats.mandatoryExpenses + monthlyCost) / currentStats.monthlyIncome) * 100;
  }

  // ==========================================================================
  // NOUVEAU : SIMULATION & INSPECTION (ÉTAPE 2 & 3)
  // ==========================================================================
  let lowestProjectedBalance = Infinity;
  let firstDangerDate: string | null = null;
  const SAFETY_BUFFER = Math.max(100, (currentStats.monthlyIncome || 0) * 0.05); // 5% du revenu ou 100€

  if (profile) {
      // 1. Transformer
      const simulatedEvents = getSimulatedEvents(purchase);
      
      // 2. Simuler (Projection sur 45 jours)
      // On envoie le profil, l'historique et les événements simulés
      const projection = generateTimeline(profile, history, simulatedEvents, 45);
      
      // 3. Inspecter
      projection.forEach((month: any) => {
          month.days.forEach((day: any) => {
             // On ne regarde que le futur
             if (day.balance !== null) {
                 if (day.balance < lowestProjectedBalance) lowestProjectedBalance = day.balance;
                 // On note le PREMIER jour de crash
                 if (day.balance < 0 && !firstDangerDate) firstDangerDate = day.date;
             }
          });
      });
  }

  // --- SCORING (FUSION ANCIEN + NOUVEAU) ---
  const issues = [];
  const tips = [];
  let score = 100;

  // Tes règles statiques
  if (purchase.paymentMode === 'CASH_SAVINGS' && amount > currentStats.matelas) {
      issues.push({ level: 'red', text: `FONDS INSUFFISANTS : Tu n'as que ${formatCurrency(currentStats.matelas)} d'épargne.` });
      tips.push({ type: 'stop', title: "Bloquant", text: "Ton épargne ne couvre pas cet achat." });
      score -= 100;
  }

  const missingCash = rules.minLiving - newRV; 
  const isLiquidityIssue = purchase.paymentMode === 'CASH_ACCOUNT' && missingCash > 0;
  if (isLiquidityIssue) {
      if (newMatelas > missingCash) {
          issues.push({ level: 'orange', text: `Trésorerie : Compte courant bas.` });
          tips.push({ type: 'action', title: "Virement nécessaire", text: `Attention, prévois un virement de ${formatCurrency(missingCash)}.` });
          score -= 20;
      } else {
          issues.push({ level: 'red', text: `DANGER : Reste à vivre insuffisant.` });
          score -= 100;
      }
  }
  
  // NOUVELLE RÈGLE : MUR DE TRÉSORERIE (Prioritaire)
  if (lowestProjectedBalance < 0 && firstDangerDate) {
       const dateObj = new Date(firstDangerDate);
       const dateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
       
       issues.push({ level: 'red', text: `DANGER : Découvert prévu le ${dateStr}.` });
       tips.push({ type: 'stop', title: "Mur de Trésorerie", text: `Attention : tes charges fixes (loyer...) vont te faire passer à découvert le ${dateStr} si tu fais cet achat.` });
       score -= 100;
  } 
  else if (lowestProjectedBalance < SAFETY_BUFFER && lowestProjectedBalance >= 0) {
       issues.push({ level: 'orange', text: `Tension : Solde bas (${formatCurrency(lowestProjectedBalance)}).` });
       tips.push({ type: 'warning', title: "Marge faible", text: `Tu frôles la limite (${formatCurrency(SAFETY_BUFFER)} conseillés).` });
       score -= 25;
  }

  if (!isReimbursable) {
      if (newSafetyMonths < 1) {
          if (currentStats.safetyMonths > 0) {
             issues.push({ level: 'red', text: `Épargne de sécurité épuisée.` });
             score -= 40;
          }
      } else if (newSafetyMonths < rules.safetyMonths) {
          issues.push({ level: 'orange', text: `Fragilité : Sécurité sous l'objectif.` });
          score -= 20;
      }
  }

  if (newEngagementRate > 45 && !isReimbursable) {
    issues.push({ level: 'orange', text: `Charges élevées (${newEngagementRate.toFixed(0)}%).` });
    score -= 15;
  }

  let verdict = 'green';
  if (score < 50 || issues.some((i: any) => i.level === 'red')) verdict = 'red';
  else if (score < 80 || issues.some((i: any) => i.level === 'orange')) verdict = 'orange';

  let smartTip = "Tout est ok.";
  if (verdict === 'red') smartTip = "Achat dangereux ou impossible.";
  else if (verdict === 'orange') smartTip = "Faisable, mais attention aux imprévus.";
  else if (verdict === 'green') smartTip = "Feu vert, profite !";

  return { 
      verdict, score, issues, tips, 
      newMatelas, newRV, newSafetyMonths, newEngagementRate, 
      realCost, creditCost, opportunityCost, timeToWork, smartTip,
      lowestProjectedBalance // Pour afficher le solde min dans l'UI
  };
};
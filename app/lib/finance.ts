import { CONSTANTS, PERSONA_PRESETS } from './constants';
import { calculateFutureValue, formatCurrency, calculateListTotal, generateId } from './utils';
import { generateTimeline } from './timeline';
import { addMonths, addDays } from 'date-fns';

// ============================================================================
// 1. CALCULS DU PROFIL (DASHBOARD)
// ============================================================================
export const calculateFinancials = (profile: any) => {
  // Parsing sécurisé inline
  const getVal = (v: any) => Math.abs(parseFloat(v) || 0);

  // 1. REVENUS
  const monthlyIncome = calculateListTotal(profile.incomes);

  // 2. DÉPENSES
  const monthlyFixed = calculateListTotal(profile.fixedCosts) + calculateListTotal(profile.annualExpenses);
  const monthlySubs = calculateListTotal(profile.subscriptions);
  const monthlyCredits = calculateListTotal(profile.credits);
  const mandatoryExpenses = monthlyFixed + monthlySubs + monthlyCredits;

  const profitableExpenses = calculateListTotal(profile.savingsContributions);
  const discretionaryExpenses = getVal(profile.variableCosts);

  // 3. CAPACITÉS & RESTES
  const totalRecurring = mandatoryExpenses + profitableExpenses;
  const remainingToLive = monthlyIncome - totalRecurring;
  
  // Capacité d'épargne (Reste à vivre - Vie courante)
  const capacityToSave = Math.max(0, remainingToLive - discretionaryExpenses);
  // Cashflow réel (ce qui reste vraiment à la fin du mois sur le compte)
  const realCashflow = monthlyIncome - (mandatoryExpenses + discretionaryExpenses + profitableExpenses);

  // 4. PATRIMOINE
  const yieldRate = getVal(profile.investmentYield) / 100;
  const projectedAnnualYield = (profitableExpenses * 12) * yieldRate;

  const matelas = getVal(profile.savings); 
  const investments = getVal(profile.investments); 
  const totalWealth = matelas + investments + (parseFloat(profile.currentBalance) || 0);

  // 5. RÈGLES & PERSONA
  const currentPersonaKey = (profile.persona || 'salaried').toUpperCase();
  // @ts-ignore
  const baseRules = PERSONA_PRESETS[currentPersonaKey]?.rules || PERSONA_PRESETS.SALARIED.rules;
  
  const adults = Math.max(1, parseInt(profile.household?.adults) || 1);
  const children = Math.max(0, parseInt(profile.household?.children) || 0);
  // Ajustement du reste à vivre min selon la famille (150€/adulte supp, 120€/enfant)
  const adjustedMinLiving = baseRules.minLiving + ((adults - 1) * 150) + (children * 120);
  const userRules = { ...baseRules, minLiving: adjustedMinLiving };

  // 6. RATIOS
  const essentialMonthlyNeeds = mandatoryExpenses + (discretionaryExpenses * 0.5);
  let safetyMonths = 0;
  if (essentialMonthlyNeeds > 0) safetyMonths = matelas / essentialMonthlyNeeds;
  else if (matelas > 0) safetyMonths = 99; // Infini
  
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
// 2. TRANSFORMER : INTENTION -> ÉVÉNEMENTS
// Traduit un achat en série d'événements temporels
// ============================================================================
const getSimulatedEvents = (purchase: any) => {
    const events: any[] = [];
    const amount = Math.abs(parseFloat(purchase.amount) || 0);
    
    // Normalisation de la date à midi pour matcher timeline.ts
    const date = new Date(purchase.date);
    date.setHours(12, 0, 0, 0);

    const mode = purchase.paymentMode;

    // A. Paiement Comptant (Cash Account)
    if (mode === 'CASH_ACCOUNT') {
        events.push({ 
            id: generateId(), 
            name: purchase.name, 
            amount: -amount, 
            type: 'purchase', 
            date: date,
            isSimulation: true // <--- AJOUT CRITIQUE POUR LE JOUR J
        });
        if (purchase.isReimbursable) {
            events.push({ 
                id: generateId(), 
                name: `Remboursement: ${purchase.name}`, 
                amount: amount, 
                type: 'income', 
                date: addDays(date, 30),
                isSimulation: true 
            });
        }
    }
    // B. Abonnement (Projection sur 24 mois)
    else if (mode === 'SUBSCRIPTION') {
        for (let i = 0; i < 24; i++) {
            events.push({ 
                id: generateId(), 
                name: purchase.name, 
                amount: -amount, 
                type: 'subscription', 
                date: addMonths(date, i),
                isSimulation: true 
            });
        }
    }
    // C. Crédit ou Split
    else if (mode === 'CREDIT' || mode === 'SPLIT') {
        const months = Math.max(1, parseInt(purchase.duration) || 3);
        // Taux: 0 si split, X si crédit
        const rate = mode === 'CREDIT' ? parseFloat(purchase.rate || 0) : 0;
        const totalPaid = amount * (1 + (rate / 100) * (months / 12)); 
        const monthlyPart = totalPaid / months;

        for (let i = 0; i < months; i++) {
            events.push({
                id: generateId(), 
                name: `${purchase.name} (${i + 1}/${months})`, 
                amount: -monthlyPart, 
                type: 'debt', 
                date: addMonths(date, i),
                isSimulation: true
            });
        }
    }
    // D. Cash Savings : Pas d'impact timeline (géré en statique sur le stock)

    return events;
};


// ============================================================================
// 3. MOTEUR D'ANALYSE HYBRIDE (STATIQUE + DYNAMIQUE)
// ============================================================================
export const analyzePurchaseImpact = (currentStats: any, purchase: any, profile: any = null, history: any[] = []) => {
  const amount = Math.abs(parseFloat(purchase.amount) || 0);
  const { isReimbursable = false, isPro = false, paymentMode } = purchase;
  const rules = currentStats.rules;

  // --- A. ANALYSE STATIQUE (Impact immédiat sur les ratios) ---
  let newMatelas = currentStats.matelas;
  let newRemainingToLive = currentStats.remainingToLive; 
  
  let monthlyCost = 0;
  let creditCost = 0;
  let opportunityCost = 0;
  let timeToWork = 0;
  let realCost = amount;

  // 1. Calcul des coûts selon le mode
  if (paymentMode === 'CASH_SAVINGS') {
    newMatelas = Math.max(0, currentStats.matelas - amount);
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (paymentMode === 'CASH_ACCOUNT') {
    newRemainingToLive = currentStats.remainingToLive - amount;
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (paymentMode === 'SUBSCRIPTION') {
    monthlyCost = amount;
    newRemainingToLive = currentStats.remainingToLive - monthlyCost;
    const totalPaid5Years = amount * 12 * 5;
    if(!isReimbursable) opportunityCost = calculateFutureValue(totalPaid5Years, CONSTANTS.INVESTMENT_RATE, 5) - totalPaid5Years;
    realCost = amount * 12; 
  }
  else { // CREDIT / SPLIT
    const months = Math.max(1, parseInt(purchase.duration) || 3);
    const rate = paymentMode === 'CREDIT' ? Math.abs(parseFloat(purchase.rate) || 0) : 0;
    const totalPaid = amount * (1 + (rate / 100) * (months / 12)); 
    
    monthlyCost = totalPaid / months;
    if (paymentMode === 'CREDIT') {
        creditCost = totalPaid - amount;
        realCost = totalPaid;
    }
    newRemainingToLive = currentStats.remainingToLive - monthlyCost;
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  }

  // Nettoyage des coûts
  if (isReimbursable) { realCost = 0; creditCost = 0; opportunityCost = 0; timeToWork = 0; }
  else if (isPro) { opportunityCost = 0; }

  // Temps de travail
  if (currentStats.dailyIncome > 1 && !isReimbursable) {
    const costToCompare = paymentMode === 'SUBSCRIPTION' ? (amount * 12) : realCost;
    timeToWork = costToCompare / currentStats.dailyIncome;
  }

  // Ratios Projetés
  const newMonthlyExpenses = currentStats.mandatoryExpenses + (monthlyCost > 0 ? monthlyCost : 0) + (currentStats.discretionaryExpenses * 0.5);
  
  let newSafetyMonths = 0;
  if (newMonthlyExpenses > 0) newSafetyMonths = newMatelas / newMonthlyExpenses;
  else if (newMatelas > 0) newSafetyMonths = 99;

  let newEngagementRate = 0;
  if (currentStats.monthlyIncome > 0) {
    newEngagementRate = ((currentStats.mandatoryExpenses + monthlyCost) / currentStats.monthlyIncome) * 100;
  }

  // --- B. ANALYSE DYNAMIQUE (Timeline / Mur de Trésorerie) ---
  let lowestProjectedBalance = Infinity;
  let firstDangerDate: string | null = null;
  
  // SEUIL DE STRESS : 20% du revenu ou 150€ min.
  const STRESS_THRESHOLD = Math.max(150, (currentStats.monthlyIncome || 0) * 0.20);

  if (profile) {
      // 1. Simulation des events (AVEC LE FLAG isSimulation)
      const simulatedEvents = getSimulatedEvents(purchase);
      
      // 2. Projection (45 jours)
      const projection = generateTimeline(profile, history, simulatedEvents, 45);
      
      // 3. Inspection du futur
      projection.forEach((month: any) => {
          month.days.forEach((day: any) => {
             if (day.balance !== null) {
                 if (day.balance < lowestProjectedBalance) lowestProjectedBalance = day.balance;
                 // Capture du premier jour négatif
                 if (day.balance < 0 && !firstDangerDate) firstDangerDate = day.date;
             }
          });
      });
  }

  // --- C. SCORING & VERDICT ---
  const issues = [];
  const tips = [];
  let score = 100;

  // 1. Règles Bloquantes (Rouge)
  if (paymentMode === 'CASH_SAVINGS' && amount > currentStats.matelas) {
      issues.push({ level: 'red', text: `FONDS INSUFFISANTS : Épargne actuelle (${formatCurrency(currentStats.matelas)}).` });
      tips.push({ type: 'stop', title: "Bloquant", text: "Ton épargne ne couvre pas cet achat." });
      score -= 100;
  }

  // Mur de trésorerie (Dynamique)
  if (lowestProjectedBalance < 0 && firstDangerDate) {
       const dateObj = new Date(firstDangerDate);
       const dateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
       
       issues.push({ level: 'red', text: `DANGER : Découvert prévu le ${dateStr}.` });
       tips.push({ type: 'stop', title: "Mur de Trésorerie", text: `Attention : tes charges fixes vont te faire passer à découvert le ${dateStr} avec cet achat.` });
       score -= 100;
  }
  
  // Reste à vivre négatif (Statique)
  const missingCash = rules.minLiving - newRemainingToLive; 
  if (paymentMode === 'CASH_ACCOUNT' && missingCash > 0) {
      // Si on a du matelas pour couvrir, c'est orange, sinon rouge
      if (newMatelas > missingCash) {
          issues.push({ level: 'orange', text: `Trésorerie : Compte courant bas.` });
          tips.push({ type: 'action', title: "Virement nécessaire", text: `Prévois un virement de ${formatCurrency(missingCash)} depuis ton épargne.` });
          score -= 20;
      } else {
          issues.push({ level: 'red', text: `Reste à vivre insuffisant.` });
          score -= 100;
      }
  }

  // 2. Règles d'Avertissement (Orange)
  if (lowestProjectedBalance >= 0 && lowestProjectedBalance < STRESS_THRESHOLD) {
       issues.push({ level: 'orange', text: `Tension : Solde bas (${formatCurrency(lowestProjectedBalance)}).` });
       tips.push({ type: 'warning', title: "Fin de mois difficile", text: `Tu restes dans le vert, mais avec très peu de marge de manœuvre.` });
       score -= 25;
  }

  if (!isReimbursable) {
      if (newSafetyMonths < 1 && currentStats.safetyMonths > 0) {
           issues.push({ level: 'red', text: `Épargne de sécurité épuisée.` });
           score -= 40;
      } else if (newSafetyMonths < rules.safetyMonths) {
           issues.push({ level: 'orange', text: `Fragilité : Sécurité sous l'objectif.` });
           score -= 20;
      }
  }

  if (newEngagementRate > 45 && !isReimbursable) {
    issues.push({ level: 'orange', text: `Charges fixes élevées (${newEngagementRate.toFixed(0)}%).` });
    score -= 15;
  }

  // 3. Calcul Verdict Final
  let verdict = 'green';
  if (score < 50 || issues.some((i: any) => i.level === 'red')) verdict = 'red';
  else if (score < 80 || issues.some((i: any) => i.level === 'orange')) verdict = 'orange';

  let smartTip = "Tout est ok.";
  if (verdict === 'red') smartTip = "Achat dangereux ou impossible.";
  else if (verdict === 'orange') smartTip = "Faisable, mais attention aux imprévus.";
  else if (verdict === 'green') smartTip = "Feu vert, profite !";

  return { 
      verdict, score, issues, tips, 
      newMatelas, 
      newRV: newRemainingToLive, 
      newSafetyMonths, 
      newEngagementRate, 
      realCost, creditCost, opportunityCost, timeToWork, smartTip,
      lowestProjectedBalance 
  };
};
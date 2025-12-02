import { CONSTANTS, PERSONA_PRESETS } from './constants';
import { calculateFutureValue, formatCurrency, calculateListTotal, generateId } from './utils';
import { generateTimeline } from './timeline';
import { addMonths, addDays, isSameMonth, startOfDay, isBefore } from 'date-fns'; 

// Helper pour arrondir proprement
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// ============================================================================
// 1. CALCULS DU PROFIL (DASHBOARD)
// ============================================================================
export const calculateFinancials = (profile: any) => {
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
  
  // Capacité d'épargne
  const capacityToSave = Math.max(0, remainingToLive - discretionaryExpenses);
  // Cashflow réel
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
  
  const adjustedMinLiving = baseRules.minLiving + ((adults - 1) * 150) + (children * 120);
  const userRules = { ...baseRules, minLiving: adjustedMinLiving };

  // 6. RATIOS
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
// 2. TRANSFORMER : INTENTION -> ÉVÉNEMENTS
// ============================================================================
const getSimulatedEvents = (purchase: any) => {
    const events: any[] = [];
    const amount = Math.abs(parseFloat(purchase.amount) || 0);
    
    // Normalisation de la date à midi pour matcher timeline.ts
    const date = new Date(purchase.date || new Date());
    date.setHours(12, 0, 0, 0);

    const mode = purchase.paymentMode;

    if (mode === 'CASH_ACCOUNT') {
        events.push({ 
            id: generateId(), 
            name: purchase.name, 
            amount: -amount, 
            type: 'purchase', 
            date: date,
            isSimulation: true 
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
    else if (mode === 'CREDIT' || mode === 'SPLIT') {
        const months = Math.max(1, parseInt(purchase.duration) || 3);
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

    return events;
};


// ============================================================================
// 3. MOTEUR D'ANALYSE HYBRIDE (AVEC GESTION DU PASSÉ)
// ============================================================================
export const analyzePurchaseImpact = (currentStats: any, purchase: any, profile: any = null, history: any[] = []) => {
  const amount = Math.abs(parseFloat(purchase.amount) || 0);
  const { isReimbursable = false, isPro = false, paymentMode } = purchase;
  const rules = currentStats.rules;

  // 1. DÉTECTION TEMPORELLE (Régularisation vs Futur)
  const purchaseDate = purchase.date ? new Date(purchase.date) : new Date();
  const today = new Date();
  const isCurrentMonth = isSameMonth(today, purchaseDate);
  
  // On considère que c'est du passé si c'est avant aujourd'hui minuit
  const isPast = isBefore(startOfDay(purchaseDate), startOfDay(today));

  // --- A. ANALYSE STATIQUE (Impact théorique) ---
  let newMatelas = currentStats.matelas;
  let newRemainingToLive = currentStats.remainingToLive; 
  
  let monthlyCost = 0;
  let creditCost = 0;
  let opportunityCost = 0;
  let timeToWork = 0;
  let realCost = amount;

  // 2. Calculs selon le mode
  if (paymentMode === 'CASH_SAVINGS') {
    // Si c'est du passé, on suppose que l'épargne actuelle reflète déjà la dépense
    if (isPast) {
        newMatelas = currentStats.matelas; 
    } else {
        newMatelas = Math.max(0, round(currentStats.matelas - amount));
    }
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (paymentMode === 'CASH_ACCOUNT') {
    // Budget : Impacte le mois courant si la date est dans ce mois
    if (isCurrentMonth) {
        newRemainingToLive = round(currentStats.remainingToLive - amount);
    }
    // Trésorerie/Matelas :
    // Si passé : le solde bancaire actuel a déjà baissé, on ne touche pas au matelas projeté.
    // Si futur : on simule la baisse.
    if (!isPast) {
         // Note: Ici on simplifie en disant que ça tape dans le "matelas" virtuel si on paye comptant
         // Dans la réalité timeline, ça tape le solde.
    }
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (paymentMode === 'SUBSCRIPTION') {
    monthlyCost = amount;
    if (isCurrentMonth) {
        newRemainingToLive = round(currentStats.remainingToLive - monthlyCost);
    }
    const totalPaid5Years = amount * 12 * 5;
    if(!isReimbursable) opportunityCost = calculateFutureValue(totalPaid5Years, CONSTANTS.INVESTMENT_RATE, 5) - totalPaid5Years;
    realCost = amount * 12; 
  }
  else { // CREDIT / SPLIT
    const months = Math.max(1, parseInt(purchase.duration) || 3);
    const rate = paymentMode === 'CREDIT' ? Math.abs(parseFloat(purchase.rate) || 0) : 0;
    const totalPaid = amount * (1 + (rate / 100) * (months / 12)); 
    
    monthlyCost = round(totalPaid / months);
    if (paymentMode === 'CREDIT') {
        creditCost = round(totalPaid - amount);
        realCost = totalPaid;
    }
    if (isCurrentMonth) {
        newRemainingToLive = round(currentStats.remainingToLive - monthlyCost);
    }
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  }

  // Nettoyage des coûts
  if (isReimbursable) { realCost = 0; creditCost = 0; opportunityCost = 0; timeToWork = 0; }
  else if (isPro) { opportunityCost = 0; }

  // Temps de travail
  if (currentStats.dailyIncome > 1 && !isReimbursable) {
    const costToCompare = paymentMode === 'SUBSCRIPTION' ? (amount * 12) : realCost;
    timeToWork = round(costToCompare / currentStats.dailyIncome);
  }

  // Ratios Projetés
  const newMonthlyExpenses = currentStats.mandatoryExpenses + (monthlyCost > 0 ? monthlyCost : 0) + (currentStats.discretionaryExpenses * 0.5);
  
  let newSafetyMonths = 0;
  if (newMonthlyExpenses > 0) newSafetyMonths = round(newMatelas / newMonthlyExpenses);
  else if (newMatelas > 0) newSafetyMonths = 99;

  let newEngagementRate = 0;
  if (currentStats.monthlyIncome > 0) {
    newEngagementRate = round(((currentStats.mandatoryExpenses + monthlyCost) / currentStats.monthlyIncome) * 100);
  }

  // --- B. ANALYSE DYNAMIQUE (Timeline / Mur de Trésorerie) ---
  let lowestProjectedBalance = Infinity;
  let firstDangerDate: string | null = null;
  const STRESS_THRESHOLD = Math.max(150, (currentStats.monthlyIncome || 0) * 0.20);
  
  // Projection des 30 prochains jours pour le graphique
  let projectedCurve: any[] = [];

  if (profile) {
      const simulatedEvents = getSimulatedEvents(purchase);
      // Timeline gère déjà nativement les événements passés via "isBeforeAnchor"
      const projection = generateTimeline(profile, history, simulatedEvents, 45);
      
      const allDays = projection.flatMap((m: any) => m.days);
      
      // On récupère la courbe à partir d'aujourd'hui pour l'affichage
      const todayKey = startOfDay(new Date()).getTime();
      const futureDays = allDays.filter((d: any) => new Date(d.date).getTime() >= todayKey);

      projectedCurve = futureDays.slice(0, 30).map((d: any) => ({ 
          date: d.date, 
          value: d.balance 
      }));

      // Analyse des creux (Uniquement sur le futur)
      projection.forEach((month: any) => {
          month.days.forEach((day: any) => {
             // Si c'est passé, day.balance est null, donc ignoré
             if (day.balance !== null) {
                 if (day.balance < lowestProjectedBalance) lowestProjectedBalance = day.balance;
                 if (day.balance < 0 && !firstDangerDate) firstDangerDate = day.date;
             }
          });
      });
  }

  // --- C. SCORING & VERDICT (MATRICE) ---
  const issues = [];
  const tips = [];
  let score = 100;

  // 1. INDICATEUR BUDGET
  let isBudgetOk = true;
  if (paymentMode === 'CASH_SAVINGS') {
      isBudgetOk = newMatelas >= 0;
  } else {
      isBudgetOk = newRemainingToLive >= rules.minLiving; 
  }

  // 2. INDICATEUR TRÉSORERIE
  const isCashflowOk = lowestProjectedBalance >= 0;

  // --- D. CONSTRUCTION DU MESSAGE ---
  let verdict = 'green';
  let smartTitle = "Feu vert";
  let smartMessage = "Tout est ok.";

  // Cas Spécial : RÉGULARISATION (Passé)
  if (isPast) {
      verdict = 'green';
      smartTitle = "Mise à jour";
      smartMessage = "Dépense ajoutée à l'historique. Ton budget du mois a été ajusté.";
      // On n'analyse pas la trésorerie critique car c'est déjà payé
  }
  // Cas 1 : Bloquant absolu (Pas d'épargne pour payer comptant)
  else if (paymentMode === 'CASH_SAVINGS' && !isBudgetOk) {
      verdict = 'red';
      smartTitle = "Fonds insuffisants";
      smartMessage = `Il te manque ${formatCurrency(amount - currentStats.matelas)} d'épargne.`;
      score = 0;
      issues.push({ level: 'red', text: "Épargne insuffisante." });
  }
  // Cas 2 : Tout va bien
  else if (isBudgetOk && isCashflowOk) {
      verdict = 'green';
      smartTitle = "Fonce !";
      smartMessage = "C'est validé : ça rentre dans le budget et ton compte suit.";
  } 
  // Cas 3 : Problème de TIMING
  else if (isBudgetOk && !isCashflowOk) {
      verdict = 'orange';
      smartTitle = "Attends un peu";
      smartMessage = `Tu as le budget, mais ton compte passera à découvert (Min: ${formatCurrency(lowestProjectedBalance)}). Attends une entrée d'argent.`;
      score = 40;
      if (firstDangerDate) {
         const d = new Date(firstDangerDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'});
         issues.push({ level: 'red', text: `Découvert prévu le ${d}` });
      }
  } 
  // Cas 4 : Problème de LIFESTYLE
  else if (!isBudgetOk && isCashflowOk) {
      verdict = 'orange'; 
      smartTitle = "Attention au budget";
      smartMessage = "Ton compte le permet aujourd'hui, mais cet achat va trop réduire ton reste à vivre du mois.";
      score = 45;
      issues.push({ level: 'orange', text: "Reste à vivre sous le seuil de sécurité" });
  } 
  // Cas 5 : CATASTROPHE
  else {
      verdict = 'red';
      smartTitle = "Impossible";
      smartMessage = "Tu n'as ni le budget, ni la trésorerie. C'est un achat dangereux.";
      score = 10;
      issues.push({ level: 'red', text: "Double alerte : Budget et Trésorerie" });
  }

  // Règles additionnelles (Seulement pour le futur)
  if (!isPast && paymentMode !== 'CASH_SAVINGS' && !isReimbursable) {
      if (newSafetyMonths < rules.safetyMonths) {
           issues.push({ level: 'orange', text: `Sécurité faible (${newSafetyMonths.toFixed(1)} mois).` });
           score -= 10;
      }
      if (newEngagementRate > 45) {
           issues.push({ level: 'orange', text: `Charges fixes élevées.` });
           score -= 10;
      }
  }

  return { 
      verdict, 
      score: Math.max(0, score), 
      isBudgetOk,
      isCashflowOk,
      smartTitle,
      smartMessage,
      issues, 
      tips, 
      newMatelas, 
      newRV: newRemainingToLive, 
      newSafetyMonths, 
      newEngagementRate, 
      realCost: round(realCost), 
      creditCost: round(creditCost), 
      opportunityCost: round(opportunityCost), 
      timeToWork,
      lowestProjectedBalance: round(lowestProjectedBalance),
      projectedCurve
  };
};
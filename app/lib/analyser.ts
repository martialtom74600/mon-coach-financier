import { CONSTANTS } from './constants';
import { calculateFutureValue, formatCurrency } from './utils';
import { generateTimeline } from './timeline';
import { isSameMonth, startOfDay, isBefore } from 'date-fns';
import { getSimulatedEvents } from './simulator';
import { Purchase, Profile, AnalysisResult, PaymentMode } from './types'; // Import des types

// Helper pour arrondir proprement
const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * MODULE ANALYSEUR
 * Rôle : Juge de paix. Il prend les stats actuelles et une simulation d'achat,
 * et détermine si c'est une bonne idée (Vert/Orange/Rouge) + le score.
 */
export const analyzePurchaseImpact = (
    currentStats: any, // On garde any pour l'instant (c'est le retour de calculateFinancials)
    purchase: Purchase, 
    profile: Profile | null = null, 
    history: any[] = []
): AnalysisResult => {
  
  // Parsing sécurisé du montant
  const rawAmount = typeof purchase.amount === 'string' ? parseFloat(purchase.amount) : purchase.amount;
  const amount = Math.abs(rawAmount || 0);
  
  const { isReimbursable = false, isPro = false, paymentMode } = purchase;
  const rules = currentStats.rules;

  // 1. DÉTECTION TEMPORELLE (Régularisation vs Futur)
  const purchaseDate = purchase.date ? new Date(purchase.date) : new Date();
  const today = new Date();
  const isCurrentMonth = isSameMonth(today, purchaseDate);
  
  // On considère que c'est du passé si c'est avant aujourd'hui minuit
  const isPast = isBefore(startOfDay(purchaseDate), startOfDay(today));

  // --- A. ANALYSE STATIQUE (Impact théorique immédiat) ---
  let newMatelas = currentStats.matelas;
  let newRemainingToLive = currentStats.remainingToLive; 
  
  let monthlyCost = 0;
  let creditCost = 0;
  let opportunityCost = 0;
  let timeToWork = 0;
  let realCost = amount;

  // 2. Calculs selon le mode de paiement
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
    // Si futur : on simule la baisse dans la timeline dynamique plus bas.
    if (!isPast) {
         // Note: Ici on simplifie en disant que ça tape dans le "matelas" virtuel si on paye comptant
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
    const rawDuration = typeof purchase.duration === 'string' ? parseInt(purchase.duration) : purchase.duration;
    const months = Math.max(1, rawDuration || 3);
    
    const rawRate = typeof purchase.rate === 'string' ? parseFloat(purchase.rate) : purchase.rate;
    const rate = paymentMode === 'CREDIT' ? Math.abs(rawRate || 0) : 0;
    
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

  // Nettoyage des coûts (Cas spéciaux)
  if (isReimbursable) { realCost = 0; creditCost = 0; opportunityCost = 0; timeToWork = 0; }
  else if (isPro) { opportunityCost = 0; }

  // Temps de travail nécessaire
  if (currentStats.dailyIncome > 1 && !isReimbursable) {
    const costToCompare = paymentMode === 'SUBSCRIPTION' ? (amount * 12) : realCost;
    timeToWork = round(costToCompare / currentStats.dailyIncome);
  }

  // Ratios Projetés (Simulation des indicateurs post-achat)
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
  let projectedCurve: { date: string, value: number }[] = [];

  if (profile) {
      // APPEL AU SIMULATEUR EXTERNE ICI
      const simulatedEvents = getSimulatedEvents(purchase);
      
      // Timeline gère déjà nativement les événements passés via "isBeforeAnchor"
      const projection = generateTimeline(profile, history, simulatedEvents, 45);
      
      const allDays = projection.flatMap((m: any) => m.days);
      
      // On récupère la courbe à partir d'aujourd'hui pour l'affichage graphique
      const todayKey = startOfDay(new Date()).getTime();
      const futureDays = allDays.filter((d: any) => new Date(d.date).getTime() >= todayKey);

      projectedCurve = futureDays.slice(0, 30).map((d: any) => ({ 
          date: d.date, 
          value: d.balance 
      }));

      // Analyse des creux de trésorerie (Uniquement sur le futur)
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

  // --- C. SCORING & VERDICT (MATRICE DE DÉCISION) ---
  const issues: any[] = [];
  const tips: any[] = [];
  let score = 100;

  // 1. INDICATEUR BUDGET (Est-ce que j'ai les moyens ?)
  let isBudgetOk = true;
  if (paymentMode === 'CASH_SAVINGS') {
      isBudgetOk = newMatelas >= 0;
  } else {
      isBudgetOk = newRemainingToLive >= rules.minLiving; 
  }

  // 2. INDICATEUR TRÉSORERIE (Est-ce que je vais être à découvert ?)
  const isCashflowOk = lowestProjectedBalance >= 0;

  // --- D. CONSTRUCTION DU MESSAGE (FEEDBACK) ---
  let verdict: AnalysisResult['verdict'] = 'green';
  let smartTitle = "Feu vert";
  let smartMessage = "Tout est ok.";

  // Cas Spécial : RÉGULARISATION (Passé)
  if (isPast) {
      verdict = 'green';
      smartTitle = "Mise à jour";
      smartMessage = "Dépense ajoutée à l'historique. Ton budget du mois a été ajusté.";
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
  // Cas 3 : Problème de TIMING (J'ai l'argent mais pas au bon moment)
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
  // Cas 4 : Problème de LIFESTYLE (Je réduis trop mon niveau de vie)
  else if (!isBudgetOk && isCashflowOk) {
      verdict = 'orange'; 
      smartTitle = "Attention au budget";
      smartMessage = "Ton compte le permet aujourd'hui, mais cet achat va trop réduire ton reste à vivre du mois.";
      score = 45;
      issues.push({ level: 'orange', text: "Reste à vivre sous le seuil de sécurité" });
  } 
  // Cas 5 : CATASTROPHE (Ni budget, ni trésorerie)
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
      if (newEngagementRate > rules.maxDebt) {
           issues.push({ level: 'orange', text: `Taux d'effort élevé (${newEngagementRate}% > ${rules.maxDebt}%).` });
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
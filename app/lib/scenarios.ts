import { addDays, isLastDayOfMonth, addMonths, format, startOfMonth, differenceInDays, startOfDay, isBefore, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Profile, 
  Purchase, 
  AnalysisResult, 
  safeFloat, 
  generateId, 
  formatCurrency, 
  calculateFutureValue, 
  CONSTANTS,
  calculateListTotal,
  // ✅ ENUMS
  PaymentMode,
  ItemCategory,
  PurchaseType,
  FinancialItem
} from './definitions';

// ============================================================================
// 1. TYPES SPÉCIFIQUES TIMELINE
// ============================================================================

export interface TimelineEvent {
    id?: string;
    name: string;
    type: string;
    amount: number;
    isSimulation?: boolean;
    date?: string | Date;
    status?: 'safe' | 'danger';
}

export interface TimelineDay {
    date: string;
    dayOfMonth: number;
    balance: number | null;
    events: TimelineEvent[];
    status: 'safe' | 'danger';
}

export interface MonthData {
    id: string;
    label: string;
    days: TimelineDay[];
    stats: { balanceEnd: number };
}

// Configuration du lissage des dépenses variables (Dimanche -> Samedi)
const SPENDING_WEIGHTS = [ 1.3, 0.6, 0.6, 0.6, 0.6, 1.0, 2.3 ]; 

const toDateKey = (date: Date | string): string => format(typeof date === 'string' ? new Date(date) : date, 'yyyy-MM-dd');
const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;


// ============================================================================
// 2. SIMULATEUR (Découpage des paiements)
// ============================================================================
export const getSimulatedEvents = (purchase: Purchase) => {
    const events: any[] = [];
    const rawAmount = typeof purchase.amount === 'string' ? parseFloat(purchase.amount) : purchase.amount;
    const amount = Math.abs(rawAmount || 0);
    const date = new Date(purchase.date || new Date()); date.setHours(12, 0, 0, 0);
    
    // On normalise le mode de paiement (string -> Enum si besoin)
    const mode = purchase.paymentMode as PaymentMode;

    if (mode === PaymentMode.CASH_CURRENT) { // 'CASH_ACCOUNT' est devenu 'CASH_CURRENT'
        events.push({ id: generateId(), name: purchase.name, amount: -amount, type: 'purchase', date: date, isSimulation: true });
        if (purchase.isReimbursable) events.push({ id: generateId(), name: `Remboursement: ${purchase.name}`, amount: amount, type: 'income', date: addDays(date, 30), isSimulation: true });
    } 
    else if (mode === PaymentMode.SPLIT) { // On gère le split comme un paiement en plusieurs fois
        const rawDuration = purchase.duration;
        const duration = typeof rawDuration === 'string' ? parseInt(rawDuration) : rawDuration;
        const months = Math.max(1, duration || 3);
        const monthlyPart = amount / months;
        
        for (let i = 0; i < months; i++) {
             events.push({ id: generateId(), name: `${purchase.name} (${i + 1}/${months})`, amount: -monthlyPart, type: 'debt', date: addMonths(date, i), isSimulation: true });
        }
    } 
    else if (mode === PaymentMode.CREDIT) {
        const rawDuration = purchase.duration;
        const duration = typeof rawDuration === 'string' ? parseInt(rawDuration) : rawDuration;
        const months = Math.max(1, duration || 12);
        const rawRate = purchase.rate;
        const rateVal = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
        const rate = rateVal || 0;
        
        const totalPaid = amount * (1 + (rate / 100) * (months / 12)); 
        const monthlyPart = totalPaid / months;
        for (let i = 0; i < months; i++) {
             events.push({ id: generateId(), name: `${purchase.name} (${i + 1}/${months})`, amount: -monthlyPart, type: 'debt', date: addMonths(date, i), isSimulation: true });
        }
    }
    // Note: PaymentMode.CASH_SAVINGS n'impacte pas la timeline du compte courant, donc pas d'event généré ici.

    return events;
};


// ============================================================================
// 3. GÉNÉRATEUR TIMELINE (Le Moteur Graphique)
// ============================================================================
export const generateTimeline = (
    profile: Profile, 
    history: any[], 
    simulatedEvents: any[] = [], 
    daysToProject = 730
): MonthData[] => {
  
  const realToday = new Date();
  
  // Point de départ (Anchor)
  // Si on a une date de mise à jour récente, on l'utilise, sinon aujourd'hui
  let anchorDateRaw = profile.updatedAt ? new Date(profile.updatedAt) : realToday;
  const anchorDate = new Date(anchorDateRaw); anchorDate.setHours(12, 0, 0, 0);
  
  const startDateLoop = startOfMonth(anchorDate); startDateLoop.setHours(12, 0, 0, 0);

  let currentBalance = safeFloat(profile.currentBalance);
  
  // Calcul des dépenses variables lissées (tout sauf income/fixed/credit)
  const monthlyVarCost = safeFloat(profile.variableCosts ? calculateListTotal(profile.variableCosts) : 0);
  const avgDaily = monthlyVarCost / 30;
  const costPerWeekDay = SPENDING_WEIGHTS.map(w => avgDaily * w);

  // A. Gestion des Récurrents
  const recurringByDay = new Map<number, any[]>();
  
  const pushRecurring = (items: FinancialItem[], type: 'income' | 'expense', defaultDay: number) => {
      (items || []).forEach((item) => {
          const day = item.dayOfMonth || defaultDay;
          const amount = safeFloat(item.amount);
          if (amount > 0) {
              if (!recurringByDay.has(day)) recurringByDay.set(day, []);
              recurringByDay.get(day)?.push({ name: item.name, type: type, amount: type === 'income' ? amount : -amount });
          }
      });
  };
  
  // On utilise les tableaux pré-calculés du Profil ou on filtre manuellement si besoin
  pushRecurring(profile.incomes || [], 'income', 1);
  pushRecurring(profile.fixedCosts || [], 'expense', 5);
  pushRecurring(profile.subscriptions || [], 'expense', 10);
  pushRecurring(profile.credits || [], 'expense', 15);
  pushRecurring(profile.annualExpenses || [], 'expense', 1); // Simplification: on les met le 1er (à affiner si mois dispo)

  // Virements d'épargne programmés
  (profile.savingsContributions || []).forEach((i) => {
      const day = i.dayOfMonth || 5;
      const amount = safeFloat(i.amount);
      if(amount > 0) {
          if (!recurringByDay.has(day)) recurringByDay.set(day, []);
          recurringByDay.get(day)?.push({ name: `Épargne: ${i.name}`, type: 'expense', amount: -amount });
      }
  });

  // B. Gestion des Événements Ponctuels (Historique + Simu)
  const oneOffEventsMap = new Map<string, any[]>();
  const addOneOffEvent = (date: Date | string, event: any) => {
      const key = toDateKey(date);
      if (!oneOffEventsMap.has(key)) oneOffEventsMap.set(key, []);
      oneOffEventsMap.get(key)?.push(event);
  };

  if (Array.isArray(history)) {
      history.forEach((decision: any) => {
          // On ne prend que les achats payés via compte courant ou crédit (impact timeline)
          if (decision.paymentMode === PaymentMode.CASH_CURRENT || decision.paymentMode === PaymentMode.SPLIT || decision.paymentMode === PaymentMode.CREDIT) {
                // On recrée l'objet Purchase pour utiliser getSimulatedEvents
                const purchaseStruct: Purchase = {
                    name: decision.name,
                    amount: decision.amount,
                    date: decision.date,
                    type: decision.type,
                    paymentMode: decision.paymentMode,
                    duration: decision.duration,
                    rate: decision.rate,
                    isReimbursable: decision.isReimbursable,
                    isPro: decision.isPro
                };
                const evts = getSimulatedEvents(purchaseStruct);
                evts.forEach(e => addOneOffEvent(e.date, e));
          }
      });
  }
  if (simulatedEvents && simulatedEvents.length > 0) {
      simulatedEvents.forEach((s: any) => addOneOffEvent(s.date, s));
  }

  // C. Boucle de Projection
  const monthsMap = new Map<string, MonthData>();
  const daysFromStartToAnchor = differenceInDays(anchorDate, startDateLoop);
  const totalDays = Math.abs(daysFromStartToAnchor) + daysToProject;
  const anchorKey = toDateKey(anchorDate);
  let runningBalance = 0;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDateLoop, i); 
    currentDate.setHours(12, 0, 0, 0); 
    
    const dateKey = toDateKey(currentDate);
    const dayNum = currentDate.getDate();
    const isMonthEnd = isLastDayOfMonth(currentDate);
    const monthKey = format(currentDate, 'yyyy-MM');
    const isBeforeAnchor = dateKey < anchorKey;
    const isAnchorDay = dateKey === anchorKey;
    
    const eventsOfTheDay: TimelineEvent[] = [];
    let dailyNegativeImpact = 0; 
    let dailyPositiveImpact = 0; 
    let simulationImpact = 0;

    const addEvents = (events: any[]) => {
        if (!events) return;
        events.forEach(e => {
            eventsOfTheDay.push({ id: generateId(), ...e });
            if (e.isSimulation) simulationImpact += e.amount;
            else { if (e.amount < 0) dailyNegativeImpact += e.amount; else dailyPositiveImpact += e.amount; }
        });
    };

    // Ajout des événements du jour
    if (recurringByDay.has(dayNum)) addEvents(recurringByDay.get(dayNum) || []);
    // Si fin de mois, on ramasse ceux qui tombent le 31
    if (isMonthEnd) { 
        for (let d = dayNum + 1; d <= 31; d++) { 
            if (recurringByDay.has(d)) addEvents(recurringByDay.get(d) || []); 
        } 
    }
    if (oneOffEventsMap.has(dateKey)) addEvents(oneOffEventsMap.get(dateKey) || []);

    // Coût de la vie lissé
    let dailyLivingCost = 0;
    if (!isBeforeAnchor && !isAnchorDay && monthlyVarCost > 0) {
        const currentWeekDay = currentDate.getDay(); 
        dailyLivingCost = -costPerWeekDay[currentWeekDay];
    }

    // Calcul du Solde
    if (isAnchorDay) {
        // Reset au solde réel saisi par l'utilisateur
        runningBalance = safeFloat(profile.currentBalance);
        // On applique les dépenses prévues ce jour-là par prudence
        runningBalance += dailyNegativeImpact; 
        runningBalance += simulationImpact;
    } else if (!isBeforeAnchor) {
        runningBalance += dailyNegativeImpact + dailyPositiveImpact + simulationImpact + dailyLivingCost;
    }

    // Construction de la structure de données
    if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, { 
            id: monthKey, 
            label: format(currentDate, 'MMMM yyyy', { locale: fr }), 
            days: [], 
            stats: { balanceEnd: 0 } 
        });
    }
    
    const currentMonthData = monthsMap.get(monthKey)!;
    
    currentMonthData.days.push({
        date: currentDate.toISOString(), 
        dayOfMonth: dayNum,
        balance: isBeforeAnchor ? null : Math.round(runningBalance),
        events: eventsOfTheDay, 
        status: !isBeforeAnchor && runningBalance < 0 ? 'danger' : 'safe'
    });

    if (!isBeforeAnchor) {
        currentMonthData.stats.balanceEnd = Math.round(runningBalance);
    }
  }

  return Array.from(monthsMap.values());
};


// ============================================================================
// 4. ANALYSEUR D'ACHAT (Qui utilise la Timeline)
// ============================================================================
export const analyzePurchaseImpact = (
    currentStats: any, 
    purchase: Purchase, 
    profile: Profile | null = null, 
    history: any[] = []
): AnalysisResult => {
  
  const rawAmount = typeof purchase.amount === 'string' ? parseFloat(purchase.amount) : purchase.amount;
  const amount = Math.abs(rawAmount || 0);
  const { isReimbursable = false, isPro = false } = purchase;
  // On caste en PaymentMode
  const paymentMode = purchase.paymentMode as PaymentMode;
  
  const rules = currentStats.rules;
  const purchaseDate = purchase.date ? new Date(purchase.date) : new Date();
  const today = new Date();
  const isCurrentMonth = isSameMonth(today, purchaseDate);
  const isPast = isBefore(startOfDay(purchaseDate), startOfDay(today));

  let newMatelas = currentStats.matelas;
  let newRemainingToLive = currentStats.remainingToLive; 
  let monthlyCost = 0, creditCost = 0, opportunityCost = 0, timeToWork = 0, realCost = amount;

  if (paymentMode === PaymentMode.CASH_SAVINGS) {
    if (!isPast) newMatelas = Math.max(0, round(currentStats.matelas - amount));
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  else if (paymentMode === PaymentMode.CASH_CURRENT) {
    if (isCurrentMonth) newRemainingToLive = round(currentStats.remainingToLive - amount);
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  } 
  // Note: On n'a plus de mode 'SUBSCRIPTION' dans l'Enum par défaut, on le traite comme un split ou cash recurrent
  // Si tu veux garder Subscription, ajoute-le à l'Enum PaymentMode
  else { 
    // SPLIT ou CREDIT
    const rawDuration = typeof purchase.duration === 'string' ? parseInt(purchase.duration) : purchase.duration;
    const months = Math.max(1, rawDuration || 3);
    const rawRate = typeof purchase.rate === 'string' ? parseFloat(purchase.rate) : purchase.rate;
    const rate = paymentMode === PaymentMode.CREDIT ? Math.abs(rawRate || 0) : 0;
    
    const totalPaid = amount * (1 + (rate / 100) * (months / 12)); 
    monthlyCost = round(totalPaid / months);
    
    if (paymentMode === PaymentMode.CREDIT) { creditCost = round(totalPaid - amount); realCost = totalPaid; }
    if (isCurrentMonth) newRemainingToLive = round(currentStats.remainingToLive - monthlyCost);
    if(!isReimbursable) opportunityCost = calculateFutureValue(amount, CONSTANTS.INVESTMENT_RATE, 10) - amount;
  }

  if (isReimbursable) { realCost = 0; creditCost = 0; opportunityCost = 0; timeToWork = 0; }
  else if (isPro) { opportunityCost = 0; }

  // Projection Timeline
  let lowestProjectedBalance = Infinity;
  let projectedCurve: { date: string, value: number }[] = [];
  
  if (profile) {
      const simulatedEvents = getSimulatedEvents(purchase);
      const projection = generateTimeline(profile, history, simulatedEvents, 45);
      const allDays = projection.flatMap((m) => m.days);
      const todayKey = startOfDay(new Date()).getTime();
      const futureDays = allDays.filter((d) => new Date(d.date).getTime() >= todayKey);
      
      projectedCurve = futureDays.slice(0, 30).map((d) => ({ date: d.date, value: d.balance || 0 }));
      
      projection.forEach((month) => {
          month.days.forEach((day) => {
              if (day.balance !== null) {
                  if (day.balance < lowestProjectedBalance) lowestProjectedBalance = day.balance;
              }
          });
      });
  }

  // Verdict
  let isBudgetOk = true;
  if (paymentMode === PaymentMode.CASH_SAVINGS) isBudgetOk = newMatelas >= 0;
  else isBudgetOk = newRemainingToLive >= rules.minLiving; 
  
  const isCashflowOk = lowestProjectedBalance >= 0;

  let verdict: AnalysisResult['verdict'] = 'green';
  let smartTitle = "Feu vert";
  let smartMessage = "Tout est ok.";
  let score = 100;
  // const issues: any[] = []; const tips: any[] = []; // Inutilisés dans cette version simplifiée

  if (isPast) { 
      verdict = 'green'; smartTitle = "Mise à jour"; smartMessage = "Historique mis à jour."; 
  } else if (paymentMode === PaymentMode.CASH_SAVINGS && !isBudgetOk) {
      verdict = 'red'; smartTitle = "Fonds insuffisants"; smartMessage = `Manque ${formatCurrency(amount - currentStats.matelas)} d'épargne.`; score = 0;
  } else if (isBudgetOk && isCashflowOk) {
      verdict = 'green'; smartTitle = "Fonce !"; smartMessage = "Validé : Budget et Trésorerie OK.";
  } else if (isBudgetOk && !isCashflowOk) {
      verdict = 'orange'; smartTitle = "Attends un peu"; smartMessage = "Risque de découvert. Attends une rentrée d'argent."; score = 40;
  } else if (!isBudgetOk && isCashflowOk) {
      verdict = 'orange'; smartTitle = "Attention au budget"; smartMessage = "Reste à vivre trop faible."; score = 45;
  } else {
      verdict = 'red'; smartTitle = "Impossible"; smartMessage = "Ni budget, ni trésorerie."; score = 10;
  }

  return { verdict, score: Math.max(0, score), isBudgetOk, isCashflowOk, smartTitle, smartMessage, issues: [], tips: [], newMatelas, newRV: newRemainingToLive, newSafetyMonths: 0, newEngagementRate: 0, realCost: round(realCost), creditCost: round(creditCost), opportunityCost: round(opportunityCost), timeToWork, lowestProjectedBalance: round(lowestProjectedBalance), projectedCurve };
};
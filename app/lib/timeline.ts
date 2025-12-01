import { 
  addDays, 
  startOfDay, 
  getDate, 
  isLastDayOfMonth, 
  getDaysInMonth,
  addMonths,
  isSameDay,
  format,
  isBefore,
  startOfMonth,
  isAfter,
  differenceInDays
} from 'date-fns';
import { fr } from 'date-fns/locale';

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Parsing sécurisé
const safeFloat = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const clean = String(val).replace(/[\s\u00A0]/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

export const generateTimeline = (profile: any, history: any[], simulatedEvents: any[] = [], daysToProject = 730) => {
  
  // 1. DÉFINITION DU "PRÉSENT"
  const realToday = new Date();
  realToday.setHours(12, 0, 0, 0);

  // 2. L'ANCRE TEMPORELLE (Le point de vérité)
  // On cherche la date de "balanceDate" (mise à jour via le bouton sauvegarde)
  // Sinon "updatedAt" (base de données), Sinon Aujourd'hui.
  const anchorDate = profile.balanceDate 
    ? new Date(profile.balanceDate) 
    : (profile.updatedAt ? new Date(profile.updatedAt) : realToday);
    
  anchorDate.setHours(12, 0, 0, 0);

  // 3. DÉBUT DE L'AFFICHAGE (VISUEL)
  // On recule au 1er du mois de l'ancre pour avoir un calendrier propre
  const startDateLoop = startOfMonth(anchorDate);
  startDateLoop.setHours(12, 0, 0, 0);

  // Solde de départ (sera appliqué le jour de l'ancre)
  let currentBalance = safeFloat(profile.currentBalance);

  // 4. ÉVÉNEMENTS RÉCURRENTS (TA LOGIQUE INTACTE)
  const recurringEvents = [
    ...(profile.incomes || []).map((i: any) => ({ name: i.name, type: 'income', day: parseInt(i.dayOfMonth) || 1, amount: safeFloat(i.amount) })),
    ...(profile.fixedCosts || []).map((i: any) => ({ name: i.name, type: 'expense', day: parseInt(i.dayOfMonth) || 5, amount: safeFloat(i.amount) })),
    ...(profile.subscriptions || []).map((i: any) => ({ name: i.name, type: 'expense', day: parseInt(i.dayOfMonth) || 10, amount: safeFloat(i.amount) })),
    ...(profile.credits || []).map((i: any) => ({ name: i.name, type: 'expense', day: parseInt(i.dayOfMonth) || 15, amount: safeFloat(i.amount) })),
    ...(profile.savingsContributions || []).map((i: any) => ({ name: `Épargne: ${i.name}`, type: 'expense', day: parseInt(i.dayOfMonth) || 20, amount: safeFloat(i.amount) })),
  ];

  // 5. HISTORIQUE (TA LOGIQUE INTACTE)
  const historyEvents: any[] = [];
  if (Array.isArray(history)) {
    history.forEach((decision: any) => {
        if (!decision.purchase) return;
        const p = decision.purchase;
        const amount = safeFloat(p.amount);
        const d = new Date(p.date || decision.date);
        d.setHours(12,0,0,0);

        if (p.paymentMode === 'CASH_FLOW' || p.paymentMode === 'CASH_ACCOUNT') {
            historyEvents.push({ date: d, amount: -amount, name: p.name, type: 'purchase' });
        }
        else if ((p.paymentMode === 'CREDIT' || p.paymentMode === 'SPLIT') && p.duration) {
            const duration = parseInt(p.duration) || 1;
            const monthlyPart = amount / duration;
            for (let i = 0; i < duration; i++) {
                const payDate = addMonths(d, i);
                payDate.setHours(12,0,0,0);
                historyEvents.push({ date: payDate, amount: -monthlyPart, name: `${p.name} (${i + 1}/${duration})`, type: 'debt' });
            }
        }
    });
  }

  // 6. LISSAGE VIE COURANTE
  const dailyVariableCost = safeFloat(profile.variableCosts) / 30;

  // --- BOUCLE PRINCIPALE ---
  const monthsMap = new Map();

  // On calcule combien de jours il y a entre le début de l'affichage et l'ancre
  const daysFromStartToAnchor = differenceInDays(anchorDate, startDateLoop);
  // On projette X jours APRÈS l'ancre (pour garantir le futur)
  const totalDays = Math.abs(daysFromStartToAnchor) + daysToProject;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDateLoop, i);
    const dayNum = currentDate.getDate();
    const isMonthEnd = isLastDayOfMonth(currentDate);
    const daysInCurrentMonth = getDaysInMonth(currentDate);
    const monthKey = format(currentDate, 'yyyy-MM');

    // LOGIQUE TEMPORELLE
    // Est-ce qu'on est avant la date de vérité ?
    const isBeforeAnchor = isBefore(currentDate, anchorDate);
    const isAnchorDay = isSameDay(currentDate, anchorDate);
    
    // Le moteur ne calcule que si on a atteint ou dépassé l'ancre
    const shouldCalculate = !isBeforeAnchor;

    if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
            id: monthKey,
            label: format(currentDate, 'MMMM yyyy', { locale: fr }),
            days: [],
            stats: { balanceEnd: 0 }
        });
    }
    const currentMonthData = monthsMap.get(monthKey);

    let dailyImpact = 0;
    const eventsOfTheDay: any[] = [];

    // A. Récurrents
    recurringEvents.forEach((e: any) => {
        const isTargetDay = e.day === dayNum;
        const isFallback = e.day > daysInCurrentMonth && isMonthEnd;

        if ((isTargetDay || isFallback) && e.amount > 0) {
            const val = e.type === 'income' ? e.amount : -e.amount;
            eventsOfTheDay.push({ id: generateId(), name: e.name, amount: val, type: e.type });
            // On n'applique au solde que si le calcul est actif
            if (shouldCalculate) dailyImpact += val;
        }
    });

    // B. Fusion Historique + Simulation
    const allOneOffEvents = [...historyEvents];
    // Injection du nouveau moteur (Simulated Events)
    if (simulatedEvents && simulatedEvents.length > 0) {
        simulatedEvents.forEach((s: any) => allOneOffEvents.push({ ...s, date: new Date(s.date) }));
    }

    allOneOffEvents.forEach((h: any) => {
        const hDate = new Date(h.date);
        hDate.setHours(12,0,0,0);
        if (isSameDay(currentDate, hDate)) {
            eventsOfTheDay.push({ id: generateId(), name: h.name, amount: h.amount, type: h.type });
            if (shouldCalculate) dailyImpact += h.amount;
        }
    });

    // C. Vie courante
    // On ne déduit pas le jour de l'ancre (on suppose que le solde saisi est net)
    if (shouldCalculate && !isAnchorDay && dailyVariableCost > 0 && currentBalance > 0) {
        dailyImpact -= dailyVariableCost;
    }

    // MISE À JOUR DU SOLDE (C'est ici que la magie opère)
    if (isAnchorDay) {
        // RESET : C'est le jour de vérité, on force la valeur saisie par l'utilisateur
        currentBalance = safeFloat(profile.currentBalance);
    } 
    else if (shouldCalculate) {
        // ÉVOLUTION : Pour les jours suivants, on applique les mouvements
        currentBalance += dailyImpact;
    }

    // PUSH DU JOUR
    currentMonthData.days.push({
        date: currentDate.toISOString(),
        dayOfMonth: dayNum,
        // Si avant l'ancre -> null (case grisée/vide)
        // Si après -> solde calculé
        balance: isBeforeAnchor ? null : Math.round(currentBalance),
        events: eventsOfTheDay,
        status: !isBeforeAnchor && currentBalance < 0 ? 'danger' : 'safe'
    });
    
    // On met à jour la stat de fin de mois uniquement si on a des données calculées
    if (shouldCalculate) {
        currentMonthData.stats.balanceEnd = Math.round(currentBalance);
    }
  }

  return Array.from(monthsMap.values());
};
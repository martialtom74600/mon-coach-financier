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
  isAfter
} from 'date-fns';
import { fr } from 'date-fns/locale';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Parsing sécurisé
const safeFloat = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const clean = String(val).replace(/[\s\u00A0]/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

export const generateTimeline = (profile: any, history: any[], daysToProject = 730) => {
  
  // 1. DATES PIVOTS
  // "Vrai" aujourd'hui (Midi pour éviter les bugs UTC)
  const realToday = new Date();
  realToday.setHours(12, 0, 0, 0);

  // Le début de la timeline (1er du mois en cours)
  const startDateLoop = startOfMonth(realToday);
  startDateLoop.setHours(12, 0, 0, 0);

  // Solde initial (Saisi par l'utilisateur, considéré comme le solde "Actuel")
  let currentBalance = safeFloat(profile.currentBalance);

  // 2. Événements Récurrents
  const recurringEvents = [
    ...(profile.incomes || []).map((i: any) => ({ name: i.name, type: 'income', day: parseInt(i.dayOfMonth) || 1, amount: safeFloat(i.amount) })),
    ...(profile.fixedCosts || []).map((i: any) => ({ name: i.name, type: 'expense', day: parseInt(i.dayOfMonth) || 5, amount: safeFloat(i.amount) })),
    ...(profile.subscriptions || []).map((i: any) => ({ name: i.name, type: 'expense', day: parseInt(i.dayOfMonth) || 10, amount: safeFloat(i.amount) })),
    ...(profile.credits || []).map((i: any) => ({ name: i.name, type: 'expense', day: parseInt(i.dayOfMonth) || 15, amount: safeFloat(i.amount) })),
    ...(profile.savingsContributions || []).map((i: any) => ({ name: `Épargne: ${i.name}`, type: 'expense', day: parseInt(i.dayOfMonth) || 20, amount: safeFloat(i.amount) })),
  ];

  // 3. Événements Historique
  const historyEvents: any[] = [];
  if (Array.isArray(history)) {
    history.forEach((decision: any) => {
        if (!decision.result || !decision.purchase) return;
        const p = decision.purchase;
        const amount = safeFloat(p.amount);
        // Date normalisée
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

  // 4. Lissage
  const dailyVariableCost = safeFloat(profile.variableCosts) / 30;

  // --- BOUCLE ---
  const monthsMap = new Map();

  // On calcule le décalage pour commencer au 1er du mois
  const daysSinceStartOfMonth = Math.floor((realToday.getTime() - startDateLoop.getTime()) / (1000 * 60 * 60 * 24));
  // On projette sur 2 ans + les quelques jours du début de mois déjà écoulés
  const totalDays = daysToProject + daysSinceStartOfMonth;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDateLoop, i);
    const dayNum = currentDate.getDate();
    const isMonthEnd = isLastDayOfMonth(currentDate);
    const daysInCurrentMonth = getDaysInMonth(currentDate);
    
    // EST-CE DU PASSÉ ? (Avant aujourd'hui minuit)
    // On utilise une comparaison stricte pour éviter que "Aujourd'hui" soit considéré comme passé
    const isPast = isBefore(currentDate, realToday) && !isSameDay(currentDate, realToday);

    const monthKey = format(currentDate, 'yyyy-MM');

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
            
            // On affiche l'événement même si c'est du passé (pour mémoire)
            eventsOfTheDay.push({ id: generateId(), name: e.name, amount: val, type: e.type });

            // MAIS on n'impacte le solde QUE si c'est futur ou aujourd'hui
            // (Car le solde 'currentBalance' contient déjà l'impact du passé)
            if (!isPast) {
                dailyImpact += val;
            }
        }
    });

    // B. Historique
    historyEvents.forEach((h: any) => {
        if (isSameDay(currentDate, h.date)) {
            eventsOfTheDay.push({ id: generateId(), name: h.name, amount: h.amount, type: h.type });
            if (!isPast) {
                dailyImpact += h.amount;
            }
        }
    });

    // C. Vie courante (Futur seulement)
    if (!isPast && dailyVariableCost > 0 && currentBalance > 0) {
        dailyImpact -= dailyVariableCost;
    }

    // Mise à jour du solde (Seulement à partir d'aujourd'hui)
    if (!isPast) {
        currentBalance += dailyImpact;
    }

    // PUSH DU JOUR
    currentMonthData.days.push({
        date: currentDate.toISOString(),
        dayOfMonth: dayNum,
        // Si c'est passé : on met null (CalendarView affichera "Passé" ou grisé)
        // Si c'est futur/aujourd'hui : on met le solde calculé
        balance: isPast ? null : Math.round(currentBalance),
        events: eventsOfTheDay,
        status: !isPast && currentBalance < 0 ? 'danger' : 'safe'
    });
    
    // On garde le dernier solde connu pour la fin de mois
    currentMonthData.stats.balanceEnd = Math.round(currentBalance);
  }

  return Array.from(monthsMap.values());
};
import { 
  addDays, 
  startOfDay, 
  isLastDayOfMonth, 
  getDaysInMonth,
  addMonths,
  isSameDay,
  format,
  isBefore,
  startOfMonth,
  differenceInDays,
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';

// --- CORRECTION : Import depuis utils pour éviter le conflit d'export ---
import { generateId } from './utils';

// Parsing sécurisé
const safeFloat = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const clean = String(val).replace(/[\s\u00A0]/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

// Helper pour normaliser les clés de date (YYYY-MM-DD)
const toDateKey = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'yyyy-MM-dd');
};

// --- CONFIGURATION DU LISSAGE DES DÉPENSES ---
// Répartition psychologique des dépenses variables (Courses/Loisirs) sur la semaine
// Index: 0=Dimanche, 1=Lundi, ... 6=Samedi
const SPENDING_WEIGHTS = [
    1.3, // Dimanche (Loisirs/Famille)
    0.6, // Lundi (Calme)
    0.6, // Mardi
    0.6, // Mercredi
    0.6, // Jeudi
    1.0, // Vendredi (Sortie)
    2.3  // Samedi (Gros courses + Sortie)
];

export const generateTimeline = (profile: any, history: any[], simulatedEvents: any[] = [], daysToProject = 730) => {
  
  // 1. DÉFINITION DU "PRÉSENT" ET ANCRE
  const realToday = new Date();
  
  let anchorDateRaw = profile.balanceDate 
    ? new Date(profile.balanceDate) 
    : (profile.updatedAt ? new Date(profile.updatedAt) : realToday);

  const anchorDate = new Date(anchorDateRaw);
  anchorDate.setHours(12, 0, 0, 0);

  const startDateLoop = startOfMonth(anchorDate);
  startDateLoop.setHours(12, 0, 0, 0);

  let currentBalance = safeFloat(profile.currentBalance);

  // --- PRÉPARATION DES DÉPENSES VARIABLES PONDÉRÉES ---
  const monthlyVarCost = safeFloat(profile.variableCosts);
  const avgDaily = monthlyVarCost / 30;
  const costPerWeekDay = SPENDING_WEIGHTS.map(w => avgDaily * w);

  // =================================================================================
  // OPTIMISATION 1 : PRÉ-CLASSEMENT DES ÉVÉNEMENTS RÉCURRENTS
  // =================================================================================
  const recurringByDay = new Map<number, any[]>();

  const pushRecurring = (items: any[], type: string, defaultDay: number) => {
      (items || []).forEach((item: any) => {
          const day = parseInt(item.dayOfMonth) || defaultDay;
          const amount = safeFloat(item.amount);
          if (amount > 0) {
              if (!recurringByDay.has(day)) recurringByDay.set(day, []);
              recurringByDay.get(day)?.push({
                  name: item.name, 
                  type: type,
                  amount: type === 'income' ? amount : -amount
              });
          }
      });
  };

  pushRecurring(profile.incomes, 'income', 1);
  pushRecurring(profile.fixedCosts, 'expense', 5);
  pushRecurring(profile.subscriptions, 'expense', 10);
  pushRecurring(profile.credits, 'expense', 15);
  (profile.savingsContributions || []).forEach((i: any) => {
      const day = parseInt(i.dayOfMonth) || 20;
      const amount = safeFloat(i.amount);
      if(amount > 0) {
          if (!recurringByDay.has(day)) recurringByDay.set(day, []);
          recurringByDay.get(day)?.push({ name: `Épargne: ${i.name}`, type: 'expense', amount: -amount });
      }
  });

  // =================================================================================
  // OPTIMISATION 2 : PRÉ-CLASSEMENT DE L'HISTORIQUE ET SIMULATIONS
  // =================================================================================
  const oneOffEventsMap = new Map<string, any[]>();

  const addOneOffEvent = (date: Date | string, event: any) => {
      const key = toDateKey(date);
      if (!oneOffEventsMap.has(key)) oneOffEventsMap.set(key, []);
      oneOffEventsMap.get(key)?.push(event);
  };

  // A. Historique
  if (Array.isArray(history)) {
      history.forEach((decision: any) => {
          if (!decision.purchase) return;
          const p = decision.purchase;
          const amount = safeFloat(p.amount);
          const d = new Date(p.date || decision.date);

          if (p.paymentMode === 'CASH_FLOW' || p.paymentMode === 'CASH_ACCOUNT') {
              addOneOffEvent(d, { name: p.name, amount: -amount, type: 'purchase' });
          }
          else if ((p.paymentMode === 'CREDIT' || p.paymentMode === 'SPLIT') && p.duration) {
              const duration = parseInt(p.duration) || 1;
              const monthlyPart = amount / duration;
              for (let i = 0; i < duration; i++) {
                  const payDate = addMonths(d, i);
                  addOneOffEvent(payDate, { 
                      name: `${p.name} (${i + 1}/${duration})`, 
                      amount: -monthlyPart, 
                      type: 'debt' 
                  });
              }
          }
      });
  }

  // B. Simulations
  if (simulatedEvents && simulatedEvents.length > 0) {
      simulatedEvents.forEach((s: any) => {
          addOneOffEvent(s.date, { ...s });
      });
  }

  // =================================================================================
  // BOUCLE PRINCIPALE (PROJECTION)
  // =================================================================================
  const monthsMap = new Map();
  const daysFromStartToAnchor = differenceInDays(anchorDate, startDateLoop);
  const totalDays = Math.abs(daysFromStartToAnchor) + daysToProject;
  const anchorKey = toDateKey(anchorDate);

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDateLoop, i);
    currentDate.setHours(12, 0, 0, 0); 
    
    const dateKey = toDateKey(currentDate);
    const dayNum = currentDate.getDate();
    const isMonthEnd = isLastDayOfMonth(currentDate);
    const monthKey = format(currentDate, 'yyyy-MM');

    const isBeforeAnchor = dateKey < anchorKey;
    const isAnchorDay = dateKey === anchorKey;
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

    // 1. Récurrents
    if (recurringByDay.has(dayNum)) {
        const events = recurringByDay.get(dayNum) || [];
        events.forEach(e => {
            eventsOfTheDay.push({ id: generateId(), ...e });
            if (shouldCalculate) dailyImpact += e.amount;
        });
    }

    // Fin de mois intelligente
    if (isMonthEnd) {
        for (let d = dayNum + 1; d <= 31; d++) {
            if (recurringByDay.has(d)) {
                const events = recurringByDay.get(d) || [];
                events.forEach(e => {
                     eventsOfTheDay.push({ id: generateId(), ...e });
                     if (shouldCalculate) dailyImpact += e.amount;
                });
            }
        }
    }

    // 2. Ponctuels (Historique + Simu)
    if (oneOffEventsMap.has(dateKey)) {
        const oneOffs = oneOffEventsMap.get(dateKey) || [];
        oneOffs.forEach(e => {
            eventsOfTheDay.push({ id: generateId(), ...e });
            if (shouldCalculate) dailyImpact += e.amount;
        });
    }

    // 3. Vie courante (Pondérée)
    if (shouldCalculate && !isAnchorDay && monthlyVarCost > 0 && currentBalance > 0) {
        const currentWeekDay = currentDate.getDay(); 
        const dynamicDailyCost = costPerWeekDay[currentWeekDay];
        dailyImpact -= dynamicDailyCost;
    }

    // --- LE CORRECTIF : CALCULER L'IMPACT DE LA SIMULATION DU JOUR ---
    // On isole l'impact des events simulés pour pouvoir les forcer le jour de l'ancre
    let simulationImpactOfTheDay = 0;
    eventsOfTheDay.forEach((e: any) => {
        if (e.isSimulation) {
            simulationImpactOfTheDay += e.amount;
        }
    });

    // 4. Mise à jour du solde
    if (isAnchorDay) {
        // RESET : On prend la vérité banque
        currentBalance = safeFloat(profile.currentBalance);
        // FIX : On applique quand même la simulation si elle est aujourd'hui
        currentBalance += simulationImpactOfTheDay;
    } 
    else if (shouldCalculate) {
        currentBalance += dailyImpact;
    }

    // 5. Push du résultat
    currentMonthData.days.push({
        date: currentDate.toISOString(),
        dayOfMonth: dayNum,
        balance: isBeforeAnchor ? null : Math.round(currentBalance),
        events: eventsOfTheDay,
        status: !isBeforeAnchor && currentBalance < 0 ? 'danger' : 'safe'
    });

    if (shouldCalculate) {
        currentMonthData.stats.balanceEnd = Math.round(currentBalance);
    }
  }

  return Array.from(monthsMap.values());
};
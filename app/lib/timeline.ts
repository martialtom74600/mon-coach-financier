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
const SPENDING_WEIGHTS = [
    1.3, // Dimanche
    0.6, // Lundi
    0.6, // Mardi
    0.6, // Mercredi
    0.6, // Jeudi
    1.0, // Vendredi
    2.3  // Samedi
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
  // 1. PRÉ-CLASSEMENT DES ÉVÉNEMENTS RÉCURRENTS
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
  // 2. PRÉ-CLASSEMENT DE L'HISTORIQUE ET SIMULATIONS
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
  // BOUCLE PRINCIPALE (OPTIMISÉE "SAFE BY DESIGN")
  // =================================================================================
  const monthsMap = new Map();
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
    
    const eventsOfTheDay: any[] = [];

    // --- 1. SÉPARATION DES FLUX ---
    // On distingue ce qui rentre et ce qui sort pour appliquer des règles différentes le Jour J
    let dailyNegativeImpact = 0; // Dépenses programmées
    let dailyPositiveImpact = 0; // Revenus programmés
    let simulationImpact = 0;    // Simulations (toujours appliquées)

    // Helper d'ajout intelligent
    const addEvents = (events: any[]) => {
        if (!events) return;
        events.forEach(e => {
            eventsOfTheDay.push({ id: generateId(), ...e });
            
            // Si c'est une simulation, on traite à part (c'est un test utilisateur)
            if (e.isSimulation) {
                simulationImpact += e.amount;
            } 
            // Sinon, on trie (Revenu vs Dépense)
            else {
                if (e.amount < 0) dailyNegativeImpact += e.amount;
                else dailyPositiveImpact += e.amount;
            }
        });
    };

    // A. Récurrents
    if (recurringByDay.has(dayNum)) addEvents(recurringByDay.get(dayNum) || []);
    if (isMonthEnd) {
        for (let d = dayNum + 1; d <= 31; d++) {
            if (recurringByDay.has(d)) addEvents(recurringByDay.get(d) || []);
        }
    }

    // B. Ponctuels (History)
    if (oneOffEventsMap.has(dateKey)) addEvents(oneOffEventsMap.get(dateKey) || []);

    // C. Vie courante (Variable Costs)
    let dailyLivingCost = 0;
    if (!isBeforeAnchor && !isAnchorDay && monthlyVarCost > 0) {
        const currentWeekDay = currentDate.getDay(); 
        dailyLivingCost = -costPerWeekDay[currentWeekDay]; // C'est une dépense (négatif)
    }

    // --- 2. MISE A JOUR DU SOLDE (LOGIQUE ASYMÉTRIQUE) ---
    
    if (isAnchorDay) {
        // RESET : On prend la saisie utilisateur
        runningBalance = safeFloat(profile.currentBalance);
        
        // RÈGLE DE SÉCURITÉ :
        // 1. On applique les DÉPENSES prévues (Pessimisme : "ça va être débité ce soir")
        runningBalance += dailyNegativeImpact; 
        
        // 2. On applique les SIMULATIONS (Logique : "Je veux voir l'effet de mon action")
        runningBalance += simulationImpact;

        // 3. On IGNORE les REVENUS prévus (Prudence : "C'est déjà dans le solde ou ça viendra demain")
        // runningBalance += dailyPositiveImpact; <--- ON NE LE FAIT PAS !
        
        // Note : On n'applique pas la vie courante le jour J (déjà vécue)
    } 
    else if (!isBeforeAnchor) {
        // Jours suivants : On applique TOUT normalement
        runningBalance += dailyNegativeImpact + dailyPositiveImpact + simulationImpact + dailyLivingCost;
    }

    // 3. Construction de l'objet mois
    if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
            id: monthKey,
            label: format(currentDate, 'MMMM yyyy', { locale: fr }),
            days: [],
            stats: { balanceEnd: 0 }
        });
    }
    const currentMonthData = monthsMap.get(monthKey);

    // 4. Push du résultat
    currentMonthData.days.push({
        date: currentDate.toISOString(),
        dayOfMonth: dayNum,
        // Si c'est le passé, on met null
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
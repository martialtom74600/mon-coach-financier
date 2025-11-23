import { 
    addDays, 
    startOfDay, 
    getDate, 
    isLastDayOfMonth, 
    getDaysInMonth 
  } from 'date-fns';
  
  // Fonction de génération de la timeline (Projection jour par jour)
  export const generateTimeline = (profile: any, history: any[], daysToProject = 730) => {
    const timeline = [];
    
    // 1. Point de départ : "Aujourd'hui à 00:00:00" (Normalisé)
    const today = startOfDay(new Date());
    
    // Solde initial (celui saisi par l'utilisateur)
    let currentBalance = parseFloat(profile.currentBalance) || 0;
    
    // 2. Préparation des événements récurrents
    // On fusionne tous les flux mensuels en une seule liste d'événements à surveiller
    const recurringEvents = [
      ...(profile.incomes || []).map((i: any) => ({ ...i, type: 'income', day: i.dayOfMonth || 1 })),
      ...(profile.fixedCosts || []).map((i: any) => ({ ...i, type: 'expense', day: i.dayOfMonth || 5 })),
      ...(profile.subscriptions || []).map((i: any) => ({ ...i, type: 'expense', day: i.dayOfMonth || 10 })),
      ...(profile.credits || []).map((i: any) => ({ ...i, type: 'expense', day: i.dayOfMonth || 15 })),
      // Les investissements sont aussi des sorties de cash du compte courant
      ...(profile.savingsContributions || []).map((i: any) => ({ ...i, type: 'expense', day: i.dayOfMonth || 20, name: `Épargne: ${i.name}` })),
    ];
  
    // 3. Calcul du lissage "Vie Quotidienne"
    // On divise le budget mensuel variable par 30 pour avoir l'impact journalier
    const dailyVariableCost = (parseFloat(profile.variableCosts) || 0) / 30;
  
    // 4. Boucle de projection (Jour par jour)
    for (let i = 0; i < daysToProject; i++) {
      const currentDate = addDays(today, i);
      const currentDayOfMonth = getDate(currentDate);
      const isMonthEnd = isLastDayOfMonth(currentDate);
      const daysInCurrentMonth = getDaysInMonth(currentDate);
  
      let dailyImpact = 0;
      const events = [];
  
      // A. Vérification des événements récurrents
      recurringEvents.forEach((e: any) => {
        let shouldTrigger = false;
        const targetDay = e.day;
  
        if (targetDay === currentDayOfMonth) {
          // Cas standard : On est le jour J
          shouldTrigger = true;
        } 
        else if (targetDay > daysInCurrentMonth && isMonthEnd) {
          // Cas Fin de Mois Intelligent :
          // Si un prélèvement est prévu le 31, mais qu'on est le 30 avril (dernier jour), on déclenche.
          shouldTrigger = true;
        }
  
        if (shouldTrigger) {
          const amount = parseFloat(e.amount);
          if (e.type === 'income') {
            dailyImpact += amount;
            events.push({ name: e.name, amount: amount, type: 'income' });
          } else {
            dailyImpact -= amount;
            events.push({ name: e.name, amount: -amount, type: 'expense' });
          }
        }
      });
  
      // B. Application du lissage (Vie Courante)
      // On ne le déduit que si le solde est positif pour ne pas enfoncer visuellement un découvert déjà acté
      // (C'est un choix UX pour ne pas affoler l'utilisateur avec des -10 000€ théoriques)
      if (dailyVariableCost > 0 && currentBalance > 0) {
        dailyImpact -= dailyVariableCost;
      }
  
      // Mise à jour du solde courant
      currentBalance += dailyImpact;
  
      // Détermination du statut de santé du jour
      let status = 'safe';
      if (currentBalance < 0) status = 'danger';
      else if (currentBalance < 200) status = 'warning'; // Seuil d'alerte bas
  
      // Ajout du jour à la timeline
      timeline.push({
        date: currentDate.toISOString(),
        balance: Math.round(currentBalance), // On arrondit pour l'affichage propre
        events,
        status
      });
    }
  
    return timeline;
  };
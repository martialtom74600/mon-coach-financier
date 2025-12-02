import { differenceInMonths, isValid, parseISO } from 'date-fns';

// Sécurisation des nombres
const safeFloat = (n: any) => {
    const parsed = parseFloat(n);
    return isNaN(parsed) ? 0 : parsed;
};

// ============================================================================
// 1. LE SOLVER (Moteur de calcul de la mensualité)
// ============================================================================
/**
 * Calcule l'effort d'épargne mensuel nécessaire pour atteindre un objectif.
 * Utilise la formule de la "Rente de constitution de capital" (Sinking Fund) si placé.
 */
export const calculateMonthlyEffort = (goal: any) => {
    // 1. Validation des entrées
    if (!goal.targetAmount || !goal.deadline) return 0;

    const today = new Date();
    const targetDate = new Date(goal.deadline);

    if (!isValid(targetDate)) return 0;
    
    // Si la date est passée, on renvoie le montant total manquant (Urgence !)
    if (targetDate <= today) {
        const missing = Math.max(0, safeFloat(goal.targetAmount) - safeFloat(goal.currentSaved));
        return missing; 
    }

    // 2. Calcul du temps restant (en mois)
    // On ajoute 1 mois de sécurité pour ne pas diviser par 0 si c'est le mois même
    let monthsRemaining = differenceInMonths(targetDate, today);
    if (monthsRemaining <= 0) monthsRemaining = 1;

    // 3. Calcul du montant manquant
    const current = safeFloat(goal.currentSaved);
    const target = safeFloat(goal.targetAmount);
    const missing = Math.max(0, target - current);

    if (missing === 0) return 0; // Champagne ! Objectif atteint.

    // 4. SCÉNARIO A : ÉPARGNE SIMPLE (Non placé ou court terme)
    const annualYield = safeFloat(goal.projectedYield); // ex: 3 pour 3%

    if (!goal.isInvested || annualYield <= 0) {
        return missing / monthsRemaining;
    }

    // 5. SCÉNARIO B : INTÉRÊTS COMPOSÉS (L'argent travaille)
    // Formule : PMT = FV * (r / ((1 + r)^n - 1))
    // PMT = Mensualité
    // FV  = Valeur Future (Ce qu'il manque)
    // r   = Taux mensuel (Annuel / 12)
    // n   = Nombre de mois
    
    const r = (annualYield / 100) / 12; // Taux mensuel
    const n = monthsRemaining;

    // Le calcul magique
    const monthlyContribution = missing * (r / (Math.pow(1 + r, n) - 1));

    return monthlyContribution;
};

// ============================================================================
// 2. LE PROJECTEUR (Pour les graphiques)
// ============================================================================
/**
 * Génère la courbe de progression prévisionnelle pour l'affichage graphique.
 * Permet de montrer à l'utilisateur : "Regarde la part d'intérêts gagnés !"
 */
export const simulateGoalProjection = (goal: any, monthlyContribution: number) => {
    const projection = [];
    const today = new Date();
    const monthsRemaining = differenceInMonths(new Date(goal.deadline), today);
    const annualYield = safeFloat(goal.projectedYield);
    const r = (annualYield / 100) / 12;

    let currentBalance = safeFloat(goal.currentSaved);
    let totalContributed = currentBalance; // Ce que l'utilisateur a sorti de sa poche
    let totalInterests = 0;

    for (let i = 0; i <= monthsRemaining; i++) {
        projection.push({
            month: i,
            date: new Date(today.getFullYear(), today.getMonth() + i, 1),
            balance: Math.round(currentBalance),
            contributed: Math.round(totalContributed),
            interests: Math.round(totalInterests)
        });

        if (i < monthsRemaining) {
            // On ajoute les intérêts du mois précédent
            const interestEarned = goal.isInvested ? currentBalance * r : 0;
            
            // On ajoute la cotisation
            currentBalance += monthlyContribution + interestEarned;
            
            // Mise à jour des stats
            totalContributed += monthlyContribution;
            totalInterests += interestEarned;
        }
    }

    return {
        projection,
        summary: {
            totalPocket: Math.round(totalContributed), // Total sorti de la poche
            totalInterests: Math.round(totalInterests), // "Cadeau" de la banque
            finalAmount: Math.round(currentBalance)
        }
    };
};

// ============================================================================
// 3. L'ANALYSEUR DE FAISABILITÉ
// ============================================================================
/**
 * Vérifie si l'objectif est réaliste par rapport à la capacité d'épargne actuelle du profil.
 */
export const analyzeGoalFeasibility = (monthlyEffort: number, currentProfileCapacity: number) => {
    // currentProfileCapacity vient de calculateFinancials() -> capacityToSave

    const ratio = currentProfileCapacity > 0 ? (monthlyEffort / currentProfileCapacity) * 100 : 999;

    if (monthlyEffort <= 0) return { status: 'DONE', label: 'Atteint', color: 'green' };
    
    if (monthlyEffort <= currentProfileCapacity) {
        return { 
            status: 'POSSIBLE', 
            label: 'Réalisable', 
            color: 'green', 
            message: `Ça passe ! Il te restera encore ${Math.round(currentProfileCapacity - monthlyEffort)}€/mois.` 
        };
    } else {
        return { 
            status: 'HARD', 
            label: 'Difficile', 
            color: 'red', 
            message: `Il manque ${Math.round(monthlyEffort - currentProfileCapacity)}€/mois. Prolonge le délai ou réduis le montant.` 
        };
    }
};
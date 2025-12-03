import { differenceInMonths, isValid, addMonths, differenceInYears } from 'date-fns';
import { Goal, GoalDiagnosis, GoalStrategy } from './types';
import { safeFloat } from './utils';
import { CONSTANTS } from './constants'; // Pour le taux d'inflation

// ============================================================================
// HELPERS MATHÉMATIQUES AVANCÉS
// ============================================================================

/**
 * Calcule le montant ajusté à l'inflation.
 * Ex: 10k€ dans 10 ans avec 2% d'inflation = Il faut viser 12.1k€
 */
const calculateInflationImpact = (amount: number, deadline: Date): number => {
    const today = new Date();
    const years = differenceInYears(deadline, today);
    if (years < 1) return amount; // Négligeable sur moins d'un an

    // Formule : FV = PV * (1 + inflation)^n
    return amount * Math.pow(1 + CONSTANTS.INFLATION_RATE, years);
};

/**
 * Calcule la durée nécessaire avec intérêts composés (Formule NPER financière)
 * Résout n dans : FV = PMT * (((1 + r)^n - 1) / r)
 */
const calculateCompoundMonthsNeeded = (
    missing: number, 
    monthlyCapacity: number, 
    annualYield: number
): number => {
    if (monthlyCapacity <= 0) return 999;
    if (annualYield <= 0) return Math.ceil(missing / monthlyCapacity);

    const r = (annualYield / 100) / 12;
    // Formule : n = ln((FV * r / PMT) + 1) / ln(1 + r)
    const numerator = Math.log(((missing * r) / monthlyCapacity) + 1);
    const denominator = Math.log(1 + r);
    
    return Math.ceil(numerator / denominator);
};

// ============================================================================
// 1. LE SOLVER (Moteur de calcul de la mensualité)
// ============================================================================
export const calculateMonthlyEffort = (goal: Goal): number => {
    if (!goal.targetAmount || !goal.deadline) return 0;

    const today = new Date();
    const targetDate = new Date(goal.deadline);

    if (!isValid(targetDate)) return 0;
    
    // Si date passée -> Urgence totale
    if (targetDate <= today) {
        return Math.max(0, safeFloat(goal.targetAmount) - safeFloat(goal.currentSaved));
    }

    let monthsRemaining = differenceInMonths(targetDate, today);
    if (monthsRemaining <= 0) monthsRemaining = 1;

    const current = safeFloat(goal.currentSaved);
    const target = safeFloat(goal.targetAmount);
    const missing = Math.max(0, target - current);

    if (missing <= 0) return 0;

    // --- SCÉNARIO A : ÉPARGNE SIMPLE ---
    const annualYield = safeFloat(goal.projectedYield); 

    if (!goal.isInvested || annualYield <= 0) {
        return missing / monthsRemaining;
    }

    // --- SCÉNARIO B : INTÉRÊTS COMPOSÉS ---
    // Formule PMT (Payment)
    const r = (annualYield / 100) / 12; 
    const n = monthsRemaining;
    
    // PMT = FV * r / ((1 + r)^n - 1)
    return missing * (r / (Math.pow(1 + r, n) - 1));
};

// ============================================================================
// 2. LE PROJECTEUR (Graphiques) - Reste inchangé car purement visuel
// ============================================================================
export const simulateGoalProjection = (goal: Goal, monthlyContribution: number) => {
    const projection = [];
    const today = new Date();
    const monthsRemaining = differenceInMonths(new Date(goal.deadline), today);
    const annualYield = safeFloat(goal.projectedYield);
    const r = (annualYield / 100) / 12;

    let currentBalance = safeFloat(goal.currentSaved);
    let totalContributed = currentBalance;
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
            const interestEarned = goal.isInvested ? currentBalance * r : 0;
            currentBalance += monthlyContribution + interestEarned;
            totalContributed += monthlyContribution;
            totalInterests += interestEarned;
        }
    }

    return {
        projection,
        summary: {
            totalPocket: Math.round(totalContributed),
            totalInterests: Math.round(totalInterests),
            finalAmount: Math.round(currentBalance)
        }
    };
};

// ============================================================================
// 3. MOTEUR DE DIAGNOSTIC (Le Cerveau)
// ============================================================================
export const analyzeGoalStrategies = (
    goal: Goal, 
    monthlyEffortNeeded: number, 
    currentCapacity: number, 
    discretionaryExpenses: number, 
    totalIncome: number,
    availableGlobalSavings: number = 0 // NOUVEAU PARAMÈTRE : Épargne globale dispo
): GoalDiagnosis => {
    
    let status: GoalDiagnosis['status'] = 'POSSIBLE';
    let label = 'Réalisable';
    let color = 'green';
    let mainMessage = "Votre budget actuel permet cet objectif.";

    const gap = monthlyEffortNeeded - currentCapacity; 
    const targetAmount = safeFloat(goal.targetAmount);
    
    // --- ANALYSE DE L'INFLATION ---
    const inflationAdjustedTarget = calculateInflationImpact(targetAmount, new Date(goal.deadline));
    const inflationGap = inflationAdjustedTarget - targetAmount;
    const isInflationSignificant = inflationGap > (targetAmount * 0.05); // Plus de 5% de perte

    // Cas A : Déjà atteint
    if (monthlyEffortNeeded <= 0) {
        return { status: 'DONE', label: 'Atteint', color: 'green', strategies: [], mainMessage: "Objectif atteint !" };
    }

    // Cas B : Impossible Absolu
    if (monthlyEffortNeeded > totalIncome) {
        return {
            status: 'IMPOSSIBLE',
            label: 'Irréaliste',
            color: 'black',
            mainMessage: `Cet effort dépasse vos revenus totaux (${Math.round(monthlyEffortNeeded)}€).`,
            strategies: [] 
        };
    }

    // Cas C : Difficile
    if (gap > 0) {
        status = 'HARD';
        label = 'Difficile';
        color = 'red';
        mainMessage = `Il manque ${Math.round(gap)}€/mois pour y arriver.`;
    } 
    // Cas D : Facile mais attention à l'inflation
    else if (isInflationSignificant) {
        // On ne change pas le statut en rouge, mais on prévient
        mainMessage = `Ça passe, mais attention à l'inflation (${Math.round(inflationGap)}€ de perte de pouvoir d'achat).`;
    }

    // 2. GÉNÉRATION DES STRATÉGIES
    const strategies: GoalStrategy[] = [];

    // --- STRATÉGIE 0 : INFLATION (Informationnelle) ---
    if (isInflationSignificant) {
        strategies.push({
            type: 'INCOME', // On utilise INCOME faute de mieux dans tes types actuels
            title: 'Impact Inflation',
            description: 'Le coût de la vie augmente.',
            message: `Pour garder le même pouvoir d'achat, visez ${Math.round(inflationAdjustedTarget)}€ au lieu de ${Math.round(targetAmount)}€.`,
            painLevel: 'LOW',
            disabled: true // Juste informatif
        });
    }

    if (status === 'HARD') {
        
        // --- STRATÉGIE 1 : L'APPORT (Le Joker) ---
        // Si l'utilisateur a de l'épargne globale (Livret A) non utilisée dans ce goal
        const potentialDeposit = Math.min(availableGlobalSavings, safeFloat(goal.targetAmount) * 0.20); // Max 20% du projet
        
        // On recalcule l'effort si on faisait cet apport
        const goalWithDeposit = { ...goal, currentSaved: safeFloat(goal.currentSaved) + potentialDeposit };
        const reducedEffort = calculateMonthlyEffort(goalWithDeposit);
        
        if (availableGlobalSavings > 1000 && reducedEffort <= currentCapacity) {
             strategies.push({
                type: 'BUDGET', // On classe en budget ou créer un type TRANSFER
                title: 'Utiliser l\'épargne',
                description: `Vous avez ${Math.round(availableGlobalSavings)}€ de côté.`,
                value: potentialDeposit,
                painLevel: 'LOW',
                message: `En transférant ${Math.round(potentialDeposit)}€ maintenant, la mensualité tombe à ${Math.round(reducedEffort)}€ (Réalisable).`,
                actionLabel: "Simuler un virement"
            });
        }

        // --- STRATÉGIE 2 : LE TEMPS ---
        const monthsNeeded = calculateCompoundMonthsNeeded(
            safeFloat(goal.targetAmount) - safeFloat(goal.currentSaved),
            currentCapacity,
            safeFloat(goal.projectedYield)
        );
        const realisticDate = addMonths(new Date(), monthsNeeded);

        strategies.push({
            type: 'TIME',
            title: 'Patienter',
            description: `Allongez la durée pour coller à votre budget actuel.`,
            value: realisticDate.toISOString(),
            painLevel: 'LOW',
            message: `Fin prévue le ${realisticDate.toLocaleDateString('fr-FR', {month:'long', year:'numeric'})} (+${differenceInMonths(realisticDate, new Date(goal.deadline))} mois).`
        });

        // --- STRATÉGIE 3 : L'EFFORT (BUDGET) ---
        if (discretionaryExpenses > gap) {
            const cutPercentage = Math.round((gap / discretionaryExpenses) * 100);
            strategies.push({
                type: 'BUDGET',
                title: 'Serrer la ceinture',
                description: `Réduisez vos dépenses variables ("Plaisirs").`,
                value: gap,
                painLevel: cutPercentage > 40 ? 'HIGH' : 'MEDIUM',
                message: `Il faut couper ${cutPercentage}% de vos plaisirs mensuels (-${Math.round(gap)}€).`
            });
        }

        // --- STRATÉGIE 4 : HYBRIDE (Compromis) ---
        // On essaie de couper la poire en deux : moitié effort budget, moitié temps
        const hybridCapacity = currentCapacity + (gap / 2);
        const hybridMonths = calculateCompoundMonthsNeeded(
            safeFloat(goal.targetAmount) - safeFloat(goal.currentSaved),
            hybridCapacity,
            safeFloat(goal.projectedYield)
        );
        const hybridDate = addMonths(new Date(), hybridMonths);
        
        strategies.push({
            type: 'HYBRID',
            title: 'Le Compromis',
            description: `Un peu d'effort (-${Math.round(gap/2)}€) et un petit délai.`,
            value: hybridDate.toISOString(),
            painLevel: 'MEDIUM',
            message: `Fin en ${hybridDate.toLocaleDateString('fr-FR', {month:'short', year:'numeric'})}.`
        });
    }

    return {
        status,
        label,
        color,
        mainMessage,
        gap: Math.max(0, gap),
        strategies
    };
};
import { addDays, addMonths } from 'date-fns';
import { generateId } from './utils';
import { Purchase } from './types'; // ✅ Import du type

/**
 * MODULE SIMULATEUR
 * Rôle : Transformer une intention d'achat (Ex: "TV à 1000€ en 4x") 
 * en une liste d'événements bancaires concrets (4 prélèvements de 250€).
 */
export const getSimulatedEvents = (purchase: Purchase) => {
    const events: any[] = [];
    
    // 1. Parsing sécurisé de l'amount (gère string et number)
    const rawAmount = typeof purchase.amount === 'string' ? parseFloat(purchase.amount) : purchase.amount;
    const amount = Math.abs(rawAmount || 0);
    
    // Normalisation de la date à midi pour matcher la logique de timeline.ts
    const date = new Date(purchase.date || new Date());
    date.setHours(12, 0, 0, 0);

    const mode = purchase.paymentMode;

    // CAS 1 : PAIEMENT COMPTANT (Compte Courant)
    if (mode === 'CASH_ACCOUNT') {
        events.push({ 
            id: generateId(), 
            name: purchase.name, 
            amount: -amount, 
            type: 'purchase', 
            date: date,
            isSimulation: true 
        });
        
        // Gestion des notes de frais
        if (purchase.isReimbursable) {
            events.push({ 
                id: generateId(), 
                name: `Remboursement: ${purchase.name}`, 
                amount: amount, 
                type: 'income', 
                // On suppose un remboursement à 30 jours
                date: addDays(date, 30),
                isSimulation: true 
            });
        }
    }
    // CAS 2 : ABONNEMENT (Récurrent)
    else if (mode === 'SUBSCRIPTION') {
        // On projette sur 24 mois par défaut pour voir l'impact long terme
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
    // CAS 3 : CRÉDIT CONSO ou PAIEMENT FRACTIONNÉ (Split)
    else if (mode === 'CREDIT' || mode === 'SPLIT') {
        // Parsing sécurisé de la durée (string | number)
        const rawDuration = purchase.duration;
        const duration = typeof rawDuration === 'string' ? parseInt(rawDuration) : rawDuration;
        const months = Math.max(1, duration || 3);
        
        // Parsing sécurisé du taux
        const rawRate = purchase.rate;
        const rateVal = typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate;
        const rate = mode === 'CREDIT' ? (rateVal || 0) : 0;
        
        // Calcul simplifié du coût total avec intérêts
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
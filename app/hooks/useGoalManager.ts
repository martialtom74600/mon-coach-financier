import { useFinancialData } from './useFinancialData';
import { GoalStrategy, Profile } from '@/app/lib/types'; // Tes types blindés
import { safeFloat } from '@/app/lib/utils'; // Ton utilitaire sécurisé

export const useGoalManager = () => {
    const { profile, saveProfile } = useFinancialData();

    /**
     * Applique une stratégie (Temps, Budget ou Apport) à un objectif
     */
    const applyStrategy = async (goalId: string, strategy: GoalStrategy) => {
        if (!profile) return;

        // 1. On travaille sur une copie propre pour ne pas muter l'état directement
        const newProfile: Profile = JSON.parse(JSON.stringify(profile));
        
        // 2. On retrouve l'objectif
        const goalIndex = newProfile.goals?.findIndex(g => g.id === goalId);
        if (goalIndex === undefined || goalIndex === -1) return;
        
        const goal = newProfile.goals![goalIndex];

        // 3. Application de la logique selon la stratégie choisie
        switch (strategy.type) {
            case 'TIME':
                // On change la date butoir
                if (strategy.value) {
                    goal.deadline = strategy.value.toString();
                }
                break;

            case 'BUDGET': // Cas "Utiliser l'épargne" (Apport)
                // On vérifie que c'est bien un montant
                const amountToTransfer = Number(strategy.value);
                if (amountToTransfer > 0) {
                    // A. On retire de l'épargne globale (Matelas)
                    newProfile.savings = Math.max(0, safeFloat(newProfile.savings) - amountToTransfer);
                    
                    // B. On l'ajoute dans la cagnotte du projet
                    goal.currentSaved = safeFloat(goal.currentSaved) + amountToTransfer;
                }
                break;
            
            // Tu peux ajouter d'autres cas ici (ex: réduire train de vie)
        }

        // 4. Sauvegarde atomique (Tout le profil est mis à jour d'un coup)
        await saveProfile(newProfile);
    };

    return { applyStrategy };
};
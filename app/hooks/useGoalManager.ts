import { useFinancialData } from './useFinancialData';
// ✅ CORRECTION : On importe les types et utils depuis 'logic'
import { GoalStrategy, Profile, safeFloat } from '@/app/lib/logic';

export const useGoalManager = () => {
    const { profile, saveProfile } = useFinancialData();

    const applyStrategy = async (goalId: string, strategy: GoalStrategy) => {
        if (!profile) return;

        const newProfile: Profile = JSON.parse(JSON.stringify(profile));
        const goalIndex = newProfile.goals?.findIndex(g => g.id === goalId);
        
        if (goalIndex === undefined || goalIndex === -1) return;
        const goal = newProfile.goals![goalIndex];

        switch (strategy.type) {
            case 'TIME':
            case 'HYBRID':
                if (strategy.value) goal.deadline = strategy.value.toString();
                break;

            case 'BUDGET': 
                const amountToTransfer = Number(strategy.value);
                if (amountToTransfer > 0) {
                    const currentSavings = safeFloat(newProfile.savings);
                    newProfile.savings = Math.max(0, currentSavings - amountToTransfer);
                    goal.currentSaved = safeFloat(goal.currentSaved) + amountToTransfer;
                }
                break;
        }
        await saveProfile(newProfile);
    };

    return { applyStrategy };
};
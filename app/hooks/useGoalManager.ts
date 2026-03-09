import { useFinancialData } from './useFinancialData';
import { GoalStrategy, safeFloat } from '@/app/lib/logic';

export const useGoalManager = () => {
    const { profile, updateProfileInfo, saveGoal } = useFinancialData();

    const applyStrategy = async (goalId: string, strategy: GoalStrategy) => {
        if (!profile) return;

        const goal = profile.goals?.find(g => g.id === goalId);
        if (!goal) return;

        switch (strategy.type) {
            case 'TIME':
            case 'HYBRID':
                if (strategy.value) {
                    await saveGoal({ id: goalId, deadline: new Date(strategy.value as string | number) });
                }
                break;

            case 'BUDGET': {
                const amountToTransfer = Number(strategy.value);
                if (amountToTransfer > 0) {
                    const currentSavings = safeFloat(profile.savings);
                    await updateProfileInfo({
                        savings: Math.max(0, currentSavings - amountToTransfer),
                    });
                    await saveGoal({
                        id: goalId,
                        currentSaved: safeFloat(goal.currentSaved) + amountToTransfer,
                    });
                }
                break;
            }
        }
    };

    return { applyStrategy };
};
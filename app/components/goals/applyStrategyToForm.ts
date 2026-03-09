import type { GoalStrategy } from '@/app/lib/definitions';
import type { GoalFormData } from './GoalForm';

export function applyStrategyToForm(
  strategy: GoalStrategy,
  currentForm: GoalFormData
): { updates: Partial<GoalFormData>; triggerSavings: boolean } {
  let updates: Partial<GoalFormData> = {};
  let triggerSavings = false;

  if (strategy.type === 'TIME' || strategy.type === 'HYBRID') {
    if (strategy.value != null) {
      const dateStr = new Date(strategy.value as string | number).toISOString().split('T')[0];
      updates = { deadline: dateStr };
    }
  } else if (strategy.type === 'BUDGET' && strategy.actionLabel === 'Simuler un virement') {
    const addedAmount = Number(strategy.value) || 0;
    const current = parseFloat(String(currentForm.currentSaved)) || 0;
    updates = { currentSaved: (current + addedAmount).toString() };
    triggerSavings = true;
  }

  return { updates, triggerSavings };
}

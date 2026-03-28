import { INITIAL_PROFILE, type Profile, HousingStatus } from '@/app/lib/definitions';
import { profileAPIResponseSchema } from '@/app/lib/validations';
import type { z } from 'zod';

export type ProfileApiPayload = z.infer<typeof profileAPIResponseSchema>;

/** Même fusion que GET /api/user → client (useFinancialData). */
export function profileFromApiPayload(validated: ProfileApiPayload): Profile {
  return {
    ...INITIAL_PROFILE,
    ...validated,
    household: { ...INITIAL_PROFILE.household, ...(validated.household || {}) },
    housing: {
      status: validated.housing?.status ?? HousingStatus.TENANT,
      monthlyCost: validated.housing?.monthlyCost ?? 0,
      paymentDay: validated.housing?.paymentDay ?? undefined,
    },
    assets: validated.assets || [],
    goals: validated.goals || [],
    decisions: validated.decisions || [],
    incomes: validated.incomes || [],
    fixedCosts: validated.fixedCosts || [],
    variableCosts: validated.variableCosts || [],
    credits: validated.credits || [],
    subscriptions: validated.subscriptions || [],
    annualExpenses: validated.annualExpenses || [],
  } as unknown as Profile;
}

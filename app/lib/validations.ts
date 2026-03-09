import { z } from 'zod';
import { NextResponse } from 'next/server';

// ============================================================================
// ENUMS (miroir exact du schema Prisma)
// ============================================================================

const ItemCategoryEnum = z.enum([
  'INCOME', 'FIXED_COST', 'SUBSCRIPTION', 'CREDIT', 'ANNUAL_EXPENSE', 'VARIABLE_COST',
]);

const FrequencyEnum = z.enum([
  'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONCE',
]);

const AssetTypeEnum = z.enum([
  'CC', 'LIVRET', 'LDDS', 'LEP', 'PEL', 'CEL', 'PEA', 'CTO', 'AV',
  'PER', 'PEE', 'CRYPTO', 'REAL_ESTATE', 'SCPI', 'GOLD', 'CROWD', 'OTHER',
]);

const GoalCategoryEnum = z.enum([
  'REAL_ESTATE', 'VEHICLE', 'TRAVEL', 'WEDDING', 'EMERGENCY', 'RETIREMENT', 'PROJECT', 'OTHER',
]);

const PurchaseTypeEnum = z.enum([
  'NEED', 'PLEASURE', 'OPPORTUNITY', 'PROBLEM',
]);

const PaymentModeEnum = z.enum([
  'CASH_SAVINGS', 'CASH_CURRENT', 'CREDIT', 'SPLIT',
]);

const UserPersonaEnum = z.enum([
  'SALARIED', 'FREELANCE', 'STUDENT', 'RETIRED', 'UNEMPLOYED',
]);

const HousingStatusEnum = z.enum([
  'TENANT', 'OWNER_LOAN', 'OWNER_PAID', 'FREE',
]);

// ============================================================================
// PRIMITIVES RÉUTILISABLES
// ============================================================================

const amount = z.coerce.number().finite();
const positiveAmount = z.coerce.number().finite().min(0);
const dayOfMonth = z.coerce.number().int().min(1).max(31);
const shortText = z.string().trim().min(1, 'Ce champ est requis').max(200);

// ============================================================================
// ITEMS (revenus, charges, crédits, abonnements…)
// ============================================================================

export const createItemSchema = z.object({
  name: shortText,
  amount: amount,
  category: ItemCategoryEnum,
  frequency: FrequencyEnum.default('MONTHLY'),
  dayOfMonth: dayOfMonth.optional().default(1),
});

export const updateItemSchema = z.object({
  name: shortText.optional(),
  amount: amount.optional(),
  frequency: FrequencyEnum.optional(),
  dayOfMonth: dayOfMonth.nullable().optional(),
});

// ============================================================================
// ASSETS (patrimoine)
// ============================================================================

export const createAssetSchema = z.object({
  name: shortText,
  type: AssetTypeEnum,
  currentValue: amount,
  monthlyFlow: amount.default(0),
  transferDay: dayOfMonth.default(1),
});

export const updateAssetSchema = z.object({
  name: shortText.optional(),
  currentValue: amount.optional(),
  monthlyFlow: amount.optional(),
  transferDay: dayOfMonth.optional(),
});

// ============================================================================
// GOALS (objectifs financiers)
// ============================================================================

export const createGoalSchema = z.object({
  name: shortText,
  category: GoalCategoryEnum.default('OTHER'),
  targetAmount: positiveAmount,
  currentSaved: amount.default(0),
  monthlyContribution: amount.default(0),
  deadline: z.coerce.date(),
  projectedYield: amount.default(0),
  transferDay: dayOfMonth.optional(),
});

export const updateGoalSchema = z.object({
  name: shortText.optional(),
  targetAmount: positiveAmount.optional(),
  currentSaved: amount.optional(),
  monthlyContribution: amount.optional(),
  deadline: z.coerce.date().optional(),
});

// ============================================================================
// PURCHASE DECISIONS (décisions d'achat)
// ============================================================================

export const createDecisionSchema = z.object({
  name: shortText,
  amount: positiveAmount,
  date: z.coerce.date(),
  type: PurchaseTypeEnum,
  paymentMode: PaymentModeEnum,
  isPro: z.boolean().default(false),
  isReimbursable: z.boolean().default(false),
  reimbursedAt: z.coerce.date().nullable().optional(),
  duration: z.coerce.number().int().min(1).nullable().optional(),
  rate: z.coerce.number().finite().min(0).nullable().optional(),
});

export const updateDecisionSchema = z.object({
  name: shortText.optional(),
  amount: positiveAmount.optional(),
  date: z.coerce.date().optional(),
  type: PurchaseTypeEnum.optional(),
  paymentMode: PaymentModeEnum.optional(),
  isPro: z.boolean().optional(),
  isReimbursable: z.boolean().optional(),
  reimbursedAt: z.coerce.date().nullable().optional(),
  duration: z.coerce.number().int().min(1).nullable().optional(),
  rate: z.coerce.number().finite().min(0).nullable().optional(),
});

// ============================================================================
// PROFILE (mise à jour partielle)
// ============================================================================

export const updateProfileSchema = z.object({
  age: z.coerce.number().int().min(0).max(120).nullable().optional(),
  persona: UserPersonaEnum.nullable().optional(),
  housingStatus: HousingStatusEnum.nullable().optional(),
  housingCost: amount.optional(),
  housingPaymentDay: dayOfMonth.optional(),
  adults: z.coerce.number().int().min(1).max(20).optional(),
  children: z.coerce.number().int().min(0).max(20).optional(),
  funBudget: amount.optional(),
});

// ============================================================================
// WIZARD (sauvegarde globale POST /api/user)
// ============================================================================

const wizardProfileSchema = z.object({
  age: z.coerce.number().int().min(0).max(120).optional(),
  persona: UserPersonaEnum.optional(),
  housingStatus: HousingStatusEnum.optional(),
  housingCost: amount.default(0),
  housingPaymentDay: dayOfMonth.default(1),
  adults: z.coerce.number().int().min(1).default(1),
  children: z.coerce.number().int().min(0).default(0),
  funBudget: amount.default(0),
});

const wizardItemSchema = z.object({
  name: shortText,
  amount: amount,
  category: ItemCategoryEnum,
  frequency: FrequencyEnum.default('MONTHLY'),
  dayOfMonth: dayOfMonth.nullable().optional(),
});

const wizardAssetSchema = z.object({
  name: shortText,
  type: AssetTypeEnum,
  currentValue: amount.default(0),
  monthlyFlow: amount.default(0),
  transferDay: dayOfMonth.default(1),
});

const wizardGoalSchema = z.object({
  name: shortText,
  category: GoalCategoryEnum,
  targetAmount: amount,
  currentSaved: amount.default(0),
  monthlyContribution: amount.default(0),
  deadline: z.coerce.date(),
  projectedYield: amount.default(0),
  transferDay: dayOfMonth.nullable().optional(),
});

export const saveUserSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  profile: wizardProfileSchema.optional(),
  items: z.array(wizardItemSchema).optional(),
  assets: z.array(wizardAssetSchema).optional(),
  goals: z.array(wizardGoalSchema).optional(),
});

// ============================================================================
// HELPER — Réponse d'erreur standardisée
// ============================================================================

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: 'Données invalides', details: error.issues },
    { status: 400 },
  );
}

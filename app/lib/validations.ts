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

// ============================================================================
// RESPONSE SCHEMAS — Bouclier Zod : Validation Runtime des réponses API
// Miroir exact de ce que getFullUserProfile() retourne après serializeDecimals()
// puis JSON.stringify(). Les Decimal → number, les Date → string ISO.
// ============================================================================

export const financialItemResponseSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  name: z.string(),
  amount: z.number(),
  category: ItemCategoryEnum,
  frequency: FrequencyEnum,
  dayOfMonth: z.number().nullable(),
  createdAt: z.string(),
});

export const assetResponseSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  name: z.string(),
  type: AssetTypeEnum,
  currentValue: z.number(),
  monthlyFlow: z.number(),
  transferDay: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const financialGoalResponseSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  name: z.string(),
  category: GoalCategoryEnum,
  targetAmount: z.number(),
  currentSaved: z.number(),
  monthlyContribution: z.number(),
  deadline: z.string(),
  projectedYield: z.number(),
  transferDay: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const purchaseDecisionResponseSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  name: z.string(),
  amount: z.number(),
  date: z.string(),
  type: PurchaseTypeEnum,
  paymentMode: PaymentModeEnum,
  isPro: z.boolean(),
  isReimbursable: z.boolean(),
  reimbursedAt: z.string().nullable(),
  duration: z.number().nullable(),
  rate: z.number().nullable(),
  createdAt: z.string(),
});

/** Schéma pour les réponses DELETE (success: true) */
export const successResponseSchema = z.object({
  success: z.literal(true),
});

/** Schéma pour PATCH /api/profile — FinancialProfile sérialisé */
export const profilePatchResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  age: z.number().nullable(),
  persona: UserPersonaEnum.nullable(),
  housingStatus: HousingStatusEnum.nullable(),
  housingCost: z.number(),
  housingPaymentDay: z.number().nullable(),
  adults: z.number(),
  children: z.number(),
  funBudget: z.number(),
  updatedAt: z.string(),
});

const savingsContributionResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  dayOfMonth: z.number(),
});

const householdResponseSchema = z.object({
  adults: z.number(),
  children: z.number(),
});

const housingResponseSchema = z.object({
  status: HousingStatusEnum.nullable(),
  monthlyCost: z.number(),
  paymentDay: z.number().nullable(),
});

export const profileAPIResponseSchema = z.object({
  id: z.string().optional(),
  email: z.string().optional(),
  firstName: z.string().nullable().optional(),

  age: z.number().nullable().optional(),
  persona: UserPersonaEnum.nullable().optional(),
  household: householdResponseSchema.optional(),
  funBudget: z.number().optional(),
  housing: housingResponseSchema.optional(),

  incomes: z.array(financialItemResponseSchema).default([]),
  fixedCosts: z.array(financialItemResponseSchema).default([]),
  variableCosts: z.array(financialItemResponseSchema).default([]),
  credits: z.array(financialItemResponseSchema).default([]),
  subscriptions: z.array(financialItemResponseSchema).default([]),
  annualExpenses: z.array(financialItemResponseSchema).default([]),

  assets: z.array(assetResponseSchema).default([]),
  currentBalance: z.number().optional(),
  savings: z.number().optional(),
  investedAmount: z.number().optional(),
  investments: z.array(assetResponseSchema).default([]),
  savingsContributions: z.array(savingsContributionResponseSchema).default([]),

  goals: z.array(financialGoalResponseSchema).default([]),
  decisions: z.array(purchaseDecisionResponseSchema).default([]),

  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// ============================================================================
// HELPER CLIENT — Validation runtime avec log [API CONTRACT BREACH]
// ============================================================================

export function parseAPIResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  endpoint: string,
): z.infer<T> | null {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields = result.error.issues.map(
    (i) => `${i.path.join('.')}: ${i.message} (got ${i.code})`,
  );

  console.error(
    `%c[API CONTRACT BREACH]%c ${endpoint}\n` +
      `Champs invalides :\n  • ${fields.join('\n  • ')}`,
    'color: #ff4444; font-weight: bold; font-size: 14px',
    'color: #ff8800; font-weight: bold',
  );

  return null;
}

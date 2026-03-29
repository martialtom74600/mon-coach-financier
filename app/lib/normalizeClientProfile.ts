import {
  INITIAL_PROFILE,
  HousingStatus,
  type BudgetResult,
  type Profile,
} from '@/app/lib/definitions';

/**
 * Forme minimale commune à :
 * - la sortie sérialisée de `getFullUserProfile()` (Prisma + serializeDecimals, dates encore possibles),
 * - le payload validé `GET /api/user` (`ProfileApiPayload`, dates en ISO string après JSON).
 *
 * Toute donnée supplémentaire est conservée via le spread sur `INITIAL_PROFILE`.
 */
export type ClientProfileSource = {
  household?: { adults?: number; children?: number } | null;
  housing?: {
    status?: string | null;
    monthlyCost?: number | null;
    paymentDay?: number | null;
  } | null;
  incomes?: unknown;
  fixedCosts?: unknown;
  variableCosts?: unknown;
  credits?: unknown;
  subscriptions?: unknown;
  annualExpenses?: unknown;
  assets?: unknown;
  investments?: unknown;
  savingsContributions?: unknown;
  goals?: unknown;
  decisions?: unknown;
  lastBudgetSnapshot?: unknown;
  [key: string]: unknown;
};

const HOUSING_STATUS_SET = new Set<string>(Object.values(HousingStatus));

function toHousingStatus(status: unknown): HousingStatus {
  return typeof status === 'string' && HOUSING_STATUS_SET.has(status)
    ? (status as HousingStatus)
    : HousingStatus.TENANT;
}

function coalesceList<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  return fallback;
}

function snapshotFromRaw(raw: unknown): BudgetResult | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  return raw as BudgetResult;
}

/**
 * Source de vérité : fusion `INITIAL_PROFILE` + champs normalisés (enums, tableaux, snapshot budget).
 */
export function normalizeClientProfile(raw: null | undefined): null;
export function normalizeClientProfile(raw: ClientProfileSource): Profile;
export function normalizeClientProfile(raw: ClientProfileSource | null | undefined): Profile | null {
  if (raw == null) return null;

  const { lastBudgetSnapshot: rawBudgetSnapshot, ...rest } = raw;
  const lastBudgetSnapshot = snapshotFromRaw(rawBudgetSnapshot);

  const profile: Profile = {
    ...INITIAL_PROFILE,
    ...rest,
    household: {
      ...INITIAL_PROFILE.household,
      ...(raw.household && typeof raw.household === 'object' ? raw.household : {}),
    },
    housing: {
      status: toHousingStatus(raw.housing?.status),
      monthlyCost: Number(raw.housing?.monthlyCost ?? 0),
      paymentDay: raw.housing?.paymentDay ?? undefined,
    },
    assets: coalesceList<Profile['assets'][number]>(raw.assets, INITIAL_PROFILE.assets),
    goals: coalesceList<Profile['goals'][number]>(raw.goals, INITIAL_PROFILE.goals),
    decisions: coalesceList<Profile['decisions'][number]>(raw.decisions, INITIAL_PROFILE.decisions),
    incomes: coalesceList<Profile['incomes'][number]>(raw.incomes, INITIAL_PROFILE.incomes),
    fixedCosts: coalesceList<Profile['fixedCosts'][number]>(raw.fixedCosts, INITIAL_PROFILE.fixedCosts),
    variableCosts: coalesceList<Profile['variableCosts'][number]>(
      raw.variableCosts,
      INITIAL_PROFILE.variableCosts,
    ),
    credits: coalesceList<Profile['credits'][number]>(raw.credits, INITIAL_PROFILE.credits),
    subscriptions: coalesceList<Profile['subscriptions'][number]>(
      raw.subscriptions,
      INITIAL_PROFILE.subscriptions,
    ),
    annualExpenses: coalesceList<Profile['annualExpenses'][number]>(
      raw.annualExpenses,
      INITIAL_PROFILE.annualExpenses,
    ),
    savingsContributions: coalesceList<Profile['savingsContributions'][number]>(
      raw.savingsContributions,
      INITIAL_PROFILE.savingsContributions,
    ),
    investments: coalesceList<Profile['investments'][number]>(
      raw.investments,
      INITIAL_PROFILE.investments,
    ),
    lastBudgetSnapshot,
  };

  return profile;
}

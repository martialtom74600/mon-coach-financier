import type { Profile } from '@/app/lib/definitions';
import {
  generateId,
  UserPersona,
  HousingStatus,
  ItemCategory,
  AssetType,
  Frequency,
} from '@/app/lib/definitions';
import type { FormProfile, AssetUiRow } from './ProfileWizard.types';

export const mapProfileToForm = (profile: Profile): FormProfile => {
  const assetsUi: AssetUiRow[] = [];

  (profile.assets || []).forEach((asset) => {
    assetsUi.push({
      id: asset.id,
      type: asset.type,
      name: asset.name,
      stock: asset.currentValue || 0,
      monthlyFlow: asset.monthlyFlow || 0,
      transferDay: asset.transferDay || 1,
    });
  });

  if (assetsUi.length === 0) {
    assetsUi.push({ id: generateId(), type: 'CC', name: 'Compte Courant', stock: 0, monthlyFlow: 0, transferDay: 1 });
  }

  return {
    ...profile,
    persona: profile.persona || UserPersona.SALARIED,
    assetsUi,
    housing: {
      status: profile.housing?.status || HousingStatus.TENANT,
      monthlyCost: profile.housing?.monthlyCost || 0,
      paymentDay: profile.housing?.paymentDay || 5,
    },
    incomes: profile.incomes || [],
    fixedCosts: profile.fixedCosts || [],
    variableCosts: profile.variableCosts || [],
    credits: profile.credits || [],
    subscriptions: profile.subscriptions || [],
    annualExpenses: profile.annualExpenses || [],
  } as FormProfile;
};

export const mapFormToPayload = (formData: FormProfile, lifestyle: number) => {
  const items = [
    ...formData.incomes.map((i) => ({ ...i, category: ItemCategory.INCOME })),
    ...formData.fixedCosts.map((i) => ({ ...i, category: ItemCategory.FIXED_COST })),
    ...formData.subscriptions.map((i) => ({ ...i, category: ItemCategory.SUBSCRIPTION })),
    ...formData.credits.map((i) => ({ ...i, category: ItemCategory.CREDIT })),
    ...formData.annualExpenses.map((i) => ({ ...i, category: ItemCategory.ANNUAL_EXPENSE })),
    ...formData.variableCosts.map((i) => ({ ...i, category: ItemCategory.VARIABLE_COST })),
  ].map((item) => ({
    name: item.name,
    amount: typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount,
    category: item.category,
    frequency: Frequency.MONTHLY,
    dayOfMonth: item.category === ItemCategory.VARIABLE_COST ? null : (item.dayOfMonth ?? 1),
  }));

  const assets = formData.assetsUi.map((asset) => {
    let typeKey = asset.type;
    if (typeKey === 'cc') typeKey = 'CC';
    return {
      id: asset.id,
      name: asset.name,
      type: typeKey as AssetType,
      currentValue: asset.stock,
      monthlyFlow: asset.monthlyFlow,
      transferDay: asset.transferDay,
    };
  });

  return {
    firstName: formData.firstName,
    profile: {
      age: parseInt(String(formData.age)),
      persona: formData.persona as UserPersona,
      housingStatus: formData.housing.status as HousingStatus,
      housingCost: formData.housing.monthlyCost || 0,
      housingPaymentDay: formData.housing.paymentDay || 1,
      adults: formData.household?.adults || 1,
      children: formData.household?.children || 0,
      funBudget: lifestyle,
    },
    items,
    assets,
  };
};

export const mapFormToEngineProfile = (formData: FormProfile): Profile => {
  let totalCash = 0,
    totalInvested = 0,
    totalSavings = 0;

  formData.assetsUi.forEach((a) => {
    const t = a.type.toUpperCase();
    if (t === 'CC') totalCash += a.stock;
    else if (['LIVRET', 'LDDS', 'LEP', 'PEL', 'PEE'].includes(t)) totalSavings += a.stock;
    else totalInvested += a.stock;
  });

  const investments = formData.assetsUi.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as AssetType,
    currentValue: a.stock,
    amount: a.stock,
    frequency: Frequency.MONTHLY,
  }));

  const savingsContributions = formData.assetsUi
    .filter((a) => a.type.toUpperCase() !== 'CC' && a.monthlyFlow > 0)
    .map((a) => ({
      id: a.id,
      name: a.name,
      amount: a.monthlyFlow,
      dayOfMonth: a.transferDay,
      frequency: Frequency.MONTHLY,
    }));

  return {
    ...formData,
    investedAmount: totalInvested,
    savings: totalSavings,
    currentBalance: totalCash,
    investments: investments as unknown as Profile['investments'],
    savingsContributions,
    housing: { ...formData.housing } as Profile['housing'],
    updatedAt: new Date().toISOString(),
  } as Profile;
};

/** Payload partiel pour sauvegarde par section (K.4) */
export type SectionPayload = {
  firstName?: string;
  profile?: {
    age?: number;
    persona?: string;
    housingStatus?: string;
    housingCost?: number;
    housingPaymentDay?: number;
    adults?: number;
    children?: number;
    funBudget?: number;
  };
  items?: Array<{ name: string; amount: number; category: string; frequency?: string; dayOfMonth?: number | null }>;
  assets?: Array<{ id?: string; name: string; type: string; currentValue: number; monthlyFlow?: number; transferDay?: number }>;
  goals?: Array<unknown>;
};

export const mapSectionToPayload = (
  section: 'identity' | 'situation' | 'charges' | 'assets' | 'strategy',
  formData: FormProfile,
  funBudget?: number,
): SectionPayload => {
  const age = formData.age ? parseInt(String(formData.age)) : undefined;
  const housing = formData.housing;

  switch (section) {
    case 'identity':
      return {
        firstName: formData.firstName || undefined,
        profile: age !== undefined && !isNaN(age) ? { age } : undefined,
      };
    case 'situation':
      return {
        profile: {
          persona: formData.persona as string,
          housingStatus: housing?.status as string,
          housingCost: housing?.monthlyCost ?? 0,
          housingPaymentDay: housing?.paymentDay ?? 1,
          adults: formData.household?.adults ?? 1,
          children: formData.household?.children ?? 0,
        },
      };
    case 'charges': {
      const full = mapFormToPayload(formData, funBudget ?? formData.funBudget ?? 0);
      const validItems = full.items.filter(
        (i) => typeof i.name === 'string' && i.name.trim().length > 0 && !Number.isNaN(i.amount) && Number.isFinite(i.amount),
      );
      return { items: validItems };
    }
    case 'assets': {
      const full = mapFormToPayload(formData, funBudget ?? formData.funBudget ?? 0);
      const validAssets = full.assets.filter(
        (a) =>
          typeof a.name === 'string' &&
          a.name.trim().length > 0 &&
          !Number.isNaN(a.currentValue) &&
          Number.isFinite(a.currentValue),
      );
      return { assets: validAssets };
    }
    case 'strategy':
      return {
        profile: { funBudget: funBudget ?? formData.funBudget ?? 0 },
      };
    default:
      return {};
  }
};

export const parseNumber = (val: string | number | undefined): number =>
  parseFloat(String(val).replace(/\s/g, '').replace(',', '.')) || 0;

export const generateIdHelper = () => Math.random().toString(36).substr(2, 9);

export const getInputValue = (e: React.ChangeEvent<HTMLInputElement> | string | number) => {
  if (typeof e === 'object' && e !== null && 'target' in e) return e.target.value;
  return e;
};

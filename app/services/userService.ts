import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { serializeDecimals, INITIAL_PROFILE, Profile, HousingStatus } from '@/app/lib/definitions';
import { z } from 'zod';
import { saveUserSchema } from '@/app/lib/validations';

type WizardData = z.infer<typeof saveUserSchema>;

type RawProfile = Awaited<ReturnType<typeof getFullUserProfile>>;

/** Shape minimale pour la fusion (getFullUserProfile peut retourner un objet partiel si !user.profile) */
interface RawProfileShape {
  household?: { adults?: number; children?: number };
  housing?: { status?: string; monthlyCost?: number; paymentDay?: number };
  assets?: unknown[];
  goals?: unknown[];
  decisions?: unknown[];
  incomes?: unknown[];
  fixedCosts?: unknown[];
  variableCosts?: unknown[];
  credits?: unknown[];
  subscriptions?: unknown[];
  annualExpenses?: unknown[];
  savingsContributions?: unknown[];
  [key: string]: unknown;
}

/** Transforme la réponse brute de getFullUserProfile en Profile (même logique que useFinancialData) */
export function buildProfileForClient(raw: RawProfile): Profile | null {
  if (!raw) return null;
  const r = raw as RawProfileShape;
  return {
    ...INITIAL_PROFILE,
    ...raw,
    household: { ...INITIAL_PROFILE.household, ...(r.household || {}) },
    housing: {
      status: r.housing?.status ?? HousingStatus.TENANT,
      monthlyCost: r.housing?.monthlyCost ?? 0,
      paymentDay: r.housing?.paymentDay ?? undefined,
    },
    assets: r.assets || [],
    goals: r.goals || [],
    decisions: r.decisions || [],
    incomes: r.incomes || [],
    fixedCosts: r.fixedCosts || [],
    variableCosts: r.variableCosts || [],
    credits: r.credits || [],
    subscriptions: r.subscriptions || [],
    annualExpenses: r.annualExpenses || [],
    savingsContributions: r.savingsContributions || [],
  } as Profile;
}

export async function getFullUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          items: true,
          assets: true,
          goals: true,
          decisions: { orderBy: { date: 'desc' }, take: 50 },
        },
      },
    },
  });

  if (!user) return null;

  if (!user.profile) {
    return {
      firstName: user.firstName,
      email: user.email,
      incomes: [],
      fixedCosts: [],
      variableCosts: [],
      credits: [],
      subscriptions: [],
      annualExpenses: [],
      investments: [],
      savingsContributions: [],
      goals: [],
      decisions: [],
    };
  }

  const p = user.profile;

  const itemsMap = p.items.reduce(
    (acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, typeof p.items>,
  );

  const assets = serializeDecimals(p.assets);

  const currentBalance = assets
    .filter((a) => a.type === 'CC')
    .reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);

  const savings = assets
    .filter((a) => ['LIVRET', 'LDDS', 'LEP', 'PEL', 'PEE'].includes(a.type))
    .reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);

  const investedAmount = assets
    .filter((a) => !['CC', 'LIVRET', 'LDDS', 'LEP', 'PEL', 'PEE'].includes(a.type))
    .reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);

  return serializeDecimals({
    id: user.id,
    email: user.email,
    firstName: user.firstName,

    age: p.age,
    persona: p.persona,
    household: { adults: p.adults, children: p.children },
    funBudget: p.funBudget,

    housing: {
      status: p.housingStatus,
      monthlyCost: p.housingCost,
      paymentDay: p.housingPaymentDay,
    },

    incomes: itemsMap['INCOME'] || [],
    fixedCosts: itemsMap['FIXED_COST'] || [],
    variableCosts: itemsMap['VARIABLE_COST'] || [],
    credits: itemsMap['CREDIT'] || [],
    subscriptions: itemsMap['SUBSCRIPTION'] || [],
    annualExpenses: itemsMap['ANNUAL_EXPENSE'] || [],

    assets,
    currentBalance,
    savings,
    investedAmount,
    investments: assets.filter((a) => a.type !== 'CC'),
    savingsContributions: assets
      .filter((a) => Number(a.monthlyFlow) > 0)
      .map((a) => ({ id: a.id, name: a.name, amount: a.monthlyFlow, dayOfMonth: a.transferDay })),

    goals: p.goals,
    decisions: p.decisions,

    createdAt: user.createdAt,
    updatedAt: p.updatedAt,
  });
}

/** Version cachée de getFullUserProfile : déduplication par requête (React cache) + cache cross-request (unstable_cache). */
export const getCachedProfile = cache(async (userId: string) => {
  return unstable_cache(
    async () => getFullUserProfile(userId),
    ['profile', userId],
    { tags: ['profile', `profile-${userId}`] },
  )();
});

export async function saveFullUserProfile(
  userId: string,
  email: string,
  defaultFirstName: string,
  data: WizardData,
) {
  const { firstName, profile, items, assets, goals } = data;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { id: userId },
      update: { firstName: firstName || undefined },
      create: {
        id: userId,
        email,
        firstName: firstName || defaultFirstName,
      },
    });

    const profileData = profile ?? {};

    const financialProfile = await tx.financialProfile.upsert({
      where: { userId: user.id },
      update: { ...profileData },
      create: { userId: user.id, ...profileData },
    });

    if (Array.isArray(items) && items.length > 0) {
      await tx.financialItem.deleteMany({ where: { profileId: financialProfile.id } });
      await tx.financialItem.createMany({
        data: items.map((item) => ({
          profileId: financialProfile.id,
          name: item.name,
          amount: item.amount,
          category: item.category,
          frequency: item.frequency ?? 'MONTHLY',
          dayOfMonth: item.dayOfMonth ?? 1,
        })),
      });
    }

    if (Array.isArray(assets) && assets.length > 0) {
      await tx.asset.deleteMany({ where: { profileId: financialProfile.id } });
      await tx.asset.createMany({
        data: assets.map((asset) => ({
          profileId: financialProfile.id,
          name: asset.name,
          type: asset.type,
          currentValue: asset.currentValue ?? 0,
          monthlyFlow: asset.monthlyFlow ?? 0,
          transferDay: asset.transferDay ?? 1,
        })),
      });
    }

    if (Array.isArray(goals) && goals.length > 0) {
      await tx.financialGoal.deleteMany({ where: { profileId: financialProfile.id } });
      await tx.financialGoal.createMany({
        data: goals.map((goal) => ({
          profileId: financialProfile.id,
          name: goal.name,
          category: goal.category,
          targetAmount: goal.targetAmount,
          currentSaved: goal.currentSaved ?? 0,
          monthlyContribution: goal.monthlyContribution ?? 0,
          deadline: goal.deadline,
          projectedYield: goal.projectedYield ?? 0,
          transferDay: goal.transferDay ?? undefined,
        })),
      });
    }

    return financialProfile;
  });

  return { success: true, profileId: result.id };
}

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { serializeDecimals, Profile } from '@/app/lib/definitions';
import {
  normalizeClientProfile,
  type ClientProfileSource,
} from '@/app/lib/normalizeClientProfile';
import { profileCacheTagsForUser } from '@/app/lib/cacheTags';
import { z } from 'zod';
import { saveUserSchema } from '@/app/lib/validations';
import {
  clerkWebhookPrimaryEmail,
  type ClerkWebhookUserBody,
} from '@/app/lib/clerkWebhookUser';

type WizardData = z.infer<typeof saveUserSchema>;

type RawProfile = Awaited<ReturnType<typeof getFullUserProfile>>;

/** @see normalizeClientProfile — source de vérité partagée avec le client (GET /api/user). */
export function buildProfileForClient(raw: RawProfile): Profile | null {
  if (raw == null) return null;
  return normalizeClientProfile(raw as ClientProfileSource);
}

/** Crée User + FinancialProfile minimal si absents (pour accès paramètres sans profil). */
export async function ensureUserAndProfile(
  userId: string,
  email: string,
  firstName?: string,
): Promise<string> {
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email,
      firstName: firstName ?? '',
    },
  });

  let profile = await prisma.financialProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    profile = await prisma.financialProfile.create({
      data: { userId: user.id },
      select: { id: true },
    });
  }
  return profile.id;
}

export type { ClerkWebhookUserBody } from '@/app/lib/clerkWebhookUser';

/**
 * Synchro depuis les webhooks Clerk : identité (email, prénom) + FinancialProfile minimal si absent.
 * Complète `ensureUserAndProfile` (lazy) qui ne met pas à jour l’identité sur compte existant.
 */
export async function syncUserIdentityFromClerkWebhook(data: ClerkWebhookUserBody): Promise<void> {
  const email = clerkWebhookPrimaryEmail(data);
  const firstName = data.first_name?.trim() ?? '';
  await prisma.user.upsert({
    where: { id: data.id },
    create: { id: data.id, email, firstName },
    update: { email, firstName },
  });
  const profile = await prisma.financialProfile.findUnique({
    where: { userId: data.id },
    select: { id: true },
  });
  if (!profile) {
    await prisma.financialProfile.create({ data: { userId: data.id } });
  }
}

/** Suppression locale après `user.deleted` côté Clerk (cascade Prisma sur le profil). */
export async function deleteLocalUserByClerkId(userId: string): Promise<void> {
  await prisma.user.deleteMany({ where: { id: userId } });
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
    profileId: p.id,
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

    lastBudgetSnapshot: p.lastBudgetSnapshot,

    createdAt: user.createdAt,
    updatedAt: p.updatedAt,
  });
}

/** Version cachée de getFullUserProfile : déduplication par requête (React cache) + cache cross-request (unstable_cache). */
export const getCachedProfile = cache(async (userId: string) => {
  return unstable_cache(
    async () => getFullUserProfile(userId),
    ['profile', userId],
    { tags: profileCacheTagsForUser(userId) },
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

    if (Array.isArray(assets)) {
      const existingAssets = await tx.asset.findMany({
        where: { profileId: financialProfile.id },
        select: { id: true, currentValue: true },
      });
      const existingById = new Map(existingAssets.map((a) => [a.id, a]));
      const incomingIds = new Set(assets.map((a) => a.id).filter(Boolean));

      for (const asset of assets) {
        const currentValue = asset.currentValue ?? 0;
        const data = {
          name: asset.name,
          type: asset.type,
          currentValue,
          monthlyFlow: asset.monthlyFlow ?? 0,
          transferDay: asset.transferDay ?? 1,
        };

        const existing = asset.id ? existingById.get(asset.id) : null;
        if (existing) {
          await tx.asset.update({
            where: { id: asset.id },
            data,
          });
          if (Number(existing.currentValue) !== currentValue) {
            await tx.assetHistory.create({
              data: { assetId: asset.id!, value: currentValue },
            });
          }
        } else {
          const created = await tx.asset.create({
            data: { profileId: financialProfile.id, ...data },
          });
          await tx.assetHistory.create({
            data: { assetId: created.id, value: currentValue },
          });
        }
      }

      const toDelete = existingAssets.filter((a) => !incomingIds.has(a.id));
      if (toDelete.length > 0) {
        await tx.asset.deleteMany({
          where: { id: { in: toDelete.map((a) => a.id) } },
        });
      }
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

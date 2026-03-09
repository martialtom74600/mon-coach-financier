import { prisma } from '@/app/lib/prisma';
import { serializeDecimals } from '@/app/lib/definitions';

interface WizardData {
  firstName?: string;
  profile?: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
  assets?: Array<Record<string, unknown>>;
  goals?: Array<Record<string, unknown>>;
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
    investments: assets.filter((a) => a.type !== 'CC'),
    savingsContributions: assets.filter((a) => a.monthlyFlow > 0),

    goals: p.goals,
    decisions: p.decisions,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

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

    if (Array.isArray(items)) {
      await tx.financialItem.deleteMany({ where: { profileId: financialProfile.id } });
      if (items.length > 0) {
        await tx.financialItem.createMany({
          data: items.map((item) => ({ profileId: financialProfile.id, ...item })),
        });
      }
    }

    if (Array.isArray(assets)) {
      await tx.asset.deleteMany({ where: { profileId: financialProfile.id } });
      if (assets.length > 0) {
        await tx.asset.createMany({
          data: assets.map((asset) => ({ profileId: financialProfile.id, ...asset })),
        });
      }
    }

    if (Array.isArray(goals)) {
      await tx.financialGoal.deleteMany({ where: { profileId: financialProfile.id } });
      if (goals.length > 0) {
        await tx.financialGoal.createMany({
          data: goals.map((goal) => ({ profileId: financialProfile.id, ...goal })),
        });
      }
    }

    return financialProfile;
  });

  return { success: true, profileId: result.id };
}

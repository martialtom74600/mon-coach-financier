import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { serializeDecimals } from '@/app/lib/definitions';
import { getProfileId } from './profileService';
import { ServiceError } from './errors';

export async function createGoal(
  userId: string,
  data: Omit<Prisma.FinancialGoalUncheckedCreateInput, 'profileId' | 'profile'>,
) {
  const profileId = await getProfileId(userId);
  const goal = await prisma.financialGoal.create({
    data: { profileId, ...data },
  });
  return serializeDecimals(goal);
}

async function findOwnedGoal(profileId: string, goalId: string) {
  const goal = await prisma.financialGoal.findFirst({
    where: { id: goalId, profileId },
  });
  if (!goal) throw ServiceError.forbidden();
  return goal;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: Parameters<typeof prisma.financialGoal.update>[0]['data'],
) {
  const profileId = await getProfileId(userId);
  await findOwnedGoal(profileId, goalId);
  const goal = await prisma.financialGoal.update({
    where: { id: goalId },
    data,
  });
  return serializeDecimals(goal);
}

export async function deleteGoal(userId: string, goalId: string) {
  const profileId = await getProfileId(userId);
  await findOwnedGoal(profileId, goalId);
  await prisma.financialGoal.delete({ where: { id: goalId } });
  return { success: true };
}

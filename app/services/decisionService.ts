import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { serializeDecimals } from '@/app/lib/definitions';
import { getProfileId } from './profileService';
import { ServiceError } from './errors';

export async function createDecision(
  userId: string,
  data: Omit<Prisma.PurchaseDecisionUncheckedCreateInput, 'profileId' | 'profile'>,
) {
  const profileId = await getProfileId(userId);
  const decision = await prisma.purchaseDecision.create({
    data: { profileId, ...data },
  });
  return serializeDecimals(decision);
}

async function findOwnedDecision(profileId: string, decisionId: string) {
  const decision = await prisma.purchaseDecision.findFirst({
    where: { id: decisionId, profileId },
  });
  if (!decision) throw ServiceError.forbidden();
  return decision;
}

export async function updateDecision(
  userId: string,
  decisionId: string,
  data: Parameters<typeof prisma.purchaseDecision.update>[0]['data'],
) {
  const profileId = await getProfileId(userId);
  await findOwnedDecision(profileId, decisionId);
  const decision = await prisma.purchaseDecision.update({
    where: { id: decisionId },
    data,
  });
  return serializeDecimals(decision);
}

export async function deleteDecision(userId: string, decisionId: string) {
  const profileId = await getProfileId(userId);
  await findOwnedDecision(profileId, decisionId);
  await prisma.purchaseDecision.delete({ where: { id: decisionId } });
  return { success: true };
}

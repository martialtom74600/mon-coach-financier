import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { serializeDecimals } from '@/app/lib/definitions';
import { getProfileId } from './profileService';
import { ServiceError } from './errors';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface ListDecisionsResult {
  decisions: ReturnType<typeof serializeDecimals>[];
  nextCursor: string | null;
}

export async function listDecisions(
  userId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<ListDecisionsResult> {
  const profileId = await getProfileId(userId);
  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);

  const decisions = await prisma.purchaseDecision.findMany({
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    where: { profileId },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  });

  const hasMore = decisions.length > limit;
  const items = hasMore ? decisions.slice(0, limit) : decisions;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    decisions: serializeDecimals(items),
    nextCursor,
  };
}

export async function getDecisionsStats(userId: string) {
  const profileId = await getProfileId(userId);

  const [total, satisfied, regretted, amountResult] = await Promise.all([
    prisma.purchaseDecision.count({ where: { profileId } }),
    prisma.purchaseDecision.count({ where: { profileId, outcome: 'SATISFIED' } }),
    prisma.purchaseDecision.count({ where: { profileId, outcome: 'REGRETTED' } }),
    prisma.purchaseDecision.aggregate({
      where: { profileId },
      _sum: { amount: true },
    }),
  ]);

  return {
    total,
    accepted: satisfied,
    rejected: regretted,
    amountTotal: Number(amountResult._sum.amount ?? 0),
  };
}

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

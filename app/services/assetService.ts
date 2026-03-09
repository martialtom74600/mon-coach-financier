import { Prisma } from '@prisma/client';
import { subMonths } from 'date-fns';
import { prisma } from '@/app/lib/prisma';
import { serializeDecimals } from '@/app/lib/definitions';
import { getProfileId } from './profileService';
import { ServiceError } from './errors';

/** Seuil de rétention : snapshots plus anciens que 12 mois sont agrégés en mensuel */
const RETENTION_MONTHS = 12;

export async function createAsset(
  userId: string,
  data: Omit<Prisma.AssetUncheckedCreateInput, 'profileId' | 'profile'> & { currentValue: number },
) {
  const profileId = await getProfileId(userId);
  const asset = await prisma.asset.create({
    data: {
      profileId,
      ...data,
      history: { create: { value: data.currentValue } },
    },
  });
  return serializeDecimals(asset);
}

async function findOwnedAsset(profileId: string, assetId: string) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, profileId },
  });
  if (!asset) throw ServiceError.forbidden();
  return asset;
}

export async function updateAsset(
  userId: string,
  assetId: string,
  data: { currentValue?: number; [key: string]: unknown },
) {
  const profileId = await getProfileId(userId);
  await findOwnedAsset(profileId, assetId);

  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data,
  });

  if (data.currentValue !== undefined) {
    await prisma.assetHistory.create({
      data: { assetId, value: data.currentValue },
    });
  }

  return serializeDecimals(updatedAsset);
}

export async function deleteAsset(userId: string, assetId: string) {
  const profileId = await getProfileId(userId);
  await findOwnedAsset(profileId, assetId);
  await prisma.asset.delete({ where: { id: assetId } });
  return { success: true };
}

export async function getAssetHistory(userId: string, assetId: string) {
  const profileId = await getProfileId(userId);
  await findOwnedAsset(profileId, assetId);

  const history = await prisma.assetHistory.findMany({
    where: { assetId },
    orderBy: { date: 'asc' },
    select: { id: true, value: true, date: true },
  });

  return serializeDecimals(history);
}

/**
 * Agrège les snapshots AssetHistory > 12 mois en un point mensuel (moyenne).
 * Réduit la croissance de la table sans perdre l'information de tendance.
 * F.3 — Rétention AssetHistory
 */
export async function aggregateAssetHistory(): Promise<{
  deleted: number;
  inserted: number;
}> {
  const cutoff = subMonths(new Date(), RETENTION_MONTHS);

  const oldRecords = await prisma.assetHistory.findMany({
    where: { date: { lt: cutoff } },
    select: { id: true, assetId: true, value: true, date: true },
  });

  if (oldRecords.length === 0) {
    return { deleted: 0, inserted: 0 };
  }

  type GroupKey = string;
  const groups = new Map<
    GroupKey,
    { ids: string[]; values: number[]; assetId: string; year: number; month: number }
  >();

  for (const r of oldRecords) {
    const d = r.date;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key: GroupKey = `${r.assetId}-${year}-${month}`;

    if (!groups.has(key)) {
      groups.set(key, { ids: [], values: [], assetId: r.assetId, year, month });
    }
    const g = groups.get(key)!;
    g.ids.push(r.id);
    g.values.push(Number(r.value));
  }

  const toDelete: string[] = [];
  const toInsert: { assetId: string; value: number; date: Date }[] = [];

  for (const g of groups.values()) {
    toDelete.push(...g.ids);
    const avg =
      Math.round((g.values.reduce((a, b) => a + b, 0) / g.values.length) * 100) / 100;
    toInsert.push({
      assetId: g.assetId,
      value: avg,
      date: new Date(g.year, g.month - 1, 1),
    });
  }

  await prisma.$transaction([
    prisma.assetHistory.deleteMany({ where: { id: { in: toDelete } } }),
    prisma.assetHistory.createMany({ data: toInsert }),
  ]);

  return { deleted: toDelete.length, inserted: toInsert.length };
}

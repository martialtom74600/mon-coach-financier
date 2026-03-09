import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { serializeDecimals } from '@/app/lib/definitions';
import { getProfileId } from './profileService';
import { ServiceError } from './errors';

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

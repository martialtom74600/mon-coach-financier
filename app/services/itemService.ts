import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { serializeDecimals } from '@/app/lib/definitions';
import { getProfileId } from './profileService';
import { ServiceError } from './errors';

export async function createItem(
  userId: string,
  data: Omit<Prisma.FinancialItemUncheckedCreateInput, 'profileId' | 'profile'>,
) {
  const profileId = await getProfileId(userId);
  const item = await prisma.financialItem.create({
    data: { profileId, ...data },
  });
  return serializeDecimals(item);
}

async function findOwnedItem(profileId: string, itemId: string) {
  const item = await prisma.financialItem.findFirst({
    where: { id: itemId, profileId },
  });
  if (!item) throw ServiceError.forbidden();
  return item;
}

export async function updateItem(
  userId: string,
  itemId: string,
  data: Parameters<typeof prisma.financialItem.update>[0]['data'],
) {
  const profileId = await getProfileId(userId);
  await findOwnedItem(profileId, itemId);
  const item = await prisma.financialItem.update({
    where: { id: itemId },
    data,
  });
  return serializeDecimals(item);
}

export async function deleteItem(userId: string, itemId: string) {
  const profileId = await getProfileId(userId);
  await findOwnedItem(profileId, itemId);
  await prisma.financialItem.delete({ where: { id: itemId } });
  return { success: true };
}

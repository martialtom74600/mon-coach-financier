import { prisma } from '@/app/lib/prisma';
import { serializeDecimals } from '@/app/lib/definitions';
import { ServiceError } from './errors';

export async function getProfileId(userId: string): Promise<string> {
  const profile = await prisma.financialProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) throw ServiceError.notFound('Profil');
  return profile.id;
}

type ProfileUpdateData = {
  firstName?: string;
  age?: number | null;
  persona?: string | null;
  housingStatus?: string | null;
  housingCost?: number;
  housingPaymentDay?: number;
  adults?: number;
  children?: number;
  funBudget?: number;
};

export async function updateProfile(userId: string, data: ProfileUpdateData) {
  const { firstName, ...profileData } = data;

  if (firstName !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { firstName },
    });
  }

  const profile = await prisma.financialProfile.update({
    where: { userId },
    data: profileData as Parameters<typeof prisma.financialProfile.update>[0]['data'],
  });
  return serializeDecimals(profile);
}

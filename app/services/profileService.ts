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

export async function updateProfile(
  userId: string,
  data: Parameters<typeof prisma.financialProfile.update>[0]['data'],
) {
  const profile = await prisma.financialProfile.update({
    where: { userId },
    data,
  });
  return serializeDecimals(profile);
}

/**
 * preferencesService.ts — Gestion des préférences utilisateur (K.1)
 *
 * Notifications (push, emails), consentements RGPD.
 */

import { prisma } from '@/app/lib/prisma';
import { getProfileId } from './profileService';
import { ServiceError } from './errors';

export interface PreferencesData {
  pushEnabled?: boolean;
  emailAlerts?: boolean;
  emailNewsletter?: boolean;
  consentAnalytics?: boolean;
  consentMarketing?: boolean;
}

const DEFAULT_PREFERENCES = {
  pushEnabled: false,
  emailAlerts: false,
  emailNewsletter: false,
  consentAnalytics: false,
  consentMarketing: false,
};

/** Récupère les préférences du profil, ou crée les valeurs par défaut */
export async function getPreferences(profileId: string) {
  let prefs = await prisma.userPreferences.findUnique({
    where: { profileId },
  });

  if (!prefs) {
    prefs = await prisma.userPreferences.create({
      data: {
        profileId,
        ...DEFAULT_PREFERENCES,
      },
    });
  }

  return {
    id: prefs.id,
    pushEnabled: prefs.pushEnabled,
    emailAlerts: prefs.emailAlerts,
    emailNewsletter: prefs.emailNewsletter,
    consentAnalytics: prefs.consentAnalytics,
    consentMarketing: prefs.consentMarketing,
    consentUpdatedAt: prefs.consentUpdatedAt.toISOString(),
    createdAt: prefs.createdAt.toISOString(),
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

/** Met à jour les préférences par profileId (merge partiel) */
export async function updatePreferencesByProfileId(
  profileId: string,
  data: PreferencesData
): Promise<ReturnType<typeof getPreferences>> {
  const updateData: Record<string, unknown> = {};
  const hasConsentChange =
    data.consentAnalytics !== undefined || data.consentMarketing !== undefined;

  if (data.pushEnabled !== undefined) {
    updateData.pushEnabled = data.pushEnabled;
    updateData.pushAskedAt = data.pushEnabled ? new Date() : null;
  }
  if (data.emailAlerts !== undefined) updateData.emailAlerts = data.emailAlerts;
  if (data.emailNewsletter !== undefined) updateData.emailNewsletter = data.emailNewsletter;
  if (data.consentAnalytics !== undefined) updateData.consentAnalytics = data.consentAnalytics;
  if (data.consentMarketing !== undefined) updateData.consentMarketing = data.consentMarketing;
  if (hasConsentChange) updateData.consentUpdatedAt = new Date();

  await prisma.userPreferences.upsert({
    where: { profileId },
    create: {
      profileId,
      ...DEFAULT_PREFERENCES,
      ...(updateData as object),
    },
    update: updateData as object,
  });

  return getPreferences(profileId);
}

/** Met à jour les préférences par userId (récupère profileId via getProfileId) */
export async function updatePreferences(
  userId: string,
  data: PreferencesData
): Promise<ReturnType<typeof getPreferences>> {
  const profileId = await getProfileId(userId);
  return updatePreferencesByProfileId(profileId, data);
}

/** Met à jour uniquement les consentements RGPD */
export async function updateConsents(
  userId: string,
  consents: { consentAnalytics?: boolean; consentMarketing?: boolean }
): Promise<ReturnType<typeof getPreferences>> {
  const profileId = await getProfileId(userId);
  return updatePreferencesByProfileId(profileId, consents);
}

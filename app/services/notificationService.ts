/**
 * notificationService.ts — Gestion des push notifications PWA
 *
 * I.3 — Notifications PWA : subscription et envoi via Web Push API (VAPID)
 */

import webpush from 'web-push';
import { prisma } from '@/app/lib/prisma';
import { getProfileId } from './profileService';
import { logger } from '@/app/lib/logger';

// VAPID keys — générer avec: npx web-push generate-vapid-keys
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    'mailto:support@moncoachfinancier.fr',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Enregistre ou met à jour une subscription push pour un profil */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionInput
): Promise<void> {
  const profileId = await getProfileId(userId);
  const { endpoint, keys } = subscription;

  await prisma.pushSubscription.upsert({
    where: {
      profileId_endpoint: { profileId, endpoint },
    },
    create: {
      profileId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });
}

/** Envoie une push notification pour un insight à tous les abonnés du profil */
export async function sendPushForInsight(
  profileId: string,
  payload: { title: string; body: string; url?: string; insightId?: string }
): Promise<number> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return 0;
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { profileId },
  });

  if (subs.length === 0) return 0;

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    insightId: payload.insightId,
  });

  let sent = 0;
  const invalidEndpoints: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushPayload,
        { TTL: 86400 }
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        invalidEndpoints.push(sub.endpoint);
      }
      logger.warn('PUSH_SEND_FAILED', { profileId, endpoint: sub.endpoint, status }, err);
    }
  }

  if (invalidEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { profileId, endpoint: { in: invalidEndpoints } },
    });
  }

  return sent;
}

/** Retourne la clé publique VAPID pour le client */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC;
}

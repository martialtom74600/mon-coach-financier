/**
 * Webhooks Clerk — synchro users ↔ Postgres.
 * Dashboard Clerk : ajouter l’endpoint POST https://<domaine>/api/webhooks/clerk
 * Événements : user.created, user.updated, user.deleted
 * Variable : CLERK_WEBHOOK_SIGNING_SECRET (signing secret du endpoint, format whsec_…)
 */

import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { logger } from '@/app/lib/logger';
import { userService } from '@/app/services';
import type { ClerkWebhookUserBody } from '@/app/lib/clerkWebhookUser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ClerkWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
};

function isUserPayload(data: unknown): data is ClerkWebhookUserBody {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.id === 'string';
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret?.trim()) {
    logger.warn('CLERK_WEBHOOK', { reason: 'CLERK_WEBHOOK_SIGNING_SECRET missing' });
    return NextResponse.json({ error: 'Webhooks not configured' }, { status: 503 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const payload = await req.text();
  let evt: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    logger.warn('CLERK_WEBHOOK_VERIFY', { error: String(err) });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        if (!isUserPayload(evt.data)) {
          logger.warn('CLERK_WEBHOOK', { type: evt.type, reason: 'invalid user payload' });
          return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
        }
        await userService.syncUserIdentityFromClerkWebhook(evt.data);
        break;
      }
      case 'user.deleted': {
        const id = evt.data && typeof evt.data === 'object' && 'id' in evt.data
          ? (evt.data as { id: unknown }).id
          : null;
        if (typeof id !== 'string') {
          logger.warn('CLERK_WEBHOOK', { type: evt.type, reason: 'missing id' });
          return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
        }
        await userService.deleteLocalUserByClerkId(id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    logger.error('CLERK_WEBHOOK_HANDLER', { type: evt.type }, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

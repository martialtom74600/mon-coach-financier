import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getVapidPublicKey,
  savePushSubscription,
} from '@/app/services/notificationService';
import { pushSubscriptionSchema, validationError } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';

/** GET — Retourne la clé publique VAPID pour le client */
export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: 'Push notifications non configurées' },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}

/** POST — Enregistre une subscription push pour l'utilisateur connecté */
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const body = await req.json();
    const parsed = pushSubscriptionSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    await savePushSubscription(userId, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API_POST_NOTIFICATIONS_SUBSCRIBE', { userId }, error);
    return new NextResponse('Erreur interne', { status: 500 });
  }
}

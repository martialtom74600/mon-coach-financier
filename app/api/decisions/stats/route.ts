import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/app/lib/logger';
import { decisionService, ServiceError } from '@/app/services';

/**
 * Totaux agrégés (toutes les décisions) sans charger de liste — alimente l’encart stats
 * quand le profil préchargé est plafonné (50) et peut ne pas refléter la BDD complète.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });

  try {
    const stats = await decisionService.getDecisionsStats(userId);
    return NextResponse.json({ stats });
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error('API_GET_DECISIONS_STATS', { userId }, error);
    return new NextResponse('Oups, petit bug. Réessaie ?', { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/app/lib/logger';
import { insightService, ServiceError } from '@/app/services';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Non autorisé', { status: 401 });

  const { id } = await params;
  if (!id || typeof id !== 'string' || id.length > 100) {
    return new NextResponse(JSON.stringify({ error: 'ID invalide' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await insightService.markInsightAsRead(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error('API_PATCH_INSIGHT', { userId, insightId: id }, error);
    return new NextResponse('Erreur interne', { status: 500 });
  }
}

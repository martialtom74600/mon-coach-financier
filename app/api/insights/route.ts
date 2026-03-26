import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listInsightsQuerySchema, validationError } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { insightService, profileService, ServiceError } from '@/app/services';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Tu n\'as pas accès à ça.', { status: 401 });

  try {
    const profileId = await profileService.getProfileId(userId);
    const { searchParams } = new URL(req.url);
    const unreadParam = searchParams.get('unreadOnly');
    const limitParam = searchParams.get('limit');
    const parsed = listInsightsQuerySchema.safeParse({
      unreadOnly: unreadParam === 'true' ? true : unreadParam === 'false' ? false : undefined,
      limit: limitParam ?? undefined,
    });
    if (!parsed.success) return validationError(parsed.error);

    const insights = await insightService.listInsights(profileId, parsed.data);
    return NextResponse.json({ insights });
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error('API_GET_INSIGHTS', { userId }, error);
    return new NextResponse('Oups, petit bug. Réessaie ?', { status: 500 });
  }
}

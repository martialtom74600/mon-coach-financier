import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createDecisionSchema, listDecisionsQuerySchema, validationError } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { decisionService, ServiceError } from '@/app/services';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const cursorParam = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');
    const parsed = listDecisionsQuerySchema.safeParse({
      cursor: cursorParam && cursorParam.length > 0 ? cursorParam : undefined,
      limit: limitParam ?? undefined,
    });
    if (!parsed.success) return validationError(parsed.error);

    const { decisions, nextCursor } = await decisionService.listDecisions(userId, parsed.data);
    const stats = await decisionService.getDecisionsStats(userId);

    return NextResponse.json({ decisions, nextCursor, stats });
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_GET_DECISIONS", { userId }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });

  try {
    const body = await req.json();
    const parsed = createDecisionSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const newDecision = await decisionService.createDecision(userId, parsed.data);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(newDecision);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_POST_DECISION", { userId }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

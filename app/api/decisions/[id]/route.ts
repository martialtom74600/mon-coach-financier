import { NextResponse } from 'next/server';
import { invalidateProfileCache } from '@/app/lib/cacheTags';
import { auth } from '@clerk/nextjs/server';
import { updateDecisionSchema, validationError, validateId } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { decisionService, ServiceError } from '@/app/services';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const body = await req.json();
    const parsed = updateDecisionSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedDecision = await decisionService.updateDecision(userId, params.id, parsed.data);
    invalidateProfileCache(userId);
    return NextResponse.json(updatedDecision);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_PATCH_DECISION", { userId, decisionId: params.id }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const result = await decisionService.deleteDecision(userId, params.id);
    invalidateProfileCache(userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_DELETE_DECISION", { userId, decisionId: params.id }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { updateDecisionSchema, validationError, validateId } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { decisionService, ServiceError } from '@/app/services';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const body = await req.json();
    const parsed = updateDecisionSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedDecision = await decisionService.updateDecision(userId, params.id, parsed.data);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(updatedDecision);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_PATCH_DECISION", { userId, decisionId: params.id }, error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const result = await decisionService.deleteDecision(userId, params.id);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_DELETE_DECISION", { userId, decisionId: params.id }, error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { updateGoalSchema, validationError, validateId } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { goalService, ServiceError } from '@/app/services';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const body = await req.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedGoal = await goalService.updateGoal(userId, params.id, parsed.data);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(updatedGoal);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_PATCH_GOAL", { userId, goalId: params.id }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const result = await goalService.deleteGoal(userId, params.id);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_DELETE_GOAL", { userId, goalId: params.id }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

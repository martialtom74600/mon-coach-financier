import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateGoalSchema, validationError } from '@/app/lib/validations';
import { goalService, ServiceError } from '@/app/services';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedGoal = await goalService.updateGoal(userId, params.id, parsed.data);
    return NextResponse.json(updatedGoal);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_PATCH_GOAL]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const result = await goalService.deleteGoal(userId, params.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_DELETE_GOAL]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

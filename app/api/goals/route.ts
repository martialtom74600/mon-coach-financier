import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createGoalSchema, validationError } from '@/app/lib/validations';
import { goalService, ServiceError } from '@/app/services';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const newGoal = await goalService.createGoal(userId, parsed.data);
    return NextResponse.json(newGoal);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_POST_GOAL]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createDecisionSchema, validationError } from '@/app/lib/validations';
import { decisionService, ServiceError } from '@/app/services';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

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
    console.error("[API_POST_DECISION]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

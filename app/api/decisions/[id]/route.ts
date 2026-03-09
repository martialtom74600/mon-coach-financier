import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateDecisionSchema, validationError } from '@/app/lib/validations';
import { decisionService, ServiceError } from '@/app/services';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateDecisionSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedDecision = await decisionService.updateDecision(userId, params.id, parsed.data);
    return NextResponse.json(updatedDecision);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_PATCH_DECISION]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const result = await decisionService.deleteDecision(userId, params.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_DELETE_DECISION]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createItemSchema, validationError } from '@/app/lib/validations';
import { itemService, ServiceError } from '@/app/services';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const newItem = await itemService.createItem(userId, parsed.data);
    return NextResponse.json(newItem);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_POST_ITEM]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

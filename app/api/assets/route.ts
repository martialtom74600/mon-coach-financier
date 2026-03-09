import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createAssetSchema, validationError } from '@/app/lib/validations';
import { assetService, ServiceError } from '@/app/services';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const parsed = createAssetSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const newAsset = await assetService.createAsset(userId, parsed.data);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(newAsset);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_POST_ASSET]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

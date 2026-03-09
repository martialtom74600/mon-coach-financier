import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateAssetSchema, validationError } from '@/app/lib/validations';
import { assetService, ServiceError } from '@/app/services';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateAssetSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedAsset = await assetService.updateAsset(userId, params.id, parsed.data);
    return NextResponse.json(updatedAsset);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_PATCH_ASSET]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const result = await assetService.deleteAsset(userId, params.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_DELETE_ASSET]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { updateAssetSchema, validationError, validateId } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { assetService, ServiceError } from '@/app/services';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const body = await req.json();
    const parsed = updateAssetSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedAsset = await assetService.updateAsset(userId, params.id, parsed.data);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(updatedAsset);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_PATCH_ASSET", { userId, assetId: params.id }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const result = await assetService.deleteAsset(userId, params.id);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_DELETE_ASSET", { userId, assetId: params.id }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

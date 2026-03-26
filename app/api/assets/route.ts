import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createAssetSchema, validationError } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { assetService, ServiceError } from '@/app/services';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });

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
    logger.error("API_POST_ASSET", { userId }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

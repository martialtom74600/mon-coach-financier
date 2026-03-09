import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateId } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { assetService, ServiceError } from '@/app/services';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Non autorisé', { status: 401 });
  const idError = validateId(params.id);
  if (idError) return idError;

  try {
    const history = await assetService.getAssetHistory(userId, params.id);
    return NextResponse.json(history);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error('API_GET_ASSET_HISTORY', { userId, assetId: params.id }, error);
    return new NextResponse('Erreur interne', { status: 500 });
  }
}

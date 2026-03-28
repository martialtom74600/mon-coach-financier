import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { preferencesService, ServiceError } from '@/app/services';
import {
  updatePreferencesSchema,
  validationError,
} from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { getOrCreateProfileId } from '@/app/lib/server/getOrCreateProfileId';

/** GET — Récupère les préférences du profil (crée User + profil si absent) */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Tu n\'as pas accès à ça.', { status: 401 });

  try {
    const profileId = await getOrCreateProfileId(userId);
    const prefs = await preferencesService.getPreferences(profileId);
    return NextResponse.json(prefs);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error('API_GET_PREFERENCES', { userId }, error);
    return new NextResponse('Oups, petit bug. Réessaie ?', { status: 500 });
  }
}

/** PATCH — Met à jour les préférences (merge partiel) */
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Tu n\'as pas accès à ça.', { status: 401 });

  try {
    const body = await req.json();
    const parsed = updatePreferencesSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const profileId = await getOrCreateProfileId(userId);
    const prefs = await preferencesService.updatePreferencesByProfileId(
      profileId,
      parsed.data
    );
    return NextResponse.json(prefs);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error('API_PATCH_PREFERENCES', { userId }, error);
    return new NextResponse('Oups, petit bug. Réessaie ?', { status: 500 });
  }
}

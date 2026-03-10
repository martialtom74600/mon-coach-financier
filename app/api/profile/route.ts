import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { updateProfileSchema, validationError } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { profileService, ServiceError } from '@/app/services';

export async function PATCH(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedProfile = await profileService.updateProfile(userId, parsed.data);
    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(updatedProfile);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_PATCH_PROFILE", { userId }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

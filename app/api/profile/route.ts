import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateProfileSchema, validationError } from '@/app/lib/validations';
import { profileService, ServiceError } from '@/app/services';

export async function PATCH(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updatedProfile = await profileService.updateProfile(userId, parsed.data);
    return NextResponse.json(updatedProfile);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_PATCH_PROFILE]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

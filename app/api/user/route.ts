import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth, currentUser } from '@clerk/nextjs/server';
import { saveUserSchema, validationError } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { userService, ServiceError } from '@/app/services';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });

  try {
    const profile = await userService.getCachedProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_GET_USER", { userId }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  const userAuth = await currentUser();

  if (!userId || !userAuth) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });

  try {
    const body = await req.json();
    const parsed = saveUserSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const email = userAuth.emailAddresses[0]?.emailAddress || `noemail+${userId}@placeholder.local`;
    const defaultFirstName = userAuth.firstName || "";

    const result = await userService.saveFullUserProfile(
      userId,
      email,
      defaultFirstName,
      parsed.data,
    );

    revalidateTag(`profile-${userId}`);
    revalidateTag('profile');
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_POST_USER", { userId }, error);
    return new NextResponse("Oups, la sauvegarde a planté. Tu réessaies ?", { status: 500 });
  }
}

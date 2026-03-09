import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { saveUserSchema, validationError } from '@/app/lib/validations';
import { userService, ServiceError } from '@/app/services';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const profile = await userService.getFullUserProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_GET_USER]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = auth();
  const userAuth = await currentUser();

  if (!userId || !userAuth) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const parsed = saveUserSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const email = userAuth.emailAddresses[0]?.emailAddress || "no-email";
    const defaultFirstName = userAuth.firstName || "";

    const result = await userService.saveFullUserProfile(
      userId,
      email,
      defaultFirstName,
      parsed.data,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[API_POST_USER]", error);
    return new NextResponse("Erreur interne lors de la sauvegarde", { status: 500 });
  }
}

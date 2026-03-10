import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { ServiceError } from '@/app/services';
import { logger } from '@/app/lib/logger';

/** DELETE — Suppression du compte (RGPD, droit à l'effacement) */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Tu n\'as pas accès à ça.', { status: 401 });

  try {
    const profile = await prisma.financialProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (profile) {
      await prisma.financialProfile.delete({ where: { id: profile.id } });
    }
    await prisma.user.deleteMany({ where: { id: userId } });

    try {
      await clerkClient.users.deleteUser(userId);
    } catch (clerkErr) {
      logger.warn('CLERK_DELETE_USER_FAILED', { userId, error: String(clerkErr) });
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    logger.error('API_DELETE_ME', { userId }, error);
    return new NextResponse(
      JSON.stringify({ error: 'La suppression a coincé. Tu réessaies ?' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

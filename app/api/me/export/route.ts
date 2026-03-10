import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { preferencesService } from '@/app/services';
import { serializeDecimals } from '@/app/lib/definitions';
import { logger } from '@/app/lib/logger';

/** GET — Export RGPD : toutes les données du profil en JSON (ou minimal si pas de profil) */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Tu n\'as pas accès à ça.', { status: 401 });

  try {
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, createdAt: true },
      }),
      prisma.financialProfile.findUnique({
        where: { userId },
        include: {
          items: true,
          assets: true,
          goals: true,
          decisions: true,
          insights: { select: { id: true, type: true, message: true, createdAt: true } },
        },
      }),
    ]);

    if (!user) {
      return new NextResponse('Aucune donnée à exporter.', { status: 404 });
    }

    const prefs = profile ? await preferencesService.getPreferences(profile.id).catch(() => null) : null;

    const exportData = profile
      ? {
          exportedAt: new Date().toISOString(),
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            createdAt: user.createdAt.toISOString(),
          },
          profile: serializeDecimals({
            id: profile.id,
            age: profile.age,
            persona: profile.persona,
            housingStatus: profile.housingStatus,
            housingCost: profile.housingCost,
            housingPaymentDay: profile.housingPaymentDay,
            adults: profile.adults,
            children: profile.children,
            funBudget: profile.funBudget,
            updatedAt: profile.updatedAt.toISOString(),
          }),
          items: serializeDecimals(profile.items),
          assets: serializeDecimals(profile.assets),
          goals: serializeDecimals(profile.goals),
          decisions: serializeDecimals(profile.decisions),
          insights: profile.insights.map((i) => ({
            id: i.id,
            type: i.type,
            message: i.message,
            createdAt: i.createdAt.toISOString(),
          })),
          preferences: prefs,
        }
      : {
          exportedAt: new Date().toISOString(),
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            createdAt: user.createdAt.toISOString(),
          },
          profile: null,
          message: 'Ton profil n\'est pas encore complet.',
        };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    logger.error('API_GET_ME_EXPORT', { userId }, error);
    return new NextResponse('L\'export a coincé. Tu réessaies ?', { status: 500 });
  }
}

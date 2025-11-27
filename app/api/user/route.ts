import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';

// 🛑 FORCE-DYNAMIC : On interdit le cache pour avoir toujours la vérité
export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json(null);

    const financialData = (user.financialData as object) || {};
    
    return NextResponse.json({
      ...financialData,
      id: user.id,
      email: user.email,
      firstName: user.firstName,
    });
  } catch (error) {
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

    // 1. On isole les données financières pures
    const { 
      id, email, firstName, createdAt, updatedAt, 
      ...inputFinancialData 
    } = body;

    // 🛡️ SÉCURITÉ ABSOLUE (Le "Force 0" dont tu parlais)
    // On crée une copie pour modifier les valeurs sans toucher à l'original
    const safeFinancialData: any = { ...inputFinancialData };

    // SI le mode est "beginner" (Débutant) -> ON VIDE TOUT DE FORCE CÔTÉ SERVEUR
    // C'est ça qui va régler ton bug définitivement.
    if (safeFinancialData.mode === 'beginner') {
        console.log("🔒 Mode Débutant détecté : Nettoyage forcé des investissements.");
        safeFinancialData.investments = 0;
        safeFinancialData.investmentYield = 0;
        safeFinancialData.savingsContributions = []; // On force le tableau vide
    }

    // 2. On sauvegarde la version "nettoyée" (safeFinancialData)
    const updatedUser = await prisma.user.upsert({
      where: { id: userId },
      update: {
        firstName: firstName || undefined,
        financialData: safeFinancialData, // <--- C'est ici que ça part propre en base
        updatedAt: new Date(),
      },
      create: {
        id: userId,
        email: userAuth.emailAddresses[0]?.emailAddress || "no-email",
        firstName: firstName || userAuth.firstName || "",
        financialData: safeFinancialData,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[API_POST_USER]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}
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
    
    // Si pas d'utilisateur, on renvoie null proprement
    if (!user) return NextResponse.json(null);

    const financialData = (user.financialData as object) || {};
    
    // ✅ CORRECTION ICI : ON RENVOIE LES DATES SYSTÈME
    return NextResponse.json({
      ...financialData,
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      createdAt: user.createdAt, // <--- INDISPENSABLE pour l'historique visuel
      updatedAt: user.updatedAt, // <--- INDISPENSABLE pour le backup de l'ancre
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

    // 🛡️ SÉCURITÉ ABSOLUE
    const safeFinancialData: any = { ...inputFinancialData };

    // SI le mode est "beginner" (Débutant) -> ON VIDE TOUT DE FORCE
    if (safeFinancialData.mode === 'beginner') {
        // console.log("🔒 Mode Débutant détecté : Nettoyage forcé.");
        safeFinancialData.investments = 0;
        safeFinancialData.investmentYield = 0;
        safeFinancialData.savingsContributions = []; 
    }

    // 2. On sauvegarde
    const updatedUser = await prisma.user.upsert({
      where: { id: userId },
      update: {
        firstName: firstName || undefined,
        financialData: safeFinancialData,
        // Pas besoin de mettre à jour updatedAt manuellement, Prisma le fait seul grâce à @updatedAt
        // mais le laisser ne fait pas de mal.
        updatedAt: new Date(), 
      },
      create: {
        id: userId,
        email: userAuth.emailAddresses[0]?.emailAddress || "no-email",
        firstName: firstName || userAuth.firstName || "",
        financialData: safeFinancialData,
      },
    });

    // Ici updatedUser contient DÉJÀ createdAt/updatedAt par défaut car c'est l'objet Prisma complet
    return NextResponse.json(updatedUser);
    
  } catch (error) {
    console.error("[API_POST_USER]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}
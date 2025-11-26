import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
// ✅ CORRECTION : On utilise le chemin relatif (remonter de 2 dossiers)
// Cela évite l'erreur "Module not found"
import { prisma } from '@/app/lib/prisma';

// 1. RÉCUPÉRATION (GET)
export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Si l'utilisateur n'existe pas encore dans la BDD, on renvoie null
    if (!user) return NextResponse.json(null);

    // MAGIE HYBRIDE : On fusionne les colonnes SQL et le contenu JSON
    const financialData = (user.financialData as object) || {};
    
    return NextResponse.json({
      firstName: user.firstName,
      ...financialData,
    });
  } catch (error) {
    console.error("[API_GET_USER]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

// 2. SAUVEGARDE (POST)
export async function POST(req: Request) {
  const { userId } = auth();
  const userAuth = await currentUser(); 

  if (!userId || !userAuth) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  try {
    const body = await req.json();

    // On sépare le prénom (colonne SQL) du reste (JSON)
    const { firstName, ...financialData } = body;

    const updatedUser = await prisma.user.upsert({
      where: { id: userId },
      update: {
        firstName: firstName || undefined,
        financialData: financialData,
        updatedAt: new Date(),
      },
      create: {
        id: userId,
        email: userAuth.emailAddresses[0]?.emailAddress || "no-email",
        firstName: firstName || userAuth.firstName || "",
        financialData: financialData,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[API_POST_USER]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}
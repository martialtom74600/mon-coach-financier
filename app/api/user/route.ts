import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
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
    // Le frontend (hook) s'occupera d'afficher des données par défaut
    if (!user) return NextResponse.json(null);

    // MAGIE HYBRIDE : On fusionne les colonnes SQL (firstName) et le contenu JSON (financialData)
    // Pour ton application React, c'est transparent : elle reçoit un seul objet plat.
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
  const userAuth = await currentUser(); // On récupère l'objet Clerk complet pour l'email

  if (!userId || !userAuth) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  try {
    const body = await req.json();

    // On sépare le prénom (qui va dans sa colonne SQL) du reste (qui va dans le JSON)
    const { firstName, ...financialData } = body;

    // UPSERT est la commande parfaite ici :
    // - Si l'utilisateur existe -> on met à jour (Update)
    // - Si l'utilisateur n'existe pas -> on le crée (Create)
    const updatedUser = await prisma.user.upsert({
      where: { id: userId },
      update: {
        firstName: firstName || undefined, // Ne met à jour que si une valeur est fournie
        financialData: financialData, // On sauvegarde tout le reste des données financières en JSON
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
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';

export async function PATCH(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  const body = await req.json();

  try {
    const updatedProfile = await prisma.financialProfile.update({
      where: { userId }, // Prisma trouve le profil via l'ID unique du User
      data: {
        age: body.age,
        persona: body.persona,
        housingStatus: body.housingStatus,
        housingCost: parseFloat(body.housingCost || 0),
        housingPaymentDay: parseInt(body.housingPaymentDay || 5),
        adults: parseInt(body.adults || 1),
        children: parseInt(body.children || 0),
        funBudget: parseFloat(body.funBudget || 0),
      },
    });
    return NextResponse.json(updatedProfile);
  } catch (error) {
    return new NextResponse("Erreur lors de la mise à jour du profil", { status: 500 });
  }
}
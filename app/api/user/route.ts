import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            items: true,      // Revenus et dépenses
            assets: true,     // Patrimoine
            goals: true,      // Objectifs
            decisions: {      // Achats
               orderBy: { date: 'desc' },
               take: 50 
            }, 
          }
        }
      }
    });

    if (!user || !user.profile) return NextResponse.json(null);

    const p = user.profile;

    // Organisation des items par catégorie pour le front
    const itemsMap = p.items.reduce((acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof p.items>);

    return NextResponse.json({
      // Infos User
      id: user.id,
      email: user.email,
      firstName: user.firstName,

      // Infos Profil
      age: p.age,
      persona: p.persona,
      household: { adults: p.adults, children: p.children },
      funBudget: p.funBudget,
      housing: {
        status: p.housingStatus,
        monthlyCost: p.housingCost,
        paymentDay: p.housingPaymentDay,
      },

      // Listes catégorisées
      incomes: itemsMap['INCOME'] || [],
      fixedCosts: itemsMap['FIXED_COST'] || [],
      variableCosts: itemsMap['VARIABLE_COST'] || [],
      credits: itemsMap['CREDIT'] || [],
      subscriptions: itemsMap['SUBSCRIPTION'] || [],
      annualExpenses: itemsMap['ANNUAL_EXPENSE'] || [],

      // Patrimoine & Objectifs (Brut, le front fera le tri)
      assets: p.assets,
      goals: p.goals,
      decisions: p.decisions
    });

  } catch (error) {
    console.error("[API_GET_USER]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}
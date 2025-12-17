import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { ItemCategory, AssetType, GoalCategory } from '@prisma/client';

// 🛑 FORCE-DYNAMIC : Pas de cache, données temps réel
export const dynamic = 'force-dynamic';

// ============================================================================
// GET : LECTURE (Reconstitution du Profil pour le Frontend)
// ============================================================================
export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    // 1. On récupère le User ET son Profil Financier avec TOUTES les relations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            items: true,      // Flux
            assets: true,     // Patrimoine
            goals: true,      // Objectifs
            // ✅ OPTIMISATION : On ne charge que les 50 dernières décisions pour la performance
            decisions: {
                orderBy: { date: 'desc' },
                take: 50 
            }, 
          }
        }
      }
    });

    // Si pas d'utilisateur ou pas de profil encore créé
    if (!user) return NextResponse.json(null);
    if (!user.profile) {
        return NextResponse.json({
            firstName: user.firstName,
            email: user.email,
            // Listes vides par défaut
            incomes: [], fixedCosts: [], variableCosts: [],
            credits: [], subscriptions: [], annualExpenses: [],
            investments: [], savingsContributions: [], 
            goals: [], 
            decisions: [] 
        });
    }

    const p = user.profile;

    // 2. On trie les ITEMS par catégorie
    const itemsMap = p.items.reduce((acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof p.items>);

    // 3. On construit l'objet de réponse final
    const formattedProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      
      // Champs racines du profil
      age: p.age,
      persona: p.persona,
      household: { adults: p.adults, children: p.children },
      funBudget: p.funBudget,

      // Logement
      housing: {
        status: p.housingStatus,
        monthlyCost: p.housingCost,
        paymentDay: p.housingPaymentDay,
      },

      // Listes Items
      incomes: itemsMap['INCOME'] || [],
      fixedCosts: itemsMap['FIXED_COST'] || [],
      variableCosts: itemsMap['VARIABLE_COST'] || [],
      credits: itemsMap['CREDIT'] || [],
      subscriptions: itemsMap['SUBSCRIPTION'] || [],
      annualExpenses: itemsMap['ANNUAL_EXPENSE'] || [],

      // Patrimoine (Assets) -> Investments + Savings
      investments: p.assets.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          amount: a.currentValue,
          currentValue: a.currentValue
      })),
      
      savingsContributions: p.assets
        .filter(a => a.monthlyFlow > 0)
        .map(a => ({
            id: a.id,
            name: a.name,
            amount: a.monthlyFlow,
            dayOfMonth: a.transferDay
        })),

      // Mapping des Objectifs
      goals: p.goals.map(g => ({
        id: g.id,
        name: g.name,
        category: g.category,
        targetAmount: g.targetAmount,
        currentSaved: g.currentSaved,
        monthlyContribution: g.monthlyContribution,
        deadline: g.deadline,
        projectedYield: g.projectedYield,
        transferDay: g.transferDay
      })),

      // Mapping de l'historique des décisions
      decisions: p.decisions.map(d => ({
        id: d.id,
        name: d.name,
        amount: d.amount,
        date: d.date,
        type: d.type,
        paymentMode: d.paymentMode,
        isReimbursable: d.isReimbursable,
        isPro: d.isPro,
        duration: d.duration,
        rate: d.rate
      })),

      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json(formattedProfile);

  } catch (error) {
    console.error("[API_GET_USER]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

// ============================================================================
// POST : SAUVEGARDE (Transaction SQL - Profil Global)
// ============================================================================
export async function POST(req: Request) {
  const { userId } = auth();
  const userAuth = await currentUser(); 

  if (!userId || !userAuth) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    // On récupère les champs. Si un champ est absent, il sera undefined.
    const { firstName, profile, items, assets, goals } = body;

    const result = await prisma.$transaction(async (tx) => {
        
        // 1. User & Profil (Toujours mis à jour car présents ou partiels)
        const user = await tx.user.upsert({
            where: { id: userId },
            update: { firstName: firstName || undefined },
            create: {
                id: userId,
                email: userAuth.emailAddresses[0]?.emailAddress || "no-email",
                firstName: firstName || userAuth.firstName || "",
            }
        });

        const financialProfile = await tx.financialProfile.upsert({
            where: { userId: user.id },
            update: { 
                age: profile?.age,
                persona: profile?.persona,
                housingStatus: profile?.housingStatus,
                housingCost: profile?.housingCost,
                housingPaymentDay: profile?.housingPaymentDay,
                adults: profile?.adults,
                children: profile?.children,
                funBudget: profile?.funBudget,
            }, 
            create: {
                userId: user.id,
                age: profile?.age,
                persona: profile?.persona,
                housingStatus: profile?.housingStatus,
                housingCost: profile?.housingCost,
                housingPaymentDay: profile?.housingPaymentDay,
                adults: profile?.adults,
                children: profile?.children,
                funBudget: profile?.funBudget,
            }
        });

        // 🛡️ SÉCURITÉ : On ne touche aux listes QUE si elles sont fournies (tableau)
        
        // 2. GESTION DES ITEMS
        if (Array.isArray(items)) {
            await tx.financialItem.deleteMany({ where: { profileId: financialProfile.id } });
            if (items.length > 0) {
                await tx.financialItem.createMany({
                    data: items.map((item: any) => ({
                        profileId: financialProfile.id,
                        name: item.name,
                        amount: item.amount,
                        category: item.category as ItemCategory,
                        frequency: item.frequency,
                        dayOfMonth: item.dayOfMonth
                    }))
                });
            }
        }

        // 3. GESTION DES ASSETS
        if (Array.isArray(assets)) {
            await tx.asset.deleteMany({ where: { profileId: financialProfile.id } });
            if (assets.length > 0) {
                await tx.asset.createMany({
                    data: assets.map((asset: any) => ({
                        profileId: financialProfile.id,
                        name: asset.name,
                        type: asset.type as AssetType,
                        currentValue: asset.currentValue,
                        monthlyFlow: asset.monthlyFlow,
                        transferDay: asset.transferDay
                    }))
                });
            }
        }

        // 4. GESTION DES GOALS
        if (Array.isArray(goals)) {
            await tx.financialGoal.deleteMany({ where: { profileId: financialProfile.id } });
            if (goals.length > 0) {
                await tx.financialGoal.createMany({
                    data: goals.map((goal: any) => ({
                        profileId: financialProfile.id,
                        name: goal.name,
                        category: goal.category as GoalCategory,
                        targetAmount: goal.targetAmount,
                        currentSaved: goal.currentSaved,
                        monthlyContribution: goal.monthlyContribution,
                        deadline: new Date(goal.deadline),
                        projectedYield: goal.projectedYield,
                        transferDay: goal.transferDay
                    }))
                });
            }
        }

        return financialProfile;
    });

    return NextResponse.json({ success: true, profileId: result.id });
    
  } catch (error) {
    console.error("[API_POST_USER]", error);
    return new NextResponse("Erreur interne lors de la sauvegarde", { status: 500 });
  }
}
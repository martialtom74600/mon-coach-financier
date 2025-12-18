import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { 
  ItemCategory, 
  AssetType, 
  GoalCategory, 
  Frequency, 
  UserPersona,
  HousingStatus
} from '@prisma/client';

export const dynamic = 'force-dynamic';

// ============================================================================
// 1. GET (Lecture du Dashboard)
// ============================================================================
export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            items: true,
            assets: true,
            goals: true,
            decisions: { orderBy: { date: 'desc' }, take: 50 }, 
          }
        }
      }
    });

    if (!user) return NextResponse.json(null);
    
    // Si l'utilisateur existe mais pas le profil, on renvoie une coquille vide
    if (!user.profile) {
        return NextResponse.json({
            firstName: user.firstName,
            email: user.email,
            incomes: [], fixedCosts: [], variableCosts: [],
            credits: [], subscriptions: [], annualExpenses: [],
            investments: [], savingsContributions: [], 
            goals: [], decisions: [] 
        });
    }

    const p = user.profile;

    // Organisation des items pour le front
    const itemsMap = p.items.reduce((acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof p.items>);

    // Construction de l'objet "Profil Application"
    const formattedProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      
      age: p.age,
      persona: p.persona,
      household: { adults: p.adults, children: p.children },
      funBudget: p.funBudget,

      housing: {
        status: p.housingStatus,
        monthlyCost: p.housingCost,
        paymentDay: p.housingPaymentDay,
      },

      incomes: itemsMap['INCOME'] || [],
      fixedCosts: itemsMap['FIXED_COST'] || [],
      variableCosts: itemsMap['VARIABLE_COST'] || [],
      credits: itemsMap['CREDIT'] || [],
      subscriptions: itemsMap['SUBSCRIPTION'] || [],
      annualExpenses: itemsMap['ANNUAL_EXPENSE'] || [],

      // Assets bruts + helpers
      assets: p.assets,
      investments: p.assets.filter(a => a.type !== 'CC'),
      savingsContributions: p.assets.filter(a => a.monthlyFlow > 0),

      goals: p.goals,
      decisions: p.decisions,

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
// 2. POST (Sauvegarde Globale / Wizard)
// ============================================================================
// C'EST CETTE FONCTION QUI MANQUE OU QUI N'EST PAS DÉTECTÉE
export async function POST(req: Request) {
  const { userId } = auth();
  const userAuth = await currentUser(); 

  if (!userId || !userAuth) return new NextResponse("Non autorisé", { status: 401 });

  try {
    const body = await req.json();
    const { firstName, profile, items, assets, goals } = body;

    // On utilise une transaction pour que tout soit sauvegardé ou rien du tout
    const result = await prisma.$transaction(async (tx) => {
        
        // A. User & Profil
        const user = await tx.user.upsert({
            where: { id: userId },
            update: { firstName: firstName || undefined },
            create: { id: userId, email: userAuth.emailAddresses[0]?.emailAddress || "no-email", firstName: firstName || userAuth.firstName || "" }
        });

        const financialProfile = await tx.financialProfile.upsert({
            where: { userId: user.id },
            update: { 
                age: profile?.age,
                persona: profile?.persona as UserPersona,
                housingStatus: profile?.housingStatus as HousingStatus,
                housingCost: parseFloat(profile?.housingCost || 0),
                housingPaymentDay: parseInt(profile?.housingPaymentDay || 1),
                adults: parseInt(profile?.adults || 1),
                children: parseInt(profile?.children || 0),
                funBudget: parseFloat(profile?.funBudget || 0),
            }, 
            create: {
                userId: user.id,
                age: profile?.age,
                persona: profile?.persona as UserPersona,
                housingStatus: profile?.housingStatus as HousingStatus,
                housingCost: parseFloat(profile?.housingCost || 0),
                housingPaymentDay: parseInt(profile?.housingPaymentDay || 1),
                adults: parseInt(profile?.adults || 1),
                children: parseInt(profile?.children || 0),
                funBudget: parseFloat(profile?.funBudget || 0),
            }
        });

        // B. ITEMS (Flush & Replace)
        if (Array.isArray(items)) {
            await tx.financialItem.deleteMany({ where: { profileId: financialProfile.id } });
            if (items.length > 0) {
                await tx.financialItem.createMany({
                    data: items.map((item: any) => ({
                        profileId: financialProfile.id,
                        name: item.name,
                        amount: parseFloat(item.amount),
                        category: item.category as ItemCategory,
                        frequency: item.frequency as Frequency || Frequency.MONTHLY,
                        dayOfMonth: item.dayOfMonth ? parseInt(item.dayOfMonth) : null
                    }))
                });
            }
        }

        // C. ASSETS
        if (Array.isArray(assets)) {
            await tx.asset.deleteMany({ where: { profileId: financialProfile.id } });
            if (assets.length > 0) {
                await tx.asset.createMany({
                    data: assets.map((asset: any) => ({
                        profileId: financialProfile.id,
                        name: asset.name,
                        type: asset.type as AssetType,
                        currentValue: parseFloat(asset.currentValue || 0),
                        monthlyFlow: parseFloat(asset.monthlyFlow || 0),
                        transferDay: parseInt(asset.transferDay || 1)
                    }))
                });
            }
        }

        // D. GOALS
        if (Array.isArray(goals)) {
            await tx.financialGoal.deleteMany({ where: { profileId: financialProfile.id } });
            if (goals.length > 0) {
                await tx.financialGoal.createMany({
                    data: goals.map((goal: any) => ({
                        profileId: financialProfile.id,
                        name: goal.name,
                        category: goal.category as GoalCategory,
                        targetAmount: parseFloat(goal.targetAmount),
                        currentSaved: parseFloat(goal.currentSaved || 0),
                        monthlyContribution: parseFloat(goal.monthlyContribution || 0),
                        deadline: new Date(goal.deadline),
                        projectedYield: parseFloat(goal.projectedYield || 0),
                        transferDay: goal.transferDay ? parseInt(goal.transferDay) : null
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
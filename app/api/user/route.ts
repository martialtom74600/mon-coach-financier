import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { ItemCategory, AssetType } from '@prisma/client';

// 🛑 FORCE-DYNAMIC : Pas de cache, données temps réel
export const dynamic = 'force-dynamic';

// ============================================================================
// GET : LECTURE (Reconstitution du Profil pour le Frontend)
// ============================================================================
export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    // 1. On récupère le User ET son Profil Financier avec les relations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            items: true,  // On charge tous les flux
            assets: true, // On charge tout le patrimoine
          }
        }
      }
    });

    // Si pas d'utilisateur ou pas de profil encore créé
    if (!user) return NextResponse.json(null);
    if (!user.profile) {
        // On renvoie un objet minimal pour que le frontend ne plante pas
        return NextResponse.json({
            firstName: user.firstName,
            email: user.email,
            // Le reste sera vide, le formulaire s'initialisera avec les valeurs par défaut
        });
    }

    const p = user.profile;

    // 2. On trie les ITEMS par catégorie pour reconstituer les tableaux du Frontend
    const incomes = p.items.filter(i => i.category === 'INCOME');
    const fixedCosts = p.items.filter(i => i.category === 'FIXED_COST');
    const variableCosts = p.items.filter(i => i.category === 'VARIABLE_COST');
    const credits = p.items.filter(i => i.category === 'CREDIT');
    const subscriptions = p.items.filter(i => i.category === 'SUBSCRIPTION');
    const annualExpenses = p.items.filter(i => i.category === 'ANNUAL_EXPENSE');

    // 3. On construit l'objet de réponse final (Structure "Profile" attendue par le hook)
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
        paymentDay: p.housingPaymentDay, // ✅ Le fameux champ corrigé
      },

      // Listes
      incomes,
      fixedCosts,
      variableCosts,
      credits,
      subscriptions,
      annualExpenses,

      // Patrimoine (Assets)
      // Note: Le frontend attend 'investments' et 'savingsContributions', 
      // mais le mapper 'mapProfileToForm' sait lire 'items' et 'assets' si on adapte.
      // Pour l'instant, on renvoie les assets tels quels, le frontend (mapProfileToForm) 
      // devra peut-être être légèrement ajusté si ce n'est pas déjà fait, 
      // MAIS dans ta version actuelle, le mapper itère sur 'profile.investments'.
      // Pour compatibilité immédiate, on mappe 'assets' vers 'investments' :
      investments: p.assets.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          amount: a.currentValue, // Stock
          currentValue: a.currentValue
      })),
      
      // On reconstitue les flux d'épargne depuis les assets pour le frontend
      savingsContributions: p.assets
        .filter(a => a.monthlyFlow > 0)
        .map(a => ({
            id: a.id,
            name: a.name,
            amount: a.monthlyFlow,
            dayOfMonth: a.transferDay
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
// POST : SAUVEGARDE (Transaction SQL)
// ============================================================================
export async function POST(req: Request) {
  const { userId } = auth();
  const userAuth = await currentUser(); 

  if (!userId || !userAuth) return new NextResponse("Non autorisé", { status: 401 });

  try {
    // 1. On reçoit le Payload propre préparé par mapFormToPayload
    const body = await req.json();
    const { firstName, profile, items, assets } = body;

    // 2. TRANSACTION PRISMA : Tout ou rien
    // Cela garantit que si une étape échoue, on ne corrompt pas la base.
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Mise à jour ou Création du User
        const user = await tx.user.upsert({
            where: { id: userId },
            update: { firstName: firstName || undefined },
            create: {
                id: userId,
                email: userAuth.emailAddresses[0]?.emailAddress || "no-email",
                firstName: firstName || userAuth.firstName || "",
            }
        });

        // B. Upsert du Profil Financier (Champs simples)
        const financialProfile = await tx.financialProfile.upsert({
            where: { userId: user.id },
            update: {
                age: profile.age,
                persona: profile.persona,
                housingStatus: profile.housingStatus,
                housingCost: profile.housingCost,
                housingPaymentDay: profile.housingPaymentDay,
                adults: profile.adults,
                children: profile.children,
                funBudget: profile.funBudget,
            },
            create: {
                userId: user.id,
                age: profile.age,
                persona: profile.persona,
                housingStatus: profile.housingStatus,
                housingCost: profile.housingCost,
                housingPaymentDay: profile.housingPaymentDay,
                adults: profile.adults,
                children: profile.children,
                funBudget: profile.funBudget,
            }
        });

        // C. GESTION DES LISTES (ITEMS) : Stratégie "Delete & Recreate"
        // C'est le plus simple pour gérer les ajouts/suppressions sans logique complexe de diff.
        await tx.financialItem.deleteMany({ where: { profileId: financialProfile.id } });
        
        if (items && items.length > 0) {
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

        // D. GESTION DU PATRIMOINE (ASSETS) : Stratégie "Delete & Recreate"
        await tx.asset.deleteMany({ where: { profileId: financialProfile.id } });

        if (assets && assets.length > 0) {
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

        return financialProfile;
    });

    return NextResponse.json({ success: true, profileId: result.id });
    
  } catch (error) {
    console.error("[API_POST_USER]", error);
    return new NextResponse("Erreur interne lors de la sauvegarde", { status: 500 });
  }
}
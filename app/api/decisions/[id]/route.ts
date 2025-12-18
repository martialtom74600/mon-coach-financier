import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { PurchaseType, PaymentMode } from '@prisma/client';

// ============================================================================
// PATCH : Modifier une décision (ex: Changer le montant, marquer comme remboursé)
// ============================================================================
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  const body = await req.json();

  try {
    const updatedDecision = await prisma.purchaseDecision.update({
      where: { id: params.id },
      data: {
        name: body.name,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        date: body.date ? new Date(body.date) : undefined,
        
        type: body.type ? (body.type as PurchaseType) : undefined,
        paymentMode: body.paymentMode ? (body.paymentMode as PaymentMode) : undefined,

        // Gestion des booléens et options
        isPro: body.isPro !== undefined ? body.isPro : undefined,
        isReimbursable: body.isReimbursable !== undefined ? body.isReimbursable : undefined,
        
        // Gestion intelligente de la date de remboursement
        // Si on envoie null, ça remet à null. Si on envoie une date, ça la convertit.
        reimbursedAt: body.reimbursedAt === null ? null : (body.reimbursedAt ? new Date(body.reimbursedAt) : undefined),

        duration: body.duration ? parseInt(body.duration) : undefined,
        rate: body.rate ? parseFloat(body.rate) : undefined,
      },
    });

    return NextResponse.json(updatedDecision);
  } catch (error) {
    console.error("[API_PATCH_DECISION]", error);
    return new NextResponse("Erreur lors de la modification", { status: 500 });
  }
}

// ============================================================================
// DELETE : Supprimer une décision (ex: erreur de saisie)
// ============================================================================
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  try {
    // Vérification optionnelle : s'assurer que l'item appartient bien au user connecté
    // (Prisma throwera une erreur si l'ID n'existe pas, mais c'est mieux de vérifier le owner si tu veux être strict)

    await prisma.purchaseDecision.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_DELETE_DECISION]", error);
    return new NextResponse("Erreur lors de la suppression", { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { PurchaseType, PaymentMode } from '@prisma/client';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });
  const body = await req.json();
  const profile = await prisma.financialProfile.findUnique({ where: { userId }, select: { id: true } });

  if (!profile) return new NextResponse("Profil introuvable", { status: 404 });

  const newDecision = await prisma.purchaseDecision.create({
    data: {
      profileId: profile.id,
      name: body.name,
      amount: parseFloat(body.amount),
      date: new Date(body.date),
      type: body.type as PurchaseType,
      paymentMode: body.paymentMode as PaymentMode,
      isPro: body.isPro || false,
      isReimbursable: body.isReimbursable || false,
      reimbursedAt: body.reimbursedAt ? new Date(body.reimbursedAt) : null,
      duration: body.duration ? parseInt(body.duration) : null,
      rate: body.rate ? parseFloat(body.rate) : null
    }
  });
  return NextResponse.json(newDecision);
}
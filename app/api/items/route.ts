import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { ItemCategory, Frequency } from '@prisma/client';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  const body = await req.json();

  // On récupère d'abord l'ID du profil financier
  const profile = await prisma.financialProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return new NextResponse("Profil introuvable", { status: 404 });

  const newItem = await prisma.financialItem.create({
    data: {
      profileId: profile.id,
      name: body.name,
      amount: parseFloat(body.amount),
      category: body.category as ItemCategory,
      frequency: body.frequency as Frequency || Frequency.MONTHLY, // Default important
      dayOfMonth: body.dayOfMonth ? parseInt(body.dayOfMonth) : 1
    }
  });

  return NextResponse.json(newItem);
}
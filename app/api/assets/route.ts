import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { AssetType } from '@prisma/client';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  const body = await req.json();
  const profile = await prisma.financialProfile.findUnique({ where: { userId }, select: { id: true } });

  if (!profile) return new NextResponse("Profil introuvable", { status: 404 });

  // Création de l'asset
  const newAsset = await prisma.asset.create({
    data: {
      profileId: profile.id,
      name: body.name,
      type: body.type as AssetType,
      currentValue: parseFloat(body.currentValue),
      monthlyFlow: parseFloat(body.monthlyFlow || 0),
      transferDay: parseInt(body.transferDay || 1),
      // On crée tout de suite un point d'historique initial
      history: {
        create: { value: parseFloat(body.currentValue) }
      }
    }
  });

  return NextResponse.json(newAsset);
}
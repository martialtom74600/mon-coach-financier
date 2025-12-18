import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });
  const body = await req.json();

  // Mise à jour de l'Asset
  const updatedAsset = await prisma.asset.update({
    where: { id: params.id },
    data: {
      name: body.name,
      currentValue: parseFloat(body.currentValue),
      monthlyFlow: parseFloat(body.monthlyFlow),
      transferDay: parseInt(body.transferDay)
    }
  });

  // ✅ MAGIE : Si la valeur a changé, on ajoute un point dans l'historique
  // Cela permettra de tracer les graphiques d'évolution
  if (body.currentValue !== undefined) {
      await prisma.assetHistory.create({
          data: {
              assetId: params.id,
              value: parseFloat(body.currentValue)
          }
      });
  }

  return NextResponse.json(updatedAsset);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const { userId } = auth();
    if (!userId) return new NextResponse("Non autorisé", { status: 401 });
  
    await prisma.asset.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';

// PATCH: Modifier un item existant
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });
  
  const body = await req.json();

  const updatedItem = await prisma.financialItem.update({
    where: { id: params.id },
    data: {
        name: body.name,
        amount: body.amount,
        frequency: body.frequency,
        dayOfMonth: body.dayOfMonth
    }
  });
  return NextResponse.json(updatedItem);
}

// DELETE: Supprimer un item
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  await prisma.financialItem.delete({
    where: { id: params.id }
  });
  return NextResponse.json({ success: true });
}
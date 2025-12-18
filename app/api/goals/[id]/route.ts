import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });
  const body = await req.json();

  const updatedGoal = await prisma.financialGoal.update({
    where: { id: params.id },
    data: {
        name: body.name,
        targetAmount: body.targetAmount,
        currentSaved: body.currentSaved,
        monthlyContribution: body.monthlyContribution,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
    }
  });
  return NextResponse.json(updatedGoal);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const { userId } = auth();
    if (!userId) return new NextResponse("Non autorisé", { status: 401 });
    await prisma.financialGoal.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
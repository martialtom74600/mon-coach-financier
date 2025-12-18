import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { GoalCategory } from '@prisma/client';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });
  const body = await req.json();
  const profile = await prisma.financialProfile.findUnique({ where: { userId }, select: { id: true } });

  if (!profile) return new NextResponse("Profil introuvable", { status: 404 });

  const newGoal = await prisma.financialGoal.create({
    data: {
      profileId: profile.id,
      name: body.name,
      category: body.category as GoalCategory,
      targetAmount: parseFloat(body.targetAmount),
      currentSaved: parseFloat(body.currentSaved || 0),
      monthlyContribution: parseFloat(body.monthlyContribution || 0),
      deadline: new Date(body.deadline), // Format ISO attendu depuis le front
      projectedYield: parseFloat(body.projectedYield || 0)
    }
  });
  return NextResponse.json(newGoal);
}
import { prisma } from '@/app/lib/prisma';
import { getProfileId } from './profileService';
import { ServiceError } from './errors';
import type { BudgetResult, OptimizationOpportunity } from '@/app/lib/definitions';
import { sendPushForInsight } from './notificationService';

const DEFAULT_LIMIT = 10;
const RETENTION_DAYS = 30;
/** 7 jours par défaut. Pour tester : NEXT_PUBLIC_INSIGHT_SNOOZE_SECONDS=10 dans .env.local */
const SNOOZE_SECONDS = (() => {
  const val = process.env.NEXT_PUBLIC_INSIGHT_SNOOZE_SECONDS;
  if (!val) return 7 * 24 * 60 * 60;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : 7 * 24 * 60 * 60;
})();

/** Début de la journée en UTC */
function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Convertit les opportunities (engine) en format stockable */
function opportunitiesToStorable(
  opps: OptimizationOpportunity[]
): Array<{ id: string; type: string; severity: string; message: string; metadata?: object }> {
  return opps.map((o) => ({
    id: o.id,
    type: o.type,
    severity: o.level.toLowerCase(),
    message: o.title ? `${o.title} — ${o.message}` : o.message,
    metadata: o.guide ? { guide: o.guide } : undefined,
  }));
}

/** Stocke les insights (opportunities unifiées) en évitant les doublons (même insightId le même jour) */
export async function storeInsights(
  profileId: string,
  opportunities: OptimizationOpportunity[]
): Promise<number> {
  const insights = opportunitiesToStorable(opportunities);
  if (insights.length === 0) return 0;

  const today = startOfToday();
  const existing = await prisma.insight.findMany({
    where: {
      profileId,
      createdAt: { gte: today },
    },
    select: { insightId: true },
  });
  const existingIds = new Set(existing.map((e) => e.insightId));

  const toCreate = insights.filter((i) => !existingIds.has(i.id));
  if (toCreate.length === 0) return 0;

  await prisma.insight.createMany({
    data: toCreate.map((i) => ({
      profileId,
      insightId: i.id,
      type: i.type,
      severity: i.severity,
      message: i.message,
      metadata: i.metadata ?? undefined,
    })),
  });

  // I.3 — Push notifications PWA : une notification pour le premier insight (priorité)
  const first = toCreate[0];
  if (first) {
    await sendPushForInsight(profileId, {
      title: 'Mon Coach Financier',
      body: first.message,
      url: '/',
      insightId: first.id,
    }).catch(() => {}); // Ne pas bloquer si push échoue
  }

  return toCreate.length;
}

/**
 * Persiste un résultat d’analyse dashboard déjà calculé (ex. tâche différée après le rendu RSC).
 * Évite tout second passage `computeFinancialPlan` / `analyzeProfileHealth`.
 */
export async function persistDashboardInsightAnalysis(
  userId: string,
  profileId: string | null,
  opportunities: OptimizationOpportunity[],
  budget: BudgetResult,
): Promise<void> {
  let pid = profileId;
  if (!pid) {
    pid = await getProfileId(userId);
  }
  await storeInsights(pid, opportunities);
  await updateLastBudgetSnapshot(pid, budget);
}

/** Liste les insights non lus (ou tous récents) pour un profil */
export async function listInsights(
  profileId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
) {
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, 50);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  let insights = await prisma.insight.findMany({
    where: {
      profileId,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    take: limit * 2,
  });

  // Exclure les insights snoozés (réapparaissent après snoozeUntil)
  const now = new Date();
  insights = insights.filter(
    (i) => i.snoozeUntil === null || i.snoozeUntil < now
  );
  insights = insights.slice(0, limit);

  return insights.map((i) => ({
    id: i.id,
    insightId: i.insightId,
    type: i.type,
    severity: i.severity,
    message: i.message,
    metadata: i.metadata as Record<string, unknown> | null,
    createdAt: i.createdAt.toISOString(),
    readAt: i.readAt?.toISOString() ?? null,
    snoozeUntil: i.snoozeUntil?.toISOString() ?? null,
  }));
}

/** Retourne les insightIds actuellement snoozés (pour exclure du fallback opportunities) */
export async function getSnoozedInsightIds(profileId: string): Promise<Set<string>> {
  const now = new Date();
  const rows = await prisma.insight.findMany({
    where: {
      profileId,
      snoozeUntil: { gt: now },
    },
    select: { insightId: true },
  });
  return new Set(rows.map((r) => r.insightId));
}

/** Snooze un insight pendant 7 jours (réapparaît si toujours pertinent) */
export async function markInsightAsRead(
  userId: string,
  idOrInsightId: string
): Promise<void> {
  const profileId = await getProfileId(userId);
  const snoozeUntil = new Date();
  snoozeUntil.setSeconds(snoozeUntil.getSeconds() + SNOOZE_SECONDS);

  const insight = await prisma.insight.findFirst({
    where: {
      profileId,
      OR: [{ id: idOrInsightId }, { insightId: idOrInsightId }],
    },
  });

  if (insight) {
    await prisma.insight.update({
      where: { id: insight.id },
      data: { snoozeUntil },
    });
    return;
  }

  await prisma.insight.create({
    data: {
      profileId,
      insightId: idOrInsightId,
      type: 'SNOOZED',
      severity: 'info',
      message: 'Masqué par l\'utilisateur',
      snoozeUntil,
    },
  });
}

/** Récupère le dernier snapshot budget pour un profil */
export async function getLastBudgetSnapshot(
  profileId: string
): Promise<BudgetResult | null> {
  const profile = await prisma.financialProfile.findUnique({
    where: { id: profileId },
    select: { lastBudgetSnapshot: true },
  });
  if (!profile?.lastBudgetSnapshot) return null;
  return profile.lastBudgetSnapshot as unknown as BudgetResult;
}

/** Met à jour le snapshot budget (pour detectDrift au prochain chargement) */
export async function updateLastBudgetSnapshot(
  profileId: string,
  budget: BudgetResult
): Promise<void> {
  await prisma.financialProfile.update({
    where: { id: profileId },
    data: { lastBudgetSnapshot: budget as unknown as object },
  });
}

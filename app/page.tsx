import { revalidateTag } from 'next/cache';
import { auth, currentUser } from '@clerk/nextjs/server';
import { userService, insightService, profileService } from '@/app/services';
import { computeFinancialPlan, analyzeProfileHealth } from '@/app/lib/logic';
import DashboardClient from '@/app/components/DashboardClient';
import type { StoredInsight } from '@/app/components/dashboard/ProactiveInsightsCard';

export default async function Home() {
  const { userId } = await auth();
  // La redirection / → /sign-in se fait dans le middleware (évite le flash)

  const [profileRaw, user] = await Promise.all([
    userService.getCachedProfile(userId),
    currentUser(),
  ]);

  const profile = userService.buildProfileForClient(profileRaw);

  // profileId peut manquer si le cache est ancien ; on le récupère à la volée
  let profileId = profile?.profileId ?? null;
  if (!profileId && profile) {
    try {
      profileId = await profileService.getProfileId(userId);
    } catch {
      // Utilisateur sans FinancialProfile (wizard non terminé)
    }
  }

  let insights: StoredInsight[] = [];
  let analysis: Awaited<ReturnType<typeof analyzeProfileHealth>> | null = null;

  if (profile) {
    try {
      const { budget } = computeFinancialPlan(profile);
      const previousBudget = (profile.lastBudgetSnapshot ?? null) as Parameters<
        typeof analyzeProfileHealth
      >[3];
      analysis = analyzeProfileHealth(profile, budget, undefined, previousBudget);

      if (profileId) {
        await insightService.storeInsights(profileId, analysis.opportunities);
        await insightService.updateLastBudgetSnapshot(profileId, budget);
        revalidateTag('profile');
        revalidateTag(`profile-${userId}`);
        const allInsights = await insightService.listInsights(profileId, {
          limit: 10,
        });
        const currentIds = new Set(analysis.opportunities.map((o) => o.id));
        // Ne garder que les insights encore pertinents (présents dans l’analyse actuelle)
        insights = allInsights.filter((i) => currentIds.has(i.insightId));
      }

      if (insights.length === 0 && analysis.opportunities.length > 0 && profileId) {
        const snoozedIds = await insightService.getSnoozedInsightIds(profileId);
        const toShow = analysis.opportunities.filter((o) => !snoozedIds.has(o.id));
        insights = toShow.map((o) => ({
          id: o.id,
          insightId: o.id,
          type: o.type,
          severity: o.level.toLowerCase(),
          message: o.title ? `${o.title} — ${o.message}` : o.message,
          metadata: o.guide ? { guide: o.guide } : null,
          createdAt: new Date().toISOString(),
          readAt: null,
        }));
      }
    } catch {
      if (analysis && insights.length === 0 && analysis.opportunities.length > 0 && profileId) {
        try {
          const snoozedIds = await insightService.getSnoozedInsightIds(profileId);
          const toShow = analysis.opportunities.filter((o) => !snoozedIds.has(o.id));
          insights = toShow.map((o) => ({
            id: o.id,
            insightId: o.id,
            type: o.type,
            severity: o.level.toLowerCase(),
            message: o.title ? `${o.title} — ${o.message}` : o.message,
            metadata: o.guide ? { guide: o.guide } : null,
            createdAt: new Date().toISOString(),
            readAt: null,
          }));
        } catch {
          insights = analysis.opportunities.map((o) => ({
            id: o.id,
            insightId: o.id,
            type: o.type,
            severity: o.level.toLowerCase(),
            message: o.title ? `${o.title} — ${o.message}` : o.message,
            metadata: o.guide ? { guide: o.guide } : null,
            createdAt: new Date().toISOString(),
            readAt: null,
          }));
        }
      }
    }
  }

  return (
    <DashboardClient
      profile={profile}
      firstName={user?.firstName}
      initialInsights={insights}
      analysis={analysis}
    />
  );
}

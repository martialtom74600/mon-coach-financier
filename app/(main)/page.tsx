import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { auth, currentUser } from '@clerk/nextjs/server';
import { userService, insightService, profileService } from '@/app/services';
import { computeFinancialPlan, analyzeProfileHealth } from '@/app/lib/logic';
import { computeTreasuryStatus, isDashboardProfileReady } from '@/app/lib/treasuryStatus';
import { SafeToSpendCardShell } from '@/app/components/dashboard/SafeToSpendCardShell';
import { SafeToSpendHero } from '@/app/components/dashboard/SafeToSpendHero';
import { SafeToSpendGaugeBars } from '@/app/components/dashboard/SafeToSpendGaugeBars';
import DashboardInsightsSection from '@/app/components/dashboard/DashboardInsightsSection';
import DashboardPatrimoineGrid from '@/app/components/dashboard/DashboardPatrimoineGrid';
import DashboardWelcomeGate from '@/app/components/dashboard/DashboardWelcomeGate';
import type { StoredInsight } from '@/app/components/dashboard/ProactiveInsightsCard';

function opportunitiesToStoredInsights(
  opportunities: NonNullable<
    Awaited<ReturnType<typeof analyzeProfileHealth>>
  >['opportunities'],
): StoredInsight[] {
  return opportunities.map((o) => ({
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

/**
 * Persistance BDD + tags après envoi de la réponse HTML : libère le chemin critique RSC (LCP sur mobile 4G).
 * Sur hébergeur serverless, une petite partie des écritures peut théoriquement ne pas finir si l’isolate s’arrête ;
 * accepté ici au profit du temps de première peinture (re-sync au prochain passage / navigation).
 */
function scheduleHomeInsightPersistence(userId: string, profileRaw: Awaited<ReturnType<typeof userService.getCachedProfile>>) {
  void (async () => {
    try {
      const prof = userService.buildProfileForClient(profileRaw);
      if (!prof) return;

      let profileId = prof.profileId ?? null;
      if (!profileId) {
        try {
          profileId = await profileService.getProfileId(userId);
        } catch {
          return;
        }
      }
      if (!profileId) return;

      const { budget } = computeFinancialPlan(prof);
      const previousBudget = (prof.lastBudgetSnapshot ?? null) as Parameters<
        typeof analyzeProfileHealth
      >[3];
      const analysis = analyzeProfileHealth(prof, budget, undefined, previousBudget);

      await insightService.storeInsights(profileId, analysis.opportunities);
      await insightService.updateLastBudgetSnapshot(profileId, budget);
      revalidateTag('profile');
      revalidateTag(`profile-${userId}`);
    } catch (e) {
      console.error('Deferred home insight sync', e);
    }
  })();
}

export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [profileRaw, user] = await Promise.all([
    userService.getCachedProfile(userId),
    currentUser(),
  ]);

  const profile = userService.buildProfileForClient(profileRaw);

  scheduleHomeInsightPersistence(userId, profileRaw);

  let insights: StoredInsight[] = [];
  let analysis: Awaited<ReturnType<typeof analyzeProfileHealth>> | null = null;

  if (profile) {
    try {
      const { budget } = computeFinancialPlan(profile);
      const previousBudget = (profile.lastBudgetSnapshot ?? null) as Parameters<
        typeof analyzeProfileHealth
      >[3];
      analysis = analyzeProfileHealth(profile, budget, undefined, previousBudget);

      if (analysis.opportunities.length > 0) {
        insights = opportunitiesToStoredInsights(analysis.opportunities);
      }
    } catch {
      /* analyses optionnelles : dashboard peut s’afficher sans */
    }
  }

  const treasury =
    profile && isDashboardProfileReady(profile) ? computeTreasuryStatus(profile) : null;

  if (!profile || !isDashboardProfileReady(profile)) {
    return <DashboardWelcomeGate profile={profile} firstName={user?.firstName} />;
  }

  return (
    <div className="space-y-8 pb-20">
      <DashboardInsightsSection initialInsights={insights} />
      {treasury ? (
        <SafeToSpendCardShell>
          <SafeToSpendHero {...treasury} />
          <SafeToSpendGaugeBars {...treasury} />
        </SafeToSpendCardShell>
      ) : null}
      <DashboardPatrimoineGrid profile={profile} analysis={analysis} />
    </div>
  );
}

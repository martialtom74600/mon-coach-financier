import type { Profile } from '@/app/lib/definitions';
import { generateTimeline } from '@/app/lib/scenarios';

export type TreasurySnapshot = {
  currentBalance: number;
  upcomingFixed: number;
  upcomingSavings: number;
  safeToSpend: number;
  endOfMonthProjection: number;
};

/** Même règle que le dashboard : prêt à afficher les chiffres (hors écran wizard vide). */
export function isDashboardProfileReady(profile: Profile | null): boolean {
  if (!profile) return false;
  return !(
    (!profile.incomes || profile.incomes.length === 0) &&
    (!profile.assets || profile.assets.length === 0) &&
    (profile.currentBalance === 0 || profile.currentBalance === undefined)
  );
}

export function computeTreasuryStatus(profile: Profile): TreasurySnapshot {
  const timeline = generateTimeline(profile, profile.decisions || [], [], 45);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthData = timeline.find((m) => m.id === currentMonthKey);

  if (!monthData) {
    const b = profile.currentBalance || 0;
    return {
      currentBalance: b,
      upcomingFixed: 0,
      upcomingSavings: 0,
      safeToSpend: b,
      endOfMonthProjection: b,
    };
  }

  const todayDate = new Date().toISOString().slice(0, 10);
  const todayData = monthData.days.find((d) => d.date.startsWith(todayDate));
  const currentBalance = todayData?.balance ?? (profile.currentBalance || 0);

  const todayIndex = monthData.days.findIndex((d) => d.date.startsWith(todayDate));
  const remainingDays = todayIndex >= 0 ? monthData.days.slice(todayIndex + 1) : monthData.days;

  let upcomingFixed = 0;
  let upcomingSavings = 0;

  remainingDays.forEach((day) => {
    day.events.forEach((evt) => {
      if (evt.amount < 0) {
        if (evt.name.toLowerCase().includes('épargne') || evt.name.toLowerCase().includes('virement')) {
          upcomingSavings += Math.abs(evt.amount);
        } else {
          upcomingFixed += Math.abs(evt.amount);
        }
      }
    });
  });

  const safeToSpend = currentBalance - upcomingFixed - upcomingSavings;
  const endOfMonthProjection = monthData.stats.balanceEnd;

  return {
    currentBalance,
    upcomingFixed,
    upcomingSavings,
    safeToSpend,
    endOfMonthProjection,
  };
}

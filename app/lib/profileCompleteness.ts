import type { Profile } from '@/app/lib/definitions';

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  const hasId = profile.profileId && profile.profileId !== 'temp';
  const hasIdentity = profile.firstName && profile.age;
  return !!(hasId && hasIdentity);
}

import { revalidateTag } from 'next/cache';

/**
 * Tags alignés sur `unstable_cache` dans `userService.getCachedProfile`.
 * Toute évolution doit passer par ce module pour éviter profil obsolète.
 */
export const PROFILE_CACHE_TAG_GLOBAL = 'profile' as const;

export function profileCacheTagForUser(userId: string): string {
  return `profile-${userId}`;
}

/** Liste passée à l’option `tags` de `unstable_cache` */
export function profileCacheTagsForUser(userId: string): [string, string] {
  return [PROFILE_CACHE_TAG_GLOBAL, profileCacheTagForUser(userId)];
}

/** Invalide le cache profil (global + utilisateur) après mutation métier. */
export function invalidateProfileCache(userId: string): void {
  const [globalTag, userTag] = profileCacheTagsForUser(userId);
  revalidateTag(globalTag);
  revalidateTag(userTag);
}

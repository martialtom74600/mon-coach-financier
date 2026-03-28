import { currentUser } from '@clerk/nextjs/server';
import { profileService, userService, ServiceError } from '@/app/services';

/** Aligné sur GET /api/preferences : assure User + profil minimal si besoin. */
export async function getOrCreateProfileId(userId: string): Promise<string> {
  try {
    return await profileService.getProfileId(userId);
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) {
      const userAuth = await currentUser();
      const email =
        userAuth?.emailAddresses[0]?.emailAddress ?? `noemail+${userId}@placeholder.local`;
      const firstName = userAuth?.firstName ?? '';
      return userService.ensureUserAndProfile(userId, email, firstName);
    }
    throw error;
  }
}

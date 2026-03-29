import type { Profile } from '@/app/lib/definitions';
import type { ProfileApiPayload } from '@/app/lib/validations';
import { normalizeClientProfile, type ClientProfileSource } from '@/app/lib/normalizeClientProfile';

export type { ProfileApiPayload };

/** Payload Zod-validé → même normalisation que `userService.buildProfileForClient`. */
export function profileFromApiPayload(validated: ProfileApiPayload): Profile {
  return normalizeClientProfile(validated as ClientProfileSource);
}

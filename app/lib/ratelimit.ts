/**
 * Rate limiting pour les routes API.
 * Utilise @upstash/ratelimit + Redis quand UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont configurés.
 * Sinon, pass-through (aucune limite) pour le dev local sans Redis.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit: Ratelimit | null = null;

if (REDIS_URL && REDIS_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({ url: REDIS_URL, token: REDIS_TOKEN }),
    limiter: Ratelimit.slidingWindow(20, '10 s'),
    analytics: false,
  });
}

export type RateLimitResult = { success: true } | { success: false; remaining: number; reset: number };

/**
 * Vérifie le rate limit pour la requête.
 * @param req - La requête Next.js (pour extraire l'IP)
 * @returns { success: true } si OK, { success: false, remaining, reset } si limité
 */
/**
 * @param userId - Si présent (utilisateur Clerk connecté), quota dédié par compte (évite le 429 multi-onglets partagé avec toute une IP).
 */
export async function checkRateLimit(
  req: NextRequest,
  userId?: string | null,
): Promise<RateLimitResult> {
  if (!ratelimit) {
    return { success: true };
  }

  const identifier = userId?.trim()
    ? `user:${userId}`
    : getIdentifier(req);
  const { success, remaining, reset } = await ratelimit.limit(identifier);

  if (success) {
    return { success: true };
  }
  return { success: false, remaining, reset };
}

function getIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'anonymous';
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  // NextRequest.ip (Next.js 15+)
  const ip = (req as unknown as { ip?: string }).ip;
  if (ip) return ip;
  return 'anonymous';
}

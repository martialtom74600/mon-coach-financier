/**
 * ratelimit.test.ts — Tests du rate limiting (E.1)
 *
 * Vérifie que checkRateLimit respecte le contrat :
 * - Sans Redis configuré : pass-through (success: true)
 * - Avec requête valide : retourne un RateLimitResult
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Sauvegarder et restaurer les env pour isoler le test
const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

describe('checkRateLimit — E.1 Rate limiting', () => {
  beforeEach(() => {
    // Forcer l'absence de Redis pour un comportement déterministe en CI
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (originalUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });

  it('retourne success: true quand Redis n\'est pas configuré (pass-through dev)', async () => {
    // Recharger le module pour prendre en compte l'absence de Redis
    const { checkRateLimit } = await import('@/app/lib/ratelimit');
    const req = createMockRequest();

    const result = await checkRateLimit(req);

    expect(result).toHaveProperty('success', true);
  });

  it('retourne un RateLimitResult valide (success boolean)', async () => {
    const { checkRateLimit } = await import('@/app/lib/ratelimit');
    const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });

    const result = await checkRateLimit(req);

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('reset');
    }
  });
});

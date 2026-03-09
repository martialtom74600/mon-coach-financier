/**
 * decisionService.test.ts — Tests pour listDecisions et getDecisionsStats (H.2)
 *
 * Protocole Blind & Logic : valeurs attendues calculées manuellement.
 * Vérifie : pagination cursor-based, ordre date desc, stats agrégées.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const { mockFindMany, mockCount, mockAggregate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockAggregate: vi.fn(),
}));

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    purchaseDecision: {
      findMany: mockFindMany,
      count: mockCount,
      aggregate: mockAggregate,
    },
  },
}));

vi.mock('@/app/services/profileService', () => ({
  getProfileId: vi.fn().mockResolvedValue('profile-1'),
}));

import { listDecisions, getDecisionsStats } from '@/app/services/decisionService';

function mkDecision(
  id: string,
  amount: number,
  date: Date,
  outcome?: 'SATISFIED' | 'REGRETTED',
) {
  return {
    id,
    profileId: 'profile-1',
    name: 'Test',
    amount: new Prisma.Decimal(amount),
    date,
    type: 'NEED',
    paymentMode: 'CASH_CURRENT',
    isPro: false,
    isReimbursable: false,
    reimbursedAt: null,
    duration: null,
    rate: null,
    outcome: outcome ?? null,
    createdAt: new Date(),
  };
}

describe('listDecisions — H.2 pagination cursor-based', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne une liste vide et nextCursor null quand aucun enregistrement', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await listDecisions('user-1');

    expect(result.decisions).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 21,
        where: { profileId: 'profile-1' },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('retourne limit éléments et nextCursor quand il y a plus de résultats', async () => {
    const d1 = mkDecision('d1', 100, new Date('2025-03-01'));
    const d2 = mkDecision('d2', 200, new Date('2025-02-15'));
    const d3 = mkDecision('d3', 300, new Date('2025-02-01'));
    const d4 = mkDecision('d4', 400, new Date('2025-01-15'));
    mockFindMany.mockResolvedValue([d1, d2, d3, d4]);

    const result = await listDecisions('user-1', { limit: 3 });

    expect(result.decisions).toHaveLength(3);
    expect(result.decisions[0]).toMatchObject({ id: 'd1', amount: 100 });
    expect(result.decisions[1]).toMatchObject({ id: 'd2', amount: 200 });
    expect(result.decisions[2]).toMatchObject({ id: 'd3', amount: 300 });
    expect(result.nextCursor).toBe('d3');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 4 }),
    );
  });

  it('utilise le cursor pour la page suivante et skip 1', async () => {
    const d4 = mkDecision('d4', 400, new Date('2025-01-15'));
    mockFindMany.mockResolvedValue([d4]);

    const result = await listDecisions('user-1', { cursor: 'd3', limit: 3 });

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]).toMatchObject({ id: 'd4', amount: 400 });
    expect(result.nextCursor).toBeNull();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'd3' },
        skip: 1,
        take: 4,
      }),
    );
  });

  it('borne limit à MAX_LIMIT 100', async () => {
    mockFindMany.mockResolvedValue([]);

    await listDecisions('user-1', { limit: 500 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 101 }),
    );
  });
});

describe('getDecisionsStats — H.2 agrégats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne total, accepted, rejected, amountTotal calculés manuellement', async () => {
    mockCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    mockAggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(1500) },
    });

    const result = await getDecisionsStats('user-1');

    expect(result.total).toBe(5);
    expect(result.accepted).toBe(2);
    expect(result.rejected).toBe(1);
    expect(result.amountTotal).toBe(1500);
  });

  it('retourne amountTotal 0 quand aucune décision', async () => {
    mockCount.mockResolvedValue(0);
    mockAggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await getDecisionsStats('user-1');

    expect(result.total).toBe(0);
    expect(result.amountTotal).toBe(0);
  });
});

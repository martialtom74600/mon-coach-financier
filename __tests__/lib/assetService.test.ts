/**
 * assetService.test.ts — Tests pour getAssetHistory (F.2) et aggregateAssetHistory (F.3)
 *
 * Protocole Blind & Logic : valeurs attendues calculées manuellement.
 * Vérifie : ownership, sérialisation Decimal→number, ordre chronologique, agrégation mensuelle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';

const { mockFindFirst, mockFindMany, mockDeleteMany, mockCreateMany, mockTransaction } =
  vi.hoisted(() => ({
    mockFindFirst: vi.fn(),
    mockFindMany: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockCreateMany: vi.fn(),
    mockTransaction: vi.fn(),
  }));

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    asset: { findFirst: mockFindFirst },
    assetHistory: {
      findMany: mockFindMany,
      deleteMany: mockDeleteMany,
      createMany: mockCreateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/app/services/profileService', () => ({
  getProfileId: vi.fn().mockResolvedValue('profile-1'),
}));

// Import après les mocks (hoisted)
import { getAssetHistory, aggregateAssetHistory } from '@/app/services/assetService';

describe('getAssetHistory — F.2 AssetHistory pour tendances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({
      id: 'asset-1',
      profileId: 'profile-1',
      name: 'Livret A',
      type: 'LIVRET',
      currentValue: new Prisma.Decimal(2000),
      monthlyFlow: new Prisma.Decimal(100),
      transferDay: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('retourne l\'historique trié par date croissante avec valeurs en number', async () => {
    // Valeurs attendues : 1000€ et 1500€ (calcul manuel, pas calqué sur le code)
    mockFindMany.mockResolvedValue([
      {
        id: 'h1',
        assetId: 'asset-1',
        value: new Prisma.Decimal(1000),
        date: new Date('2025-01-15'),
      },
      {
        id: 'h2',
        assetId: 'asset-1',
        value: new Prisma.Decimal(1500),
        date: new Date('2025-02-20'),
      },
    ]);

    const result = await getAssetHistory('user-1', 'asset-1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { assetId: 'asset-1' },
      orderBy: { date: 'asc' },
      select: { id: true, value: true, date: true },
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'h1', value: 1000 });
    expect(result[1]).toMatchObject({ id: 'h2', value: 1500 });
    expect(typeof result[0].value).toBe('number');
    expect(typeof result[1].value).toBe('number');
  });

  it('retourne un tableau vide si aucun historique', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getAssetHistory('user-1', 'asset-1');

    expect(result).toEqual([]);
  });

  it('lève ServiceError.forbidden si l\'actif n\'appartient pas au profil', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(getAssetHistory('user-1', 'asset-other')).rejects.toThrow();
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

describe('aggregateAssetHistory — F.3 Rétention AssetHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2025-03-09T12:00:00Z') });
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retourne { deleted: 0, inserted: 0 } si aucun snapshot > 12 mois', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await aggregateAssetHistory();

    expect(result).toEqual({ deleted: 0, inserted: 0 });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('agrège 3 snapshots d\'un même mois en 1 point mensuel (moyenne calculée manuellement)', async () => {
    // Cutoff = 2025-03-09 - 12 mois = 2024-03-09. Jan 2023 < cutoff.
    // 3 valeurs : 1000, 1200, 1400 → moyenne = 3600/3 = 1200
    mockFindMany.mockResolvedValue([
      {
        id: 'h1',
        assetId: 'asset-A',
        value: new Prisma.Decimal(1000),
        date: new Date('2023-01-05'),
      },
      {
        id: 'h2',
        assetId: 'asset-A',
        value: new Prisma.Decimal(1200),
        date: new Date('2023-01-15'),
      },
      {
        id: 'h3',
        assetId: 'asset-A',
        value: new Prisma.Decimal(1400),
        date: new Date('2023-01-25'),
      },
    ]);
    mockDeleteMany.mockResolvedValue({ count: 3 });
    mockCreateMany.mockResolvedValue({ count: 1 });

    const result = await aggregateAssetHistory();

    expect(result).toEqual({ deleted: 3, inserted: 1 });
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['h1', 'h2', 'h3'] } },
    });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          assetId: 'asset-A',
          value: 1200,
          date: new Date(2023, 0, 1),
        },
      ],
    });
  });

  it('agrège 2 mois distincts pour le même actif (2 points insérés)', async () => {
    // Jan 2023 : 1000, 2000 → avg 1500. Feb 2023 : 3000 → avg 3000.
    mockFindMany.mockResolvedValue([
      {
        id: 'h1',
        assetId: 'asset-B',
        value: new Prisma.Decimal(1000),
        date: new Date('2023-01-10'),
      },
      {
        id: 'h2',
        assetId: 'asset-B',
        value: new Prisma.Decimal(2000),
        date: new Date('2023-01-20'),
      },
      {
        id: 'h3',
        assetId: 'asset-B',
        value: new Prisma.Decimal(3000),
        date: new Date('2023-02-15'),
      },
    ]);
    mockDeleteMany.mockResolvedValue({ count: 3 });
    mockCreateMany.mockResolvedValue({ count: 2 });

    const result = await aggregateAssetHistory();

    expect(result).toEqual({ deleted: 3, inserted: 2 });
    const createData = mockCreateMany.mock.calls[0][0].data;
    expect(createData).toContainEqual({
      assetId: 'asset-B',
      value: 1500,
      date: new Date(2023, 0, 1),
    });
    expect(createData).toContainEqual({
      assetId: 'asset-B',
      value: 3000,
      date: new Date(2023, 1, 1),
    });
  });

  it('arrondit la moyenne à 2 décimales', async () => {
    // 100, 200, 201 → avg = 501/3 = 167
    mockFindMany.mockResolvedValue([
      {
        id: 'h1',
        assetId: 'asset-C',
        value: new Prisma.Decimal(100),
        date: new Date('2023-01-01'),
      },
      {
        id: 'h2',
        assetId: 'asset-C',
        value: new Prisma.Decimal(200),
        date: new Date('2023-01-15'),
      },
      {
        id: 'h3',
        assetId: 'asset-C',
        value: new Prisma.Decimal(201),
        date: new Date('2023-01-30'),
      },
    ]);
    mockDeleteMany.mockResolvedValue({ count: 3 });
    mockCreateMany.mockResolvedValue({ count: 1 });

    await aggregateAssetHistory();

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          assetId: 'asset-C',
          value: 167,
          date: new Date(2023, 0, 1),
        },
      ],
    });
  });
});

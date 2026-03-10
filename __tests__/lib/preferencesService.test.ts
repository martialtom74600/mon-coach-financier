/**
 * preferencesService.test.ts — Tests K.1 UserPreferences
 *
 * Protocole Blind & Logic : valeurs attendues définies avant l'appel.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindUnique, mockCreate, mockUpsert } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    userPreferences: {
      findUnique: mockFindUnique,
      create: mockCreate,
      upsert: mockUpsert,
    },
  },
}));

vi.mock('@/app/services/profileService', () => ({
  getProfileId: vi.fn().mockResolvedValue('profile-1'),
}));

import {
  getPreferences,
  updatePreferences,
  updateConsents,
} from '@/app/services/preferencesService';

describe('preferencesService — K.1 UserPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('retourne les préférences existantes', async () => {
      const now = new Date('2026-03-10T12:00:00Z');
      mockFindUnique.mockResolvedValue({
        id: 'pref-1',
        profileId: 'profile-1',
        pushEnabled: true,
        pushAskedAt: now,
        emailAlerts: false,
        emailNewsletter: true,
        consentAnalytics: true,
        consentMarketing: false,
        consentUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const result = await getPreferences('profile-1');

      expect(result).toMatchObject({
        id: 'pref-1',
        pushEnabled: true,
        emailAlerts: false,
        emailNewsletter: true,
        consentAnalytics: true,
        consentMarketing: false,
      });
      expect(result.consentUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('crée les préférences par défaut si absentes', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 'pref-new',
        profileId: 'profile-1',
        pushEnabled: false,
        pushAskedAt: null,
        emailAlerts: false,
        emailNewsletter: false,
        consentAnalytics: false,
        consentMarketing: false,
        consentUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getPreferences('profile-1');

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profileId: 'profile-1',
          pushEnabled: false,
          emailAlerts: false,
          emailNewsletter: false,
          consentAnalytics: false,
          consentMarketing: false,
        }),
      });
      expect(result.pushEnabled).toBe(false);
      expect(result.emailNewsletter).toBe(false);
    });
  });

  describe('updatePreferences', () => {
    it('met à jour pushEnabled et pushAskedAt', async () => {
      const now = new Date();
      mockUpsert.mockResolvedValue({
        id: 'pref-1',
        profileId: 'profile-1',
        pushEnabled: true,
        pushAskedAt: now,
        emailAlerts: false,
        emailNewsletter: false,
        consentAnalytics: false,
        consentMarketing: false,
        consentUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      mockFindUnique.mockResolvedValue({
        id: 'pref-1',
        profileId: 'profile-1',
        pushEnabled: true,
        pushAskedAt: now,
        emailAlerts: false,
        emailNewsletter: false,
        consentAnalytics: false,
        consentMarketing: false,
        consentUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const result = await updatePreferences('user-1', { pushEnabled: true });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            pushEnabled: true,
            pushAskedAt: expect.any(Date),
          }),
        })
      );
      expect(result.pushEnabled).toBe(true);
    });

    it('met à jour les consentements et consentUpdatedAt', async () => {
      const now = new Date();
      mockUpsert.mockResolvedValue({});
      mockFindUnique.mockResolvedValue({
        id: 'pref-1',
        profileId: 'profile-1',
        pushEnabled: false,
        pushAskedAt: null,
        emailAlerts: false,
        emailNewsletter: false,
        consentAnalytics: true,
        consentMarketing: true,
        consentUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await updatePreferences('user-1', {
        consentAnalytics: true,
        consentMarketing: true,
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            consentAnalytics: true,
            consentMarketing: true,
            consentUpdatedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('updateConsents', () => {
    it('délègue à updatePreferences', async () => {
      const now = new Date();
      mockUpsert.mockResolvedValue({});
      mockFindUnique.mockResolvedValue({
        id: 'pref-1',
        profileId: 'profile-1',
        pushEnabled: false,
        pushAskedAt: null,
        emailAlerts: false,
        emailNewsletter: false,
        consentAnalytics: true,
        consentMarketing: false,
        consentUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const result = await updateConsents('user-1', {
        consentAnalytics: true,
      });

      expect(result.consentAnalytics).toBe(true);
    });
  });
});

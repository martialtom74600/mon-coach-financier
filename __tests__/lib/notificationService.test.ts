/**
 * notificationService.test.ts — I.3 Notifications PWA
 *
 * Tests : getVapidPublicKey, savePushSubscription, sendPushForInsight
 * Protocole Blind & Logic : sans VAPID configuré, getVapidPublicKey = '' et sendPushForInsight = 0.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpsert, mockFindMany, mockDeleteMany } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockFindMany: vi.fn(),
  mockDeleteMany: vi.fn(),
}));

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    pushSubscription: {
      upsert: mockUpsert,
      findMany: mockFindMany,
      deleteMany: mockDeleteMany,
    },
  },
}));

vi.mock('@/app/services/profileService', () => ({
  getProfileId: vi.fn().mockResolvedValue('profile-1'),
}));

// Import après mocks (VAPID non défini en test → getVapidPublicKey = '')
import {
  getVapidPublicKey,
  savePushSubscription,
  sendPushForInsight,
} from '@/app/services/notificationService';

describe('notificationService — I.3 Notifications PWA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVapidPublicKey', () => {
    it('retourne chaîne vide quand VAPID non configuré', () => {
      const key = getVapidPublicKey();
      expect(key).toBe('');
    });
  });

  describe('savePushSubscription', () => {
    it('appelle upsert avec profileId et subscription', async () => {
      mockUpsert.mockResolvedValue({});

      await savePushSubscription('user-1', {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'key1', auth: 'auth1' },
      });

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { profileId_endpoint: { profileId: 'profile-1', endpoint: 'https://fcm.googleapis.com/fcm/send/abc' } },
        create: {
          profileId: 'profile-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
          p256dh: 'key1',
          auth: 'auth1',
        },
        update: { p256dh: 'key1', auth: 'auth1' },
      });
    });
  });

  describe('sendPushForInsight', () => {
    it('retourne 0 quand VAPID non configuré (pas d\'envoi)', async () => {
      const sent = await sendPushForInsight('profile-1', {
        title: 'Test',
        body: 'Message',
      });
      expect(sent).toBe(0);
      expect(mockFindMany).not.toHaveBeenCalled();
    });
  });
});

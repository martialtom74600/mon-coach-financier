'use client';

/**
 * I.3 — Notifications PWA
 * Demande la permission push et enregistre la subscription auprès de l'API.
 * S'exécute une fois au chargement (utilisateur connecté).
 */

import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'mcf_push_prompt_shown';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Url);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushNotificationPrompt() {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return;
    }

    // Éviter de redemander si déjà refusé ou déjà abonné
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    attempted.current = true;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (!reg.pushManager) return;

        const perm = Notification.permission;
        if (perm === 'denied') {
          localStorage.setItem(STORAGE_KEY, '1');
          return;
        }

        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Déjà abonné — pas besoin de redemander
          return;
        }

        if (perm === 'default') {
          const granted = await Notification.requestPermission();
          if (granted !== 'granted') {
            localStorage.setItem(STORAGE_KEY, '1');
            return;
          }
        }

        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const { publicKey } = await res.json();
        if (!publicKey) return;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });

        const body = subscription.toJSON();

        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        // Silencieux : pas de notification si échec
      }
    };

    register();
  }, []);

  return null;
}

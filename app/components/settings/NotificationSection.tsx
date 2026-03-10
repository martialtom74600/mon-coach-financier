'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import ContextToggle from '@/app/components/ui/ContextToggle';

const STORAGE_KEY = 'mcf_push_prompt_shown';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Url);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function subscribeToPush(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return false;

    const perm = Notification.permission;
    if (perm === 'denied') return false;

    if (perm === 'default') {
      const granted = await Notification.requestPermission();
      if (granted !== 'granted') return false;
    }

    const res = await fetch('/api/notifications');
    if (!res.ok) return false;
    const { publicKey } = await res.json();
    if (!publicKey) return false;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });
    return true;
  } catch {
    return false;
  }
}

export interface NotificationSectionProps {
  pushEnabled: boolean;
  onPushChange: (enabled: boolean) => void;
  saving?: boolean;
}

export default function NotificationSection({
  pushEnabled,
  onPushChange,
  saving = false,
}: NotificationSectionProps) {
  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const ok = await subscribeToPush();
      if (ok) {
        localStorage.removeItem(STORAGE_KEY);
        onPushChange(true);
      } else {
        onPushChange(false);
      }
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
      onPushChange(false);
    }
  };

  return (
    <ContextToggle
      label="Notifications push"
      subLabel="Reçois les alertes (découvert, calendrier) sur ton téléphone"
      icon={Bell}
      checked={pushEnabled}
      onChange={handleToggle}
      variant="indigo"
    />
  );
}

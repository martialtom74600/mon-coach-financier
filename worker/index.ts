/**
 * Custom worker — I.3 Notifications PWA
 * Injecté dans le service worker par next-pwa (customWorkerSrc).
 * Gère l'événement 'push' pour afficher les notifications proactives.
 */

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string; insightId?: string } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Mon Coach Financier', body: event.data.text() || 'Nouvelle alerte' };
  }

  const title = payload.title ?? 'Mon Coach Financier';
  const body = payload.body ?? 'Nouvelle alerte';
  const url = payload.url ?? '/';

  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.insightId ?? 'insight',
    renotify: true,
    data: { url },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url = (event.notification.data?.url as string) ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

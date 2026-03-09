/**
 * Custom worker — I.3 Notifications PWA
 * Injecté dans le service worker par next-pwa (customWorkerSrc).
 * Gère l'événement 'push' pour afficher les notifications proactives.
 */
/// <reference lib="webworker" />

interface SWScope {
  addEventListener: (type: string, listener: (e: Event) => void) => void;
  registration: ServiceWorkerRegistration;
  clients: Clients;
  location: { origin: string };
}

const sw = self as unknown as SWScope;

sw.addEventListener('push', (event: Event) => {
  const e = event as ExtendableMessageEvent & { data?: { json(): unknown; text(): string } };
  if (!e.data) return;

  let payload: { title?: string; body?: string; url?: string; insightId?: string } = {};
  try {
    payload = e.data.json();
  } catch {
    payload = { title: 'Mon Coach Financier', body: e.data.text() || 'Nouvelle alerte' };
  }

  const title = payload.title ?? 'Mon Coach Financier';
  const body = payload.body ?? 'Nouvelle alerte';
  const url = payload.url ?? '/';

  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.insightId ?? 'insight',
    data: { url },
  };

  (event as ExtendableEvent).waitUntil(
    sw.registration.showNotification(title, options)
  );
});

sw.addEventListener('notificationclick', (event: Event) => {
  const ne = event as NotificationEvent;
  ne.notification.close();

  const url = (ne.notification.data?.url as string) ?? '/';
  (event as ExtendableEvent).waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(sw.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(url);
      }
    })
  );
});

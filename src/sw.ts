/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Push Event ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Teko Cash', body: event.data.text() };
  }

  const title = payload.title ?? 'Teko Cash';
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag ?? 'teko-cash',
    data: { url: payload.url ?? '/budgets' },
    // Keep notification visible until user interacts
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? '/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
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

// ─── Skip waiting immediately on new SW version ──────────────────────────────
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

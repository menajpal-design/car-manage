// FleetMaster Pro — Web Admin PWA Service Worker
// Handles offline caching of static assets and API responses

const CACHE_NAME = 'fleetmaster-web-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard/vehicles',
  '/dashboard/tickets',
  '/dashboard/fuel',
  '/dashboard/payments',
  '/dashboard/expenses',
  '/dashboard/analytics',
  '/dashboard/users',
  '/manifest.json',
];

// Install — cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback for navigation; cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API calls (those need fresh data)
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: network first, fall back to cached index
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((res) => res || new Response('Offline'))
      )
    );
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/'));
    })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'FleetMaster Pro';
  const options = {
    body: data.body || data.message || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.type || 'fleet-notification',
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

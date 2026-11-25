'use strict';

const SHELL_CACHE = 'foxhound-shell-v86'; //
const RUNTIME_CACHE = 'foxhound-runtime-v86';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/design-system.css',
  '/css/app.css',
  '/logo-foxhound.webp',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const BYPASS_PREFIXES = [
  '/api/',
  '/admin/',
  '/uploads/',
  '/photos/',
  '/operators/',
  '/devices/',
  '/radio/',
  '/geojson/',
  '/sounds/'
];

const pendingRequests = new Map();

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(name => name !== SHELL_CACHE && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (pendingRequests.has(request.url)) {
      event.respondWith(pendingRequests.get(request.url));
      return;
  }

  const fetchPromise = caches.match(request).then(cached => {
    if (cached) return cached;

    return fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }).finally(() => {
      pendingRequests.delete(request.url);
  });

  pendingRequests.set(request.url, fetchPromise);
  event.respondWith(fetchPromise);
});

// --- PUSH NOTIFICATIONS ---
self.addEventListener('push', function(event) {
    let data = { title: 'FOXHOUND', body: 'Новое уведомление', url: '/#/chat', avatar: '/logo-foxhound.webp' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch(e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.avatar, // Аватар пользователя (справа)
        badge: '/icons/badge.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});

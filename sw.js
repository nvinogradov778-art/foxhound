'use strict';

const SHELL_CACHE = 'foxhound-shell-v6';
const RUNTIME_CACHE = 'foxhound-runtime-v6';

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

  // Навигация: сеть → fallback на index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Всё остальное: cache-first + фоновое пополнение
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

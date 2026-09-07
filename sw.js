const CACHE_NAME = 'foxhound-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-foxhound.webp',
  '/background.mp4',
  '/radio_data.json',
  '/log_data.json',
  '/photo_data.json',
  '/operators_data.json',
  '/instructions_data.json',
  '/atak_data.json',
  '/maps_data.json',
  '/regulations_data.json',
  '/scenarios_data.json',
  '/devices_data.json',
  'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=PT+Sans+Narrow:wght@400;700&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  '/js/utils.js',
  '/js/navigation.js',
  '/js/radio.js',
  '/js/auth.js',
  '/js/chat.js',
  '/js/polls.js',
  '/js/events.js',
  '/js/calculator.js',
  '/js/maps.js',
  '/js/gallery.js',
  '/js/operators.js',
  '/js/instructions.js',
  '/js/atak.js',
  '/js/regulations.js',
  '/js/scenarios.js',
  '/js/devices.js',
  '/js/logs.js',
  '/js/init.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.startsWith('/js/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

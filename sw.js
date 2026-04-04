const CACHE_NAME = 'fitness-tracker-v23';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/db.js',
  '/js/exercises.js',
  '/js/ui.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first for static assets, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept Supabase API calls - let browser handle them directly
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Cache-first strategy for static assets only
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses or non-GET requests
          if (!response || response.status !== 200 || event.request.method !== 'GET') {
            return response;
          }
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
      .catch(() => {
        // Fallback for offline - return cached index for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

const CACHE_NAME = 'fitness-tracker-v24';
const ASSETS_TO_CACHE = [
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install event - cache only icons (not JS/CSS which must stay fresh)
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

// Fetch event - only cache icons, everything else goes to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept Supabase API calls
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Cache-first only for icons
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  // Everything else (JS, CSS, HTML) - network only, fallback to cache if offline
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request) || caches.match('/index.html');
    })
  );
});

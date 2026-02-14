const CACHE_NAME = 'accounting-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/js/storage.js',
  '/js/auth.js',
  '/js/inventory.js',
  '/js/transactions.js',
  '/js/creditors-debtors.js',
  '/js/reports.js',
  '/js/settings.js',
  '/js/help.js',
  '/js/ui.js',
  '/js/app.js',
  '/manifest.json',
  '/sw.js'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

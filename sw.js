const CACHE = 'porra2026-v18';
const OFFLINE_ASSETS = [
  './',
  'index.html',
  'logo-limpio2.png',
  'manifest.json',
  'style.css',
  'data.js',
  'js/globals.js',
  'js/data.js',
  'js/auth.js',
  'js/scoring.js',
  'js/ui-core.js',
  'js/predictions.js',
  'js/views.js',
  'js/admin.js',
  'js/main.js'
];

// Install: pre-cache the shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', e => {
  // Only intercept GET requests to our own origin
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Update cache with fresh response
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

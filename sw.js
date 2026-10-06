const CACHE_NAME = 'iyyapa-fashion-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Minimal caching to avoid 404 errors preventing SW installation
            return cache.addAll([
                'index.html',
                'app.html',
                'styles.css',
                'logo.jpg'
            ]).catch(err => console.warn('Cache error:', err));
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

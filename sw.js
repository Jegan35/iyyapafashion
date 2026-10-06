const CACHE_NAME = 'iyyapa-fashion-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './',
                './index.html',
                './app.html',
                './styles.css',
                './logo.jpg'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Network first approach for PWA installability without breaking Firebase
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

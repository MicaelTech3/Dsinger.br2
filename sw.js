const CACHE_NAME = 'dsigner-painel-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/painel.html',
    '/painel.css',
    '/painel.js',
    '/logos/logo_Dsigner.png',
    '/logos/logo_Dsigner_2.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
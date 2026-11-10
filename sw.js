/**
 * Parks: Roll & Hike Service Worker
 * Designed for 100% offline device caching and safe hosting on GitHub Pages (shared domain).
 */

const CACHE_PREFIX = 'parks-roll-hike-cache-';
const CACHE_VERSION = 'v3';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// Precache list with paths relative to the Service Worker location
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/data.js',
  './js/game.js',
  './js/app.js',
  './assets/logo.svg',
  './assets/trail-map.png',
  './assets/group-token.svg',
  './assets/mountain-bg.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  // 12 Park cards front/back
  './assets/parks/acadia-front.jpg',
  './assets/parks/acadia-back.jpg',
  './assets/parks/arches-front.jpg',
  './assets/parks/arches-back.jpg',
  './assets/parks/death-valley-front.jpg',
  './assets/parks/death-valley-back.jpg',
  './assets/parks/glacier-front.jpg',
  './assets/parks/glacier-back.jpg',
  './assets/parks/great-smoky-mountains-front.jpg',
  './assets/parks/great-smoky-mountains-back.jpg',
  './assets/parks/yosemite-front.jpg',
  './assets/parks/yosemite-back.jpg',
  // 21 Icons
  './assets/icons/bear.svg',
  './assets/icons/bear-turtle.svg',
  './assets/icons/binoculars.svg',
  './assets/icons/bird.svg',
  './assets/icons/canteen.svg',
  './assets/icons/canteen-sun.svg',
  './assets/icons/fish.svg',
  './assets/icons/fish-bird.svg',
  './assets/icons/flower.svg',
  './assets/icons/flower-sun.svg',
  './assets/icons/forest.svg',
  './assets/icons/forest-sun.svg',
  './assets/icons/mountain.svg',
  './assets/icons/mountain-sun.svg',
  './assets/icons/pencil.svg',
  './assets/icons/sun-four.svg',
  './assets/icons/sun-pencil.svg',
  './assets/icons/sun-water.svg',
  './assets/icons/turtle.svg',
  './assets/icons/water.svg',
  './assets/icons/water-double.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Add each asset individually with error handling so one missing file doesn't break everything
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[Service Worker] Asset precache failed for:', asset, err);
        }
      }
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // CRITICAL FOR GITHUB PAGES:
      // Only delete caches that belong to Parks: Roll & Hike!
      // NEVER delete other applications' caches on the same GitHub Pages origin!
      const deletions = keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => {
          console.log('[Service Worker] Cleaning old app cache:', key);
          return caches.delete(key);
        });
      return Promise.all(deletions);
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore browser extensions or other protocols
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Try cache match first for instant offline loading
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
          })
          .catch(() => {
            // Offline - no revalidation needed
          });
        return cachedResponse;
      }

      // 2. Not in cache: fetch from network and store in cache
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          const fallback = await cache.match('./index.html') || await cache.match('./');
          if (fallback) return fallback;
        }
        throw err;
      }
    })
  );
});

/* Leonida Map service worker
 * - tiles & pin images (CDN): cache-first, capped
 * - *.json from CDN: stale-while-revalidate
 * - app shell: network-first with cache fallback (works offline after first visit)
 */
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const TILES = `tiles-${VERSION}`;
const DATA = `data-${VERSION}`;
const MAX_TILES = 2500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('telegram.org')) return;

  if (/\/(tiles[^/]*|pins)\/.+\.webp$/.test(url.pathname)) {
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) { c.put(req, res.clone()); trim(TILES, MAX_TILES); }
        return res;
      }),
    );
    return;
  }

  if (url.pathname.endsWith('.json') && url.origin !== location.origin) {
    e.respondWith(
      caches.open(DATA).then(async (c) => {
        const hit = await c.match(req, { ignoreSearch: true });
        const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
    );
  }
});

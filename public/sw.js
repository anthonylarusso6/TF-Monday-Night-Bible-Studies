const CACHE = 'tf-bible-v12';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only this app's own files. Supabase must reach the network untouched:
  // caching its responses served stale data, and on a failed lookup the old
  // handler resolved to undefined, which makes the request throw — the app
  // read that as being offline while the connection was fine.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  const isDocument = req.mode === 'navigate' || req.destination === 'document';

  e.respondWith(
    fetch(req)
      .then((res) => {
        // Only store content-hashed build output and static assets. An HTML
        // document names the exact script files of the build it came from, so
        // a stored copy goes stale the moment a new version deploys and the
        // app fails to start with a missing-chunk error.
        if (res.ok && res.type === 'basic' && !isDocument) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Must return a Response — never undefined, which makes fetch throw.
        return Response.error();
      })
  );
});

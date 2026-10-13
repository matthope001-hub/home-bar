// Home Bar offline cache. Bump VERSION after changing index.html so phones pick up the new copy.
const VERSION = 'homebar-v4';
const SHELL = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c =>
    Promise.all(SHELL.map(u => c.add(new Request(u, { mode: u.startsWith('http') ? 'no-cors' : 'same-origin' })).catch(() => {})))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('openfoodfacts.org')) return; // barcode lookups always go to the network
  if (req.mode === 'navigate') {
    // page: try the network first so updates show up, fall back to the cached copy offline
    e.respondWith(fetch(req).then(r => { caches.open(VERSION).then(c => c.put('./index.html', r.clone())); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // scripts, icons: cached copy first, network otherwise
  e.respondWith(caches.match(req, { ignoreVary: true }).then(hit => hit || fetch(req).then(r => {
    const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r;
  })));
});

const CACHE = 'natugestao-cloud-v3';
const ASSETS = ['./','./index.html','./styles.css','./cloud-store.js','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('natugestao-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.location.href).pathname)) return;
  e.respondWith(fetch(e.request).then(response => {
    if (response.ok) { const copy = response.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy))); }
    return response;
  }).catch(async () => (await caches.match(e.request)) || (e.request.mode === 'navigate' ? await caches.match('./index.html') : Response.error())));
});

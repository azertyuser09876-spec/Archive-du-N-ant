/* Service worker : le jeu reste jouable hors ligne une fois installé (1.6).
   À l'installation, il lit index.html et met en cache tout ce que la page
   charge (scripts, styles, icônes). Ensuite : réponse immédiate depuis le
   cache, et mise à jour discrète en arrière-plan (la nouvelle version du jeu
   est servie à la visite suivante). Ne fonctionne qu'en ligne (https),
   pas en ouvrant index.html directement depuis le disque. */
const CACHE = 'archive-du-neant-1.13.0';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = new Set(['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png']);
    try {
      const res = await fetch('./index.html', { cache: 'no-cache' });
      const html = await res.text();
      html.replace(/(?:src|href)="([^"#:]+)"/g, (m, u) => { urls.add('./' + u.replace(/^\.\//, '')); return m; });
    } catch (e) { /* hors ligne pendant l'installation : on garde l'essentiel */ }
    await Promise.all([...urls].map((u) => cache.add(new Request(u, { cache: 'no-cache' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('archive-du-neant-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // le mod de triche (dossier mods, jamais publié) n'est pas gardé en cache : le supprimer suffit
  if (new URL(req.url).pathname.includes('/mods/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const nav = req.mode === 'navigate';
    const cached = await cache.match(nav ? './index.html' : req, { ignoreSearch: true });
    const update = fetch(req).then((res) => {
      if (res && res.ok) cache.put(nav ? './index.html' : req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(update); return cached; }
    const res = await update;
    return res || new Response('Hors ligne', { status: 503, statusText: 'Hors ligne' });
  })());
});

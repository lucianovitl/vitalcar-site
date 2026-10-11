// ============================================================
//  VITALCAR ADMIN · SERVICE WORKER
//  Escopo: /admin/ — só intercepta páginas do painel
//  Cache do shell + suporte offline do painel
// ============================================================

const CACHE_NAME = 'vitalcar-admin-v10';
const RUNTIME_CACHE = 'vitalcar-admin-runtime-v10';

// Shell do admin — tudo sob /admin/
const SHELL_ASSETS = [
  '/admin/',
  '/admin/index.html',
  '/admin/manifest.json'
];

// Bibliotecas externas em cache (CDN)
const CDN_ASSETS = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

// APIs que NUNCA devem ser cacheadas (dados dinâmicos)
const NEVER_CACHE = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com'
];

// ============================================================
//  INSTALL
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando…');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of SHELL_ASSETS) {
        try { await cache.add(url); console.log('[SW] cache:', url); }
        catch (err) { console.warn('[SW] falha:', url, err); }
      }
      for (const url of CDN_ASSETS) {
        try { await cache.add(new Request(url, { mode: 'cors' })); console.log('[SW] cache CDN:', url); }
        catch (err) { console.warn('[SW] falha CDN:', url, err); }
      }
    }).then(() => self.skipWaiting())
  );
});

// ============================================================
//  ACTIVATE
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando…');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== RUNTIME_CACHE)
          .map((n) => { console.log('[SW] removendo cache antigo:', n); return caches.delete(n); })
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
//  FETCH
// ============================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Não-GET: deixa passar
  if (req.method !== 'GET') return;

  // APIs Firebase: network-only
  if (NEVER_CACHE.some(domain => url.hostname.includes(domain))) return;

  // Navegação dentro do admin
  if (req.mode === 'navigate') {
    const isAdminPath = url.pathname === '/admin/' ||
                        url.pathname === '/admin' ||
                        url.pathname.startsWith('/admin/');

    // Se não é admin, esse SW não deveria estar interceptando (scope já cobre isso,
    // mas por segurança ignoramos)
    if (!isAdminPath) return;

    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/admin/index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches.match('/admin/index.html').then(cached => cached || caches.match('/admin/'))
        )
    );
    return;
  }

  // Assets same-origin sob /admin/
  if (url.origin === self.location.origin) {
    if (!url.pathname.startsWith('/admin/')) {
      // Deixa o navegador cuidar de assets fora do admin
      return;
    }
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // CDNs externos
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});

// ============================================================
//  MESSAGE
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
  }
});

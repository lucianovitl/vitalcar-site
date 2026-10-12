// ============================================================
//  VITALCAR SAAS — SERVICE WORKER (Next.js compatible)
//  Escopo: /dashboard/  — NÃO intercepta rotas dinâmicas Next.js
//  Cacheia apenas assets estáticos; rotas App Router ficam na rede.
// ============================================================

const VERSION = 'v1';
const CACHE_STATIC = 'vitalcar-saas-static-' + VERSION;
const CACHE_RUNTIME = 'vitalcar-saas-runtime-' + VERSION;

const STATIC_ASSETS = [
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico'
];

// Rotas Next.js que NUNCA devem ser cacheadas (sempre dinâmicas)
const DYNAMIC_ROUTES = [
  '/dashboard/ordens',
  '/dashboard/agendamentos',
  '/dashboard/clientes',
  '/dashboard/financeiro',
  '/dashboard/relatorios',
  '/dashboard/configuracoes',
  '/api/',
  '/_next/',
  '/_vercel/'
];

const NEVER_CACHE_DOMAINS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com'
];

const isDynamicRoute = (pathname) => {
  return DYNAMIC_ROUTES.some(route => pathname.startsWith(route));
};

const isStaticAsset = (pathname) => {
  return /\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|woff|json|map)$/i.test(pathname);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('vitalcar-saas-static-' + 'v1')
      .then((cache) => cache.addAll([
        '/dashboard',
        '/manifest.json',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/apple-touch-icon.png',
        '/favicon.ico'
      ]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('vitalcar-saas-') && !n.endsWith('-v1'))
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const pathname = url.pathname;

  // Ignora rotas dinâmicas Next.js, API e _next
  if (isDynamicRoute(pathname)) return;

  // Nunca cachear Firebase/Auth
  if (['firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'firebaseinstallations.googleapis.com']
    .some(d => url.hostname.includes(d))) return;

  // Assets estáticos: cache first
  if (isStaticAsset(pathname) || pathname === '/manifest.json') {
    event.respondWith(
      caches.open('vitalcar-saas-static-v1')
        .then((cache) => cache.match(event.request)
          .then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((res) => {
              if (res.ok) cache.put(event.request, res.clone());
              return res;
            }).catch(() => cached);
          })
        )
    );
    return;
  }

  // Página /dashboard e navegação: network first, fallback cache
  if (pathname === '/dashboard' || req.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open('vitalcar-saas-runtime-v1').then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('/dashboard').then((c) => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Outros: network first
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open('vitalcar-saas-runtime-v1').then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

function isDynamicRoute(pathname) {
  return DYNAMIC_ROUTES.some(route => pathname.startsWith(route));
}

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|woff|json|map)$/i.test(pathname);
}

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes(self.location.origin)) return c.focus(); }
      return self.clients.openWindow('/dashboard');
    })
  );
});
// ============================================================
//  VITALCAR · SERVICE WORKER DO SITE PÚBLICO
//  Escopo: /   — NUNCA intercepta /admin/*
//  v3: precache paralelo com timeout por requisição (install
//  nunca trava em rede lenta), mídia pesada fora do cache.
// ============================================================

const VERSION        = 'v23';
const CACHE_SHELL    = 'vitalcar-shell-' + VERSION;
const CACHE_RUNTIME  = 'vitalcar-runtime-' + VERSION;
const PRECACHE_TIMEOUT = 8000;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/privacidade.html',
  '/scripts/quote.js',
  '/studio.css',
  '/scripts/studio.js',
  '/showroom.css',
  '/scripts/car-3d.js',
  '/scripts/showroom.js',
  '/manifest.json',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/img/apple-touch-icon.png',
  '/img/favicon-32.png'
];

// Domínios que nunca devem ser cacheados (dados dinâmicos)
const NEVER_CACHE = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com'
];

// Streaming/vídeo nunca entra no Cache Storage: respostas 206 parciais
// quebrariam o playback offline e comeriam a cota inteira de dados.
const MEDIA_EXT = /\.(mp4|webm|mov|m4v|avi|mp3|wav|ogg|flac)(\?|#|$)/i;

// Imagens/fontes são imutáveis na prática: servir do cache sem
// revalidar em segundo plano (zero tráfego extra em dados móveis).
const IMUTAVEL_EXT = /\.(jpe?g|webp|png|gif|svg|ico|woff2?|ttf|otf)(\?|#|$)/i;

function fetchComTimeout(url, ms) {
  return new Promise(function (resolve, reject) {
    var ctrl = ('AbortController' in self) ? new AbortController() : null;
    var t = setTimeout(function () {
      if (ctrl) ctrl.abort();
      reject(new Error('timeout'));
    }, ms);
    var opts = { cache: 'no-cache' };
    if (ctrl) opts.signal = ctrl.signal;
    fetch(new Request(url, { cache: 'no-cache' }), opts)
      .then(function (r) { clearTimeout(t); resolve(r); })
      .catch(function (e) { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('install', (event) => {
  // Precache em paralelo via allSettled: o install SEMPRE conclui,
  // com ou sem rede. Quem faltar entra depois pelo cache de runtime.
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then((cache) =>
        Promise.allSettled(
          SHELL_ASSETS.map((url) =>
            fetchComTimeout(url, PRECACHE_TIMEOUT).then((res) => {
              if (res && res.ok) return cache.put(url, res);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n !== CACHE_SHELL && n !== CACHE_RUNTIME)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // O painel administrativo cuida do próprio cache — não tocar.
  if (url.origin === self.location.origin && url.pathname.startsWith('/admin')) return;

  // Nunca cachear tráfego do Firestore/Auth.
  if (NEVER_CACHE.some((d) => url.hostname.includes(d))) return;

  // Mídia e requisições de range: rede direta, sem tocar no cache.
  if (req.headers.has('range') || MEDIA_EXT.test(url.pathname)) return;

  // Navegação: rede primeiro, cache como reserva offline.
  if (req.mode === 'navigate') {
    const pageKey = /^\/privacidade(?:\.html)?\/?$/.test(url.pathname)
      ? '/privacidade.html' : '/index.html';
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Só armazena como shell quando a rota é a raiz — outras páginas
          // (/teste, etc.) não podem envenenar o cache da home.
          if (res && res.ok && (url.pathname === '/' || url.pathname === '/index.html' || pageKey === '/privacidade.html')) {
            const copy = res.clone();
            caches.open(CACHE_SHELL).then((c) => c.put(pageKey, copy));
          }
          return res;
        })
        .catch(() => caches.match(pageKey).then((c) => c || (pageKey === '/index.html'
          ? caches.match('/')
          : new Response('Aviso de privacidade indisponível offline. Conecte-se e tente novamente.', {
              status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            }))))
    );
    return;
  }

  // Estáticos same-origin.
  if (url.origin === self.location.origin) {
    const imutavel = IMUTAVEL_EXT.test(url.pathname);
    event.respondWith(
      caches.open(CACHE_RUNTIME).then((cache) =>
        cache.match(req).then((cached) => {
          // Imagem/fonte já cacheada: entrega direto, sem refetch.
          if (imutavel && cached) return cached;
          const rede = fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || rede;
        })
      )
    );
    return;
  }

  // CDNs externos (fontes, AOS, YouTube): cache primeiro, rede como reserva.
  event.respondWith(
    caches.open(CACHE_RUNTIME).then((cache) =>
      cache.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
            cache.put(req, res.clone());
          }
          return res;
        }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    )
  );
});

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
      return self.clients.openWindow('/');
    })
  );
});

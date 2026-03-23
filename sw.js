// ACS Neto — sw.js
// Service Worker: cache offline dos assets estáticos.
// Estratégia: Cache-First para assets, Network-First para o index.html.
//
// Versionamento: incrementar CACHE_VERSION a cada deploy para invalidar
// o cache antigo e forçar o browser a baixar os novos assets.

const CACHE_VERSION = 'acs-v4'; // ↑ bump: reorganização icones/ + correção z-index modais
const CACHE_STATIC  = CACHE_VERSION + '-static';

// Assets que serão pré-cacheados na instalação do SW.
// Inclua aqui todos os arquivos necessários para o app funcionar offline.
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './styles-tablet.css',
  './crypto.js',
  './auth.js',
  './app-core.js',
  './app-config.js',
  './app-ui.js',
  './app-render.js',
  './app-crud.js',
  './app-utils.js',
  './app-fichas.js',
  './app-export.js',
  './app-import.js',
  './app-medicamentos.js',
  './app-metas.js',
  './app-municipio.js',
  './app-vacinas.js',
  './visita-individual.js',
  './personalizacao.js',
  './icones/login/login.png',
  './icones/login/logo.png',
  './icones/icons.json',
];

// ── Instalação: pré-cacheia todos os assets estáticos ────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Ativação: remove caches de versões anteriores ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('acs-') && k !== CACHE_STATIC)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-First para assets, Network-First para index.html ─────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requisições não-GET e cross-origin (ex: CDN externo)
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Network-First para o documento principal: garante conteúdo atualizado
  // quando online, mas cai no cache se offline.
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First para todos os outros assets (.js, .css, ícones etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_STATIC).then(c => c.put(event.request, clone));
        return response;
      }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});

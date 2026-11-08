/**
 * ClipForge PWA Service Worker (Workbox-compatible offline engine)
 * Version: 1.0.0
 * Features:
 * - Precache application shell
 * - Cache-first runtime for FFmpeg core, Whisper models, Google Fonts, and video assets
 * - Enforces Cross-Origin Isolation (COOP / COEP / CORP) headers on cached responses
 * - Graceful updates: listens for SKIP_WAITING message
 */

const SW_VERSION = '1.0.0';
const CACHE_SHELL = `clipforge-shell-${SW_VERSION}`;
const CACHE_RUNTIME = `clipforge-runtime-${SW_VERSION}`;
const CACHE_ASSETS = `clipforge-assets-${SW_VERSION}`;

// Application shell assets to precache on install
const PRECACHE_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/registry/index.json',
  '/registry/packages/official.glitch-pack.capfx'
];

/**
 * Re-inject Cross-Origin Isolation & Security headers on intercepted responses
 * Critical for FFmpeg.wasm SharedArrayBuffer and WebCodecs operation offline!
 */
function withIsolationHeaders(response) {
  if (!response) {
    return new Response('Not Found', { status: 404 });
  }
  if (response.type === 'opaque') {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

// 1. INSTALL: Precache static app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => {
      return cache.addAll(PRECACHE_SHELL_URLS).catch((err) => {
        console.warn('[SW] Non-fatal precache warning:', err);
      });
    })
  );
});

// 2. ACTIVATE: Purge obsolete version caches and claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_SHELL, CACHE_RUNTIME, CACHE_ASSETS];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!currentCaches.includes(key) && key.startsWith('clipforge-')) {
            console.log('[SW] Evicting outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. MESSAGE: Controlled update triggering
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. FETCH: Intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and non-http(s) schemes (e.g. chrome-extension://)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. STRATEGY: Cache-First for Heavy AI Models & FFmpeg Core
  // FFmpeg WASM, ONNX Runtime, Whisper weights, and CDN bundles
  const isFFmpegOrAiModel =
    url.hostname.includes('ffmpeg') ||
    url.pathname.includes('ffmpeg-core') ||
    url.hostname.includes('huggingface.co') ||
    url.pathname.includes('onnx') ||
    url.pathname.includes('transformers');

  if (isFFmpegOrAiModel) {
    event.respondWith(
      caches.open(CACHE_RUNTIME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return withIsolationHeaders(cached);
        }
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return withIsolationHeaders(networkResponse);
        } catch {
          return cached || new Response('Network offline and asset not in cache', { status: 503 });
        }
      })
    );
    return;
  }

  // B. STRATEGY: Stale-While-Revalidate for Registry Index & Dynamic Packs (.capfx)
  const isRegistryOrPack =
    url.pathname.startsWith('/registry/') ||
    url.pathname.startsWith('/packs/') ||
    url.pathname.endsWith('.capfx');

  if (isRegistryOrPack) {
    event.respondWith(
      caches.open(CACHE_ASSETS).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return withIsolationHeaders(networkResponse);
          })
          .catch(() => cached || new Response('Offline registry asset missing', { status: 503 }));

        return cached ? withIsolationHeaders(cached) : fetchPromise;
      })
    );
    return;
  }

  // C. STRATEGY: Cache-First for Fonts, Icons, and Media Assets
  const isFontOrAsset =
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.cube') ||
    url.pathname.endsWith('.svg');

  if (isFontOrAsset) {
    event.respondWith(
      caches.open(CACHE_ASSETS).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return withIsolationHeaders(cached);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return withIsolationHeaders(networkResponse);
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // C. STRATEGY: Network-First with Cache Fallback for Application JS/CSS & Navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return withIsolationHeaders(networkResponse);
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return withIsolationHeaders(cached);
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return withIsolationHeaders(cachedIndex);
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        })
    );
    return;
  }

  // D. DEFAULT: Stale-While-Revalidate for bundled assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return withIsolationHeaders(networkResponse);
        })
        .catch(() => cachedResponse || new Response('Offline', { status: 503 }));

      return cachedResponse ? withIsolationHeaders(cachedResponse) : fetchPromise;
    })
  );
});


// Service worker de la PWA móvil (Fase 11). Alcance deliberadamente angosto:
// solo hace posible que la app ABRA sin conexión (app shell + fallback); los
// DATOS offline (OT asignadas, checklist, cola de sincronización) viven en
// IndexedDB vía Dexie (src/lib/movil/db.ts), no en la caché de este SW.
const CACHE = 'gmao-movil-v1';
const APP_SHELL = ['/movil/mis-ordenes', '/movil/offline', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // Server Actions (POST) nunca se cachean: la cola offline las maneja la app.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación (abrir/recargar una página): red primero, caché como respaldo,
  // y si tampoco hay caché, la página de "sin conexión".
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
          return respuesta;
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match('/movil/offline'))),
    );
    return;
  }

  // Estáticos (JS/CSS/íconos): caché primero, red de respaldo.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cacheada) =>
          cacheada ??
          fetch(request).then((respuesta) => {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copia));
            return respuesta;
          }),
      ),
    );
  }
});

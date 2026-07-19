const CACHE_VERSION = "wd-pos-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const STATIC_ASSETS = [
  "/",
  "/logo-icon.jpg",
  "/logo-full.jpg",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
];

function isUnsafeRequest(request, url) {
  return (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/manager") ||
    url.pathname.startsWith("/owner") ||
    url.pathname.startsWith("/kasir") ||
    url.pathname.startsWith("/kitchen") ||
    url.pathname.startsWith("/inventory")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin || isUnsafeRequest(event.request, url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-icon-") || url.pathname === "/logo-icon.jpg") {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fresh = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const cacheKey = event.request;
              cache.put(cacheKey, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || fresh;
      }),
    );
    return;
  }

  event.respondWith(fetch(event.request));
});

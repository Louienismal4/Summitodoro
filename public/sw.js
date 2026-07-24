/* global self, caches */

const VERSION = "v1";
const APP_CACHE = `summitodoro-app-${VERSION}`;
const MAP_CACHE = `summitodoro-map-${VERSION}`;
const RUNTIME_CACHE = `summitodoro-runtime-${VERSION}`;
const CACHE_NAMES = [APP_CACHE, MAP_CACHE, RUNTIME_CACHE];

const CORE_ASSETS = [
  "/",
  "/hike",
  "/data/trails/mt-pinatubo-osm-v1.geojson",
  "/data/trails/mt-pulag-osm-v1.geojson",
  "/data/trails/mt-ulap-osm-v1.geojson",
  "/summitodoro-logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) =>
        Promise.all(
          CORE_ASSETS.map((asset) => cache.add(asset).catch(() => undefined)),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith("summitodoro-") && !CACHE_NAMES.includes(name),
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(cacheName, maximumEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .slice(0, Math.max(0, keys.length - maximumEntries))
      .map((request) => cache.delete(request)),
  );
}

async function cacheFirst(request, cacheName, maximumEntries) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    void trimCache(cacheName, maximumEntries);
  }
  return response;
}

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(request)) ??
      (await caches.match("/hike")) ??
      (await caches.match("/")) ??
      new Response("Summitodoro is offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (url.hostname === "tiles.openfreemap.org") {
    event.respondWith(cacheFirst(request, MAP_CACHE, 220));
    return;
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/data/trails/") ||
      url.pathname.startsWith("/images/mountains/") ||
      url.pathname === "/summitodoro-logo.svg")
  ) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE, 120));
  }
});

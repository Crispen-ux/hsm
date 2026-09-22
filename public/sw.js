const VERSION = "hawk-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];
const NETWORK_TIMEOUT_MS = 5000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

function isDashboardNavigation(request, url) {
  return request.mode === "navigate" && (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/"));
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });

  const network = fetch(request).then(async (response) => {
    const type = response.headers.get("content-type") || "";
    if (response.ok && !response.redirected && type.includes("text/html")) {
      await cache.put(request, response.clone());
    }
    return response;
  });

  try {
    return cached ? await withTimeout(network, NETWORK_TIMEOUT_MS) : await network;
  } catch (error) {
    network.catch(() => undefined);
    if (cached) {
      return cached;
    }
    const offline = await caches.match("/offline");
    return offline || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (isDashboardNavigation(request, url)) {
    event.respondWith(networkFirstPage(request));
  }
});

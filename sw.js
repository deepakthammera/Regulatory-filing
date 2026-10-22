// sw.js — service worker that makes the app installable and usable offline.
//
// Strategy:
//   - The page itself (index.html) and news.json: network first, so updates show up as
//     soon as you are online; the last cached copy is used when offline.
//   - Icons and the manifest: cache first (they rarely change).
//   - Google Fonts and the pinned Supabase SDK on cdn.jsdelivr.net: cached after first
//     use, refreshed in the background.
//   - Everything else (including Supabase API calls for sign-in and saved data) is left
//     alone and always goes to the network.
//
// Bump CACHE_VERSION when you change this file's precache list or strategy; old caches
// are deleted when the new worker activates.

const CACHE_VERSION = "v1";
const CACHE = "rt-app-" + CACHE_VERSION;

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./news.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

const RUNTIME_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Cache each file separately so one missing file doesn't block installation.
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("rt-app-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    const isPage = req.mode === "navigate" || url.pathname.endsWith("/index.html");
    if (isPage) {
      event.respondWith(networkFirst(req, "./index.html"));
    } else if (url.pathname.endsWith("/news.json")) {
      event.respondWith(networkFirst(req, "./news.json"));
    } else {
      event.respondWith(cacheFirst(req));
    }
    return;
  }

  if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// Network first with a timeout; falls back to the cached copy (or `fallbackUrl`).
async function networkFirst(req, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(req), NETWORK_TIMEOUT_MS);
    if (res && res.ok) cache.put(fallbackUrl, res.clone());
    return res;
  } catch (e) {
    const cached = (await cache.match(req, { ignoreSearch: true })) || (await cache.match(fallbackUrl));
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      // Opaque (no-cors) responses have status 0 but are still usable from cache.
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

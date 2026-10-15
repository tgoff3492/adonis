// Adonis offline cache. Bump VERSION whenever you upload a new index.html.
const VERSION = "adonis-v15";
const CORE = ["./", "index.html", "engine.js", "nutrition.js", "meals.js", "foods.js", "coach.js", "vendor/zxing.min.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // food lookups always go to the network (the app keeps its own copy of what you've scanned)
  if (new URL(req.url).hostname.endsWith("openfoodfacts.org")) return;
  if (req.mode === "navigate") {
    // Network first for the page so updates show up; fall back to cache offline.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  // Cache first for icons and fonts.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});

// Adonis offline cache. Bump VERSION whenever you upload a new index.html.
const VERSION = "adonis-v42";
const CORE = ["./", "index.html", "engine.js", "nutrition.js", "meals.js", "foods.js", "coach.js", "videos.js", "demos.js", "firebase-config.js", "vendor/firebase.js", "cloud.js", "vendor/zxing.min.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => {
  // cache: "reload" skips the browser's own HTTP cache, so a new version never gets filled with yesterday's files
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // sign-in and account sync talk straight to Firebase/Google and are never cached
  if (/(^|\.)(googleapis\.com|firebaseapp\.com|firebaseio\.com|gstatic\.com)$/.test(new URL(req.url).hostname)) return;
  // food lookups always go to the network (the app keeps its own copy of what you've scanned)
  if (new URL(req.url).hostname.endsWith("openfoodfacts.org")) return;
  // exercise clips stream straight from the site (iPhone asks for them in pieces); offline, the drawn demo shows instead
  if (new URL(req.url).pathname.includes("/videos/")) return;
  if (req.mode === "navigate") {
    // Network first for the page so updates show up; fall back to cache offline.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  // The app's own code and data: network first, so an update shows up on the next open; the saved copy is only for offline.
  const url = new URL(req.url);
  if (url.origin === self.location.origin && /\.(js|json|webmanifest)$/.test(url.pathname)) {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => caches.match(req)));
    return;
  }
  // Cache first for icons and fonts.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});

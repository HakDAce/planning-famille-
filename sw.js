// Service worker : version à jour quand il y a du réseau, cache hors ligne.
// Les données Firestore ne passent pas par ici (Firebase gère son propre cache hors ligne).
const CACHE = "planning-v3";
const SHELL = ["./", "index.html", "style.css", "app.js", "config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("planning-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const external = url =>
  url.href.startsWith("https://www.gstatic.com/firebasejs/") ||
  url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request.url, { cache: "no-cache" })
        .then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
    );
    return;
  }
  if (external(url)) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      const res = await fetch(e.request);
      if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone());
      return res;
    }));
  }
});

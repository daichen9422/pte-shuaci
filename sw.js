// 离线缓存：先用缓存秒开，同时后台拉新版本，下次打开生效
const CACHE = "pte-shuaci-1793533568";
const CORE = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "data/words.json", "data/posts/index.json", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok && (r.type === "basic" || r.type === "cors")) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

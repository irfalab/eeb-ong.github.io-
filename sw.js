// Service worker EEB-ONG : permet l'installation et l'ouverture sans connexion.
// Changez VERSION à chaque mise à jour du site pour forcer le renouvellement du cache.
const VERSION = "eeb-v5";
const COEUR = ["./", "index.html", "connexion.html", "accueil.html", "app.js", "firebase-init.js", "manifest.json",
  "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(COEUR).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Les appels aux API Firebase (données, connexion) ne passent jamais par le cache du service worker
  if (/googleapis\.com|firebaseio\.com|identitytoolkit|securetoken/.test(url.hostname)) return;
  if (url.origin === location.origin) {
    // Pages et scripts du site : réseau d'abord (toujours la dernière version), cache si hors connexion
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copie = r.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      return r;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
  } else if (/gstatic\.com|cdnjs|jsdelivr|fonts\./.test(url.hostname)) {
    // Bibliothèques et polices (versions figées) : cache d'abord
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => {
      if (n.ok || n.type === "opaque") { const copie = n.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      return n;
    })));
  }
});

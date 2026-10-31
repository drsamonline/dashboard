/* drsamonline console — a tiny service worker. Shell is cache-first, data is
   network-first (so the console installs and still opens offline). */
var C = "dc-v1";
var SHELL = ["./", "./index.html", "./repo.html", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== "GET") return;
  var isData = /\.(json|xml)$/.test(u.pathname);
  if (isData) {
    // network-first, fall back to cache
    e.respondWith(fetch(e.request).then(function (res) {
      var cl = res.clone(); caches.open(C).then(function (c) { c.put(e.request, cl); }); return res;
    }).catch(function () { return caches.match(e.request); }));
  } else {
    // cache-first for the shell
    e.respondWith(caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (res) {
        var cl = res.clone(); caches.open(C).then(function (c) { c.put(e.request, cl); }); return res;
      });
    }));
  }
});

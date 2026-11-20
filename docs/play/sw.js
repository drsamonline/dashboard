/* drsamonline console — a tiny service worker. Shell assets are cache-first, the
   page itself and the data are network-first (so the console installs, always
   shows the current build, and still opens offline).

   2026-11-20: the page used to be cache-first like the rest of the shell, with a
   fixed cache name. A reader who had opened the console once kept the OLD
   index.html until the cache name changed — so a fix could ship, deploy and pass
   CI while that reader still clicked links to pages deleted weeks earlier and got
   a 404. Navigations are now network-first with the cache as the offline
   fallback, and C is bumped so existing caches are replaced. */
var C = "dc-v3";
// repo.html was deleted in the 2026-11-05 page audit. cache.addAll() rejects the
// WHOLE list if one entry 404s, so its presence did not mean "no offline copy of
// that page" - it meant the service worker never installed at all.
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
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
  var isPage = e.request.mode === "navigate" || /\/(index\.html)?$/.test(u.pathname);
  if (isData || isPage) {
    // network-first, fall back to cache (the offline copy)
    e.respondWith(fetch(e.request).then(function (res) {
      // only a real page goes in the cache - a 404 stored here would become the
      // offline copy and outlive the outage that produced it
      if (res && res.ok) { var cl = res.clone(); caches.open(C).then(function (c) { c.put(e.request, cl); }); }
      return res;
    }).catch(function () { return caches.match(e.request); }));
  } else {
    // cache-first for the shell
    e.respondWith(caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (res) {
        if (res && res.ok) { var cl = res.clone(); caches.open(C).then(function (c) { c.put(e.request, cl); }); }
        return res;
      });
    }));
  }
});

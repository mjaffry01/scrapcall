// ScrapCall service worker: lets the customer, collector and director apps open with no signal.
// Change CACHE to "scrapcall-v20" (and so on) whenever you update any app file.
var CACHE = "scrapcall-v19";
var SHELL = [
  "./", "index.html", "collector", "director", "collector.html", "director.html",
  "common.css", "common.js", "config.js",
  "leaflet.js", "leaflet.css", "map.js", "map.css", "route.js", "dispatch.js", "icons.js",
  "manifest.webmanifest", "collector.webmanifest", "director.webmanifest",
  "icon-192.png", "icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(req, fallbackKey) {
  // "no-cache" asks GitHub whether the page changed, instead of using the browser's 10-minute copy
  return fetch(req, { cache: "no-cache" }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) {
      return r || (fallbackKey ? caches.match(fallbackKey) : undefined);
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Never cache calls to the Google Sheet backend
  if (/script\.google\.com$|googleusercontent\.com$/.test(url.hostname)) return;

  // Map pictures and address searches come straight from OpenStreetMap; saving them would slowly fill the phone
  if (/(^|\.)openstreetmap\.org$/.test(url.hostname)) return;

  // Opening any of the apps: network first so updates arrive, saved copy when offline
  // Opening the collector or director app offline falls back to that app, not the customer page
  if (req.mode === "navigate") {
    var app = /\/(collector|director)(\.html)?$/.exec(url.pathname);
    e.respondWith(networkFirst(req, app ? app[1] : "index.html"));
    return;
  }

  // The settings file holds your Google link, so always try the network first
  if (/\/config\.js$/.test(url.pathname)) { e.respondWith(networkFirst(req)); return; }

  // Everything else (styles, scripts, fonts, icons): saved copy first, refreshed in the background
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});

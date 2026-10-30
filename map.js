/* ScrapCall map helper: Leaflet + OpenStreetMap (free, no account needed) */
(function (w) {
  var M = w.SCMap = {};
  var CKEY = "scrapcall_map_center";

  M.ok = function () { return typeof w.L !== "undefined" && !!w.L.map; };
  M.valid = function (lat, lng) {
    return lat !== "" && lng !== "" && lat != null && lng != null && isFinite(lat) && isFinite(lng) &&
      Math.abs(+lat) <= 90 && Math.abs(+lng) <= 180 && !(+lat === 0 && +lng === 0);
  };
  M.round = function (n) { return Math.round(+n * 1e6) / 1e6; };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  M.esc = esc;

  function lastCenter() {
    try { var c = JSON.parse(localStorage.getItem(CKEY)); if (c && M.valid(c.lat, c.lng)) return c; } catch (e) {}
    return { lat: 20, lng: 0, zoom: 2 };
  }
  function saveCenter(map) {
    try { var c = map.getCenter(); if (map.getZoom() >= 8) localStorage.setItem(CKEY, JSON.stringify({ lat: M.round(c.lat), lng: M.round(c.lng), zoom: map.getZoom() })); } catch (e) {}
  }

  M.offNote = function (el, msg) {
    el.innerHTML = '<div class="map-off">' + esc(msg || "The map needs an internet connection. Everything else still works.") + "</div>";
  };

  // A map with OpenStreetMap tiles. Returns null if Leaflet isn't available.
  M.create = function (el, opts) {
    opts = opts || {};
    if (!M.ok() || !el) return null;
    el.innerHTML = "";
    var c = opts.center || lastCenter();
    var map = w.L.map(el, { attributionControl: false, scrollWheelZoom: opts.scrollWheel !== false })
      .setView([c.lat, c.lng], c.zoom || 16);
    w.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    w.L.control.attribution({ prefix: '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>' })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors').addTo(map);
    map.on("moveend", function () { saveCenter(map); });
    return map;
  };

  M.pinIcon = function (label, cls) {
    return w.L.divIcon({ className: "sc-pin " + (cls || ""), html: "<span>" + esc(label) + "</span>", iconSize: [40, 28], iconAnchor: [20, 14], popupAnchor: [0, -14] });
  };

  // A map where the person can tap or drag a single pin.
  // opts: lat, lng, onChange(lat, lng)
  M.picker = function (el, opts) {
    opts = opts || {};
    var has = M.valid(opts.lat, opts.lng);
    var map = M.create(el, { center: has ? { lat: +opts.lat, lng: +opts.lng, zoom: 17 } : null });
    if (!map) return null;
    var marker = null, cb = opts.onChange || function () {};
    function place(lat, lng, fly) {
      lat = +lat; lng = +lng;
      if (marker) marker.setLatLng([lat, lng]);
      else {
        marker = w.L.marker([lat, lng], { draggable: true, icon: M.pinIcon("", "p-set") }).addTo(map);
        marker.on("dragend", function () { var p = marker.getLatLng(); cb(M.round(p.lat), M.round(p.lng), "drag"); });
      }
      if (fly) map.setView([lat, lng], Math.max(map.getZoom(), 17));
    }
    map.on("click", function (e) { place(e.latlng.lat, e.latlng.lng, false); cb(M.round(e.latlng.lat), M.round(e.latlng.lng), "click"); });
    if (has) place(opts.lat, opts.lng, true);
    return {
      map: map,
      set: function (lat, lng) { place(lat, lng, true); },
      clear: function () { if (marker) { map.removeLayer(marker); marker = null; } },
      invalidate: function () { map.invalidateSize(); }
    };
  };

  // Address search with OpenStreetMap's free Nominatim service (fair use: one search at a time, only when asked)
  var lastCall = 0;
  function throttled(fn) {
    var wait = Math.max(0, 1100 - (Date.now() - lastCall));
    return new Promise(function (res) { setTimeout(function () { lastCall = Date.now(); res(fn()); }, wait); });
  }
  M.geocode = function (q) {
    q = String(q || "").trim();
    if (q.length < 3) return Promise.resolve([]);
    return throttled(function () {
      return fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=" + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (a) { return a.map(function (x) { return { name: x.display_name, lat: M.round(x.lat), lng: M.round(x.lon) }; }); });
    });
  };
  M.reverse = function (lat, lng) {
    return throttled(function () {
      return fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lng)
        .then(function (r) { return r.json(); })
        .then(function (x) { return (x && x.display_name) || ""; });
    }).catch(function () { return ""; });
  };

  M.locate = function () {
    return new Promise(function (res, rej) {
      if (!navigator.geolocation) return rej(new Error("unavailable"));
      navigator.geolocation.getCurrentPosition(function (p) { res({ lat: M.round(p.coords.latitude), lng: M.round(p.coords.longitude) }); },
        function (e) { rej(e); }, { timeout: 10000, enableHighAccuracy: true });
    });
  };

  // Shows up to 5 search results as buttons inside `box`; onPick(result) when one is chosen
  M.showResults = function (box, results, onPick) {
    if (!results.length) { box.innerHTML = '<p class="map-note">Nothing found. Try a nearby street, area or landmark.</p>'; return; }
    box.innerHTML = '<ul class="map-results">' + results.map(function (r, i) { return '<li><button type="button" data-i="' + i + '">' + esc(r.name) + "</button></li>"; }).join("") + "</ul>";
    Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () { box.innerHTML = ""; onPick(results[+b.dataset.i]); });
    });
  };

  // Free directions link that opens the phone's maps app
  M.dirHref = function (j) {
    var dest = M.valid(j.lat, j.lng) ? j.lat + "," + j.lng : j.addr;
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(dest);
  };
  M.viewHref = function (j) {
    var q = M.valid(j.lat, j.lng) ? j.lat + "," + j.lng : j.addr;
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  };
})(window);

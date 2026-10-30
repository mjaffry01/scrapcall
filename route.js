/* ScrapCall routing: road distances, drive times, stop order and route lines.
 *
 * Uses a free OpenStreetMap-based routing service (OSRM). It is meant for light use, so results are cached,
 * requests are batched, and every function falls back to a straight-line estimate (x1.35 for roads) if the
 * service cannot be reached. No traffic information is included.
 *
 * To use your own routing server later, add this line to config.js:
 *     window.SCRAPCALL_ROUTING = "https://your-osrm-server/routed-car";
 */
(function (w) {
  var R = w.SCRoute = {};
  R.BASE = String(w.SCRAPCALL_ROUTING || "https://routing.openstreetmap.de/routed-car").replace(/\/+$/, "");
  R.DETOUR = 1.35;        // roads are longer than straight lines
  R.SPEED_KMH = 28;       // average city speed used for estimates
  R.MAX_POINTS = 60;      // size limit for one distance table
  var rad = Math.PI / 180;

  R.km = function (a, b) {
    var dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  R.estimate = function (a, b) {
    var k = R.km(a, b) * R.DETOUR;
    return { km: k, min: k / R.SPEED_KMH * 60, road: false };
  };
  function snap(p) { return [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4]; }
  R.key = function (p) { var s = snap(p); return s[0].toFixed(4) + "," + s[1].toFixed(4); };
  function lnglat(p) { return p[1] + "," + p[0]; }

  // ---- fetching, with a cache and a time limit
  var cache = {}, inflight = {};
  function getJson(url) {
    var hit = cache[url];
    if (hit && Date.now() - hit.at < 600000) return Promise.resolve(hit.v);
    if (inflight[url]) return inflight[url];
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, 9000) : null;
    var p = fetch(url, ctl ? { signal: ctl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error("routing " + r.status); return r.json(); })
      .then(function (j) { if (!j || j.code !== "Ok") throw new Error("routing " + (j && j.code)); cache[url] = { at: Date.now(), v: j }; return j; })
      .then(function (j) { clearTimeout(t); delete inflight[url]; return j; },
            function (e) { clearTimeout(t); delete inflight[url]; throw e; });
    inflight[url] = p;
    return p;
  }

  // One call gives the road distance and time between every pair of points.
  // Resolves to a function dist(a, b) -> {km, min, road}. dist.live is true when real road data was used.
  R.matrix = function (points) {
    var seen = {}, pts = [];
    points.forEach(function (p) { var k = R.key(p); if (seen[k] === undefined) { seen[k] = pts.length; pts.push(snap(p)); } });
    pts = pts.slice(0, R.MAX_POINTS);
    var fallback = function (a, b) { return R.estimate(a, b); };
    fallback.live = false;
    if (pts.length < 2) return Promise.resolve(fallback);
    var url = R.BASE + "/table/v1/driving/" + pts.map(lnglat).join(";") + "?annotations=duration,distance";
    return getJson(url).then(function (j) {
      var f = function (a, b) {
        var i = seen[R.key(a)], k = seen[R.key(b)];
        if (i === undefined || k === undefined || i >= pts.length || k >= pts.length) return R.estimate(a, b);
        if (i === k) return { km: 0, min: 0, road: true };
        var d = j.durations && j.durations[i] && j.durations[i][k];
        var m = j.distances && j.distances[i] && j.distances[i][k];
        if (d == null) return R.estimate(a, b);
        return { km: m != null ? m / 1000 : R.km(a, b) * R.DETOUR, min: d / 60, road: true };
      };
      f.live = true;
      return f;
    }).catch(function () { return fallback; });
  };

  // The actual road line through the points, in order. Falls back to straight pieces.
  R.route = function (points) {
    var pts = points.map(snap);
    var straight = function () {
      var legs = [], km = 0, min = 0;
      for (var i = 0; i < pts.length - 1; i++) { var e = R.estimate(pts[i], pts[i + 1]); legs.push(e); km += e.km; min += e.min; }
      return { coords: pts.slice(), km: km, min: min, legs: legs, road: false };
    };
    if (pts.length < 2) return Promise.resolve(straight());
    var url = R.BASE + "/route/v1/driving/" + pts.map(lnglat).join(";") + "?overview=full&geometries=geojson&steps=false";
    return getJson(url).then(function (j) {
      var r = j.routes && j.routes[0];
      if (!r || !r.geometry) return straight();
      return {
        coords: r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }),
        km: r.distance / 1000, min: r.duration / 60, road: true,
        legs: (r.legs || []).map(function (l) { return { km: l.distance / 1000, min: l.duration / 60, road: true }; })
      };
    }).catch(function () { return straight(); });
  };

  // Orders pickups to save driving time.
  //   start: [lat, lng] or null     stops: [{id, lat, lng, time}]     dist: (a, b) -> {km, min}
  // Pickups with an agreed time keep their time order; the others are slotted in where they add the least
  // driving. When nothing has a fixed time the order is also tidied up so the route doesn't cross itself.
  R.plan = function (start, stops, dist) {
    dist = dist || R.estimate;
    var at = function (s) { return [s.lat, s.lng]; };
    var timed = stops.filter(function (s) { return s.time; }).sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
    var free = stops.filter(function (s) { return !s.time; });
    function cost(seq) {
      var c = 0, prev = start;
      seq.forEach(function (s) { if (prev) c += dist(prev, at(s)).min; prev = at(s); });
      return c;
    }
    if (start) free.sort(function (a, b) { return dist(start, at(a)).min - dist(start, at(b)).min; });
    var seq = timed.slice();
    free.forEach(function (s) {
      var best = null, bestCost = Infinity;
      for (var i = 0; i <= seq.length; i++) {
        var t = seq.slice(); t.splice(i, 0, s);
        var c = cost(t);
        if (c < bestCost - 1e-9) { bestCost = c; best = t; }
      }
      seq = best;
    });
    if (!timed.length && seq.length > 2) {
      var improved = true, guard = 0;
      while (improved && guard++ < 50) {
        improved = false;
        for (var i = 0; i < seq.length - 1 && !improved; i++) {
          for (var j = i + 1; j < seq.length && !improved; j++) {
            var t2 = seq.slice(0, i).concat(seq.slice(i, j + 1).reverse(), seq.slice(j + 1));
            if (cost(t2) < cost(seq) - 0.01) { seq = t2; improved = true; }
          }
        }
      }
    }
    var legs = [], km = 0, min = 0, prev = start;
    seq.forEach(function (s) {
      if (prev) { var d = dist(prev, at(s)); legs.push({ id: s.id, km: d.km, min: d.min, road: !!d.road }); km += d.km; min += d.min; }
      else legs.push({ id: s.id, km: 0, min: 0, road: false, first: true });
      prev = at(s);
    });
    return { order: seq, legs: legs, km: km, min: min };
  };

  // Opens every stop, in order, in the phone's maps app (Google Maps uses the phone's own position as the start)
  R.navLink = function (stops) {
    if (!stops.length) return "";
    var last = stops[stops.length - 1], mid = stops.slice(0, -1).slice(0, 9);
    var u = "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(last.lat + "," + last.lng);
    if (mid.length) u += "&waypoints=" + encodeURIComponent(mid.map(function (s) { return s.lat + "," + s.lng; }).join("|"));
    return u;
  };

  R.fmt = function (km, min, road) {
    return (road ? "" : "about ") + (Math.round(km * 10) / 10) + " km · " + Math.max(1, Math.round(min)) + " min";
  };
})(window);

/* ScrapCall dispatch suggestions: which collector should take which pickup.
 *
 * A collector is only suggested if they are PRESENT at the time and place (and not marked unavailable):
 *   1. Time: their working days and hours (set by the director) cover the time the customer wants,
 *      and they are not already booked then.
 *        - an agreed time (e.g. 14:00) must fall inside their shift, and no other pickup within 45 minutes of it
 *        - a time slot (Morning 08-12, Afternoon 12-16, Evening 16-20) must overlap their shift by at least half,
 *          and they must have fewer than 4 pickups in that slot
 *        - collectors with no working hours set are treated as available any time
 *   2. Now: if the pickup is happening now or within the hour, they must be On duty and reporting their location
 *      (seen in the last 15 minutes). Collectors who have never reported a location (the collector app doesn't
 *      share it yet) skip this check, so suggestions rely on working hours alone.
 *   3. Place: among those, the nearest wins, by road when a road-distance function is supplied (state.dist),
 *      otherwise straight-line.
 *
 *   score = distance to the pickup (km) + 3 km for every pickup they already have that day. Lowest score wins.
 *
 * Suggestions are made for all waiting requests together: once a request is given to someone, their next
 * suggestion starts from that pickup, so nearby requests are grouped on one collector.
 */
(function (root) {
  var FRESH_SEC = 900;       // location older than this counts as "not reporting"
  var JOB_PENALTY_KM = 3;    // each pickup already that day adds this much
  var UNKNOWN_KM = 8;        // used when there is nothing to measure distance from
  var SERVICE_MIN = 30;      // an agreed time reserves this long
  var CLASH_MIN = 45;        // two agreed times closer than this clash
  var MAX_PER_SLOT = 4;      // pickups one collector can take in a time slot
  var SOON_MIN = 60;         // "happening now" window
  var NEAR_MIN = 180;        // a live position still counts as a starting point for pickups this soon
  var SLOTS = { morning: [480, 720], afternoon: [720, 960], evening: [960, 1200] };   // minutes after midnight
  var DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function km(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function straight(a, b) { return { km: km(a, b), min: null, road: false }; }
  function hasPin(r) { return r.lat != null && r.lng != null && isFinite(r.lat) && isFinite(r.lng); }
  function openJob(r) { return r.status === "Assigned" || r.status === "On the way"; }
  function dayOf(r, today) { return (r.confirmedInput || "").slice(0, 10) || r.day || today; }
  function isFresh(c) {
    return !!(c.active && c.loc && c.loc.duty && c.locAge != null && c.locAge <= FRESH_SEC);
  }
  function mins(t) { var m = /^(\d{1,2}):(\d{2})/.exec(String(t || "")); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function hhmm(m) { m = Math.round(m); var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm; }
  function dow(day) { var p = String(day).split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }

  // The time the customer wants: an exact agreed time, or their time slot
  function windowOf(r) {
    var t = r.confirmedInput ? mins(r.confirmedInput.slice(11, 16)) : null;
    if (t != null) return { start: t, end: t + SERVICE_MIN, exact: true, label: "at " + hhmm(t) };
    var s = SLOTS[String(r.slot || "").toLowerCase()];
    if (s) return { start: s[0], end: s[1], exact: false, label: String(r.slot).toLowerCase() + " (" + hhmm(s[0]) + "-" + hhmm(s[1]) + ")" };
    return { start: 480, end: 1200, exact: false, label: "any time" };
  }
  function overlap(a, b) { return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)); }

  // Does their shift cover that day and time? Collectors with nothing set are always available.
  function shiftCheck(c, day, w) {
    var sh = c.shift;
    if (!sh || (!sh.start && !sh.end && !(sh.days && sh.days.length))) return { ok: true, known: false };
    var d = dow(day);
    if (sh.days && sh.days.length && sh.days.indexOf(DAY_SHORT[d]) < 0) return { ok: false, why: "doesn't work on " + DAY_FULL[d] + "s" };
    var s = mins(sh.start), e = mins(sh.end);
    if (s == null) s = 0; if (e == null) e = 1440;
    var need = w.exact ? (w.end - w.start) : 0.5 * (w.end - w.start);
    if (overlap(w, { start: s, end: e }) < need) return { ok: false, why: "shift is " + hhmm(s) + "-" + hhmm(e) };
    return { ok: true, known: true, text: "shift " + hhmm(s) + "-" + hhmm(e) };
  }

  // Is the collector already booked at that time? Looks at their open pickups and earlier suggestions.
  function busyCheck(wins, w) {
    var inSlot = 0, i;
    for (i = 0; i < wins.length; i++) {
      var o = wins[i];
      if (w.exact && o.exact && Math.abs(o.start - w.start) < CLASH_MIN) return "already booked at " + hhmm(o.start);
      if (overlap(o, w) > 0) inSlot++;
    }
    if (!w.exact && inSlot >= MAX_PER_SLOT) return "already has " + inSlot + " pickups in the " + w.label.split(" ")[0];
    return null;
  }

  // Ranks the collectors who are present for one request. `virt` holds earlier suggestions from the same batch.
  // The result is an array (best first) with an `excluded` property listing who was left out and why.
  function rank(req, state, virt) {
    var today = state.today, day = dayOf(req, today), w = windowOf(req), out = [];
    out.excluded = [];
    var distFn = state.dist || straight;
    var haveNow = state.nowMin != null;
    var soon = day < today || (day === today && (!haveNow || w.start <= state.nowMin + SOON_MIN));
    state.collectors.forEach(function (c) {
      if (!c.active) return;
      var no = function (why) { out.excluded.push({ c: c, why: why }); };
      // the collector (or the office) reported a problem: vehicle broke down, unwell, ...
      if (c.unavailable) return no("is unavailable (" + (c.unavailable.reason || "reported a problem") + ")");

      var sc = shiftCheck(c, day, w);
      if (!sc.ok) return no(sc.why);

      var wins = [], jobs = 0, pts = [];
      state.requests.forEach(function (q) {
        if (q.collectorId === c.id && openJob(q) && dayOf(q, today) === day) {
          jobs++; wins.push(windowOf(q)); if (hasPin(q)) pts.push([q.lat, q.lng]);
        }
      });
      var v = virt[c.id] && virt[c.id][day];
      if (v) { jobs += v.count; v.wins.forEach(function (x) { wins.push(x); }); v.pts.forEach(function (p) { pts.push(p); }); }
      var bz = busyCheck(wins, w);
      if (bz) return no(bz);

      var live = isFresh(c);
      // a collector who has never shared a location can't be checked, so only their hours count
      if (soon && !live && c.loc) return no(c.loc.duty ? "isn't reporting a location" : "is off duty");

      var fromLive = false;
      if (live && day === today && (!haveNow || w.start - state.nowMin <= NEAR_MIN)) { pts.unshift([c.loc.lat, c.loc.lng]); fromLive = true; }

      var dist = null, mins2 = null, road = false, nearLive = false;
      if (hasPin(req) && pts.length) {
        dist = Infinity;
        pts.forEach(function (p, i) {
          var d = distFn(p, [req.lat, req.lng]);
          if (d.km < dist) { dist = d.km; mins2 = d.min; road = !!d.road; nearLive = fromLive && i === 0; }
        });
      }
      out.push({
        c: c, dist: dist, min: mins2, road: road, jobs: jobs, fromLive: nearLive, live: live,
        avail: [soon && live ? "on duty now" : "", sc.known ? sc.text : ""].filter(Boolean).join(" · "),
        score: (dist == null ? UNKNOWN_KM : dist) + JOB_PENALTY_KM * jobs
      });
    });
    out.sort(function (a, b) { return a.score - b.score || a.jobs - b.jobs || (a.c.name < b.c.name ? -1 : 1); });
    return out;
  }

  function reason(x) {
    var p = [];
    if (x.dist == null) p.push("distance unknown");
    else {
      var d = x.dist < 0.1 ? "right there"
        : x.road && x.min != null ? x.dist.toFixed(1) + " km by road, about " + Math.max(1, Math.round(x.min)) + " min"
        : x.dist.toFixed(1) + " km away";
      p.push(d + (x.fromLive ? "" : " from their other pickup"));
    }
    if (x.avail) p.push(x.avail);
    p.push(x.jobs + " open pickup" + (x.jobs === 1 ? "" : "s") + " that day");
    return p.join(" · ");
  }

  function whyNot(ex, limit) {
    return ex.slice(0, limit || 4).map(function (e) { return e.c.name.split(" ")[0] + " " + e.why; }).join("; ");
  }

  // state: { today:"yyyy-mm-dd", nowMin:minutes since midnight (optional), requests:[...],
  //          collectors:[{id,name,active,shift:{start,end,days},unavailable:{reason}|null,loc:{lat,lng,duty},locAge:sec}], dist:fn (optional) }
  function suggest(state) {
    var waiting = state.requests.filter(function (r) { return r.status === "Received" && !r.collectorId; });
    // earliest day first; on the same day requests with a map pin go before ones without
    // (a guess shouldn't use up a collector's slot ahead of a request we can measure), then oldest first
    waiting.sort(function (a, b) {
      var da = dayOf(a, state.today), db = dayOf(b, state.today);
      if (da !== db) return da < db ? -1 : 1;
      var pa = hasPin(a) ? 0 : 1, pb = hasPin(b) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (a.at !== b.at) return a.at < b.at ? -1 : 1;
      return String(a.code).localeCompare(String(b.code), undefined, { numeric: true });
    });
    var virt = {}, items = [], byCode = {};
    waiting.forEach(function (r) {
      var ranked = rank(r, state, virt), best = ranked[0] || null;
      // all: every collector who can take it, best first (for "Someone else…" and reassigning)
      var item = { req: r, best: best, alts: ranked.slice(0, 3), all: ranked.slice(), excluded: ranked.excluded, noPin: !hasPin(r), reason: null, when: windowOf(r).label };
      if (best) {
        item.reason = reason(best);
        var day = dayOf(r, state.today), v = (virt[best.c.id] = virt[best.c.id] || {});
        v = (v[day] = v[day] || { count: 0, pts: [], wins: [] });
        v.count++; v.wins.push(windowOf(r)); if (hasPin(r)) v.pts.push([r.lat, r.lng]);
      } else {
        var soon = dayOf(r, state.today) < state.today ||
          (dayOf(r, state.today) === state.today && (state.nowMin == null || windowOf(r).start <= state.nowMin + SOON_MIN));
        // "nobody on duty" only when that is really the reason; otherwise name the reasons (shift, booked, ...)
        var dutyOnly = ranked.excluded.length && ranked.excluded.every(function (e) { return /off duty|isn't reporting/.test(e.why); });
        item.reason = (soon && dutyOnly ? "No collector is on duty and reporting a location right now." : "No collector is available at that time.") +
          (ranked.excluded.length ? " " + whyNot(ranked.excluded) + "." : "");
      }
      items.push(item); byCode[r.code] = item;
    });
    return { items: items, byCode: byCode };
  }

  var api = { km: km, rank: rank, suggest: suggest, reason: reason, whyNot: whyNot, windowOf: windowOf,
              isFresh: isFresh, FRESH_SEC: FRESH_SEC, SLOTS: SLOTS };
  root.SCDispatch = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);

/* ScrapCall shared code (collector and director apps) */
(function (w) {
  var SC = w.SC = {};
  SC.API_URL = w.SCRAPCALL_API || "";
  SC.$ = function (s, r) { return (r || document).querySelector(s); };
  SC.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  SC.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  SC.load = function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  SC.save = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  SC.drop = function (k) { try { localStorage.removeItem(k); } catch (e) {} };
  SC.num = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };
  SC.money = function (n) { return SC.num(n).toFixed(2); };
  SC.kg = function (n) { return SC.num(n) + " kg"; };
  // "12.5 kg", "3 pieces" or "12.5 kg · 3 pieces": weighed items count in kg, counted items in pieces
  SC.qty = function (kg, pcs) {
    var p = [];
    if (kg > 0) p.push(SC.num(kg) + " kg");
    if (pcs > 0) p.push(pcs + (pcs === 1 ? " piece" : " pieces"));
    return p.length ? p.join(" · ") : "0 kg";
  };

  // Every call goes to the Google Apps Script link as plain text (avoids browser pre-flight checks)
  SC.api = function (payload) {
    if (!SC.API_URL) return Promise.reject(new Error("The app isn’t connected yet. Add your Google link to config.js."));
    return fetch(SC.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  };

  var tt;
  SC.toast = function (msg) {
    var t = SC.$("#toast"); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 4200);
  };

  SC.when = function (iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return iso;
    return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  SC.day = function (s) {
    try { return new Date(s + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); }
    catch (e) { return s; }
  };
  SC.telHref = function (p) { return "tel:" + String(p || "").replace(/[^\d+]/g, ""); };
  SC.waHref = function (p) {
    p = String(p || "").trim();
    return p.charAt(0) === "+" ? "https://wa.me/" + p.replace(/\D/g, "") : "";
  };
  SC.mapHref = function (addr) {
    var m = /GPS pin:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(addr || "");
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(m ? m[1] + "," + m[2] : addr);
  };
  SC.safeLink = function (u) { return /^https:\/\/(drive|docs)\.google\.com\//.test(u) ? u : ""; };

  // Shared connection banner
  SC.watchConnection = function (onChange) {
    function upd() {
      var on = navigator.onLine !== false;
      var c = SC.$("#conn"); if (c) c.classList.toggle("off", !on);
      var t = SC.$("#connText"); if (t) t.textContent = on ? "Online" : "Offline. You can still view saved information.";
      if (onChange) onChange(on);
    }
    w.addEventListener("online", upd); w.addEventListener("offline", upd); upd();
  };

  // Install button + offline loading
  SC.pwa = function (btnSel) {
    var deferred = null, btn = SC.$(btnSel);
    w.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; if (btn) btn.hidden = false; });
    if (btn) btn.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; btn.hidden = true; });
    });
    w.addEventListener("appinstalled", function () { if (btn) btn.hidden = true; SC.toast("Installed."); });
    if ("serviceWorker" in navigator) {
      w.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
    }
  };

  // Dialog helper
  SC.dialog = function (title, body, foot) {
    var d = SC.$("#dlg");
    d.innerHTML = '<form method="dialog" class="dlg-x"><button aria-label="Close">×</button></form>' +
      '<div class="dlg-head"><h2>' + SC.esc(title) + '</h2></div><div class="dlg-body">' + body + '</div>' +
      (foot ? '<div class="dlg-foot">' + foot + '</div>' : "");
    if (!d.open) d.showModal();
    return d;
  };
  SC.closeDialog = function () { var d = SC.$("#dlg"); if (d && d.open) d.close(); };
})(window);

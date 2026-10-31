/* ScrapCall pictures: one simple set of icons used everywhere, so collectors learn each picture once.
 * Every icon is drawn in a 24 x 24 box with a plain outline, and takes the colour of the text around it. */
(function (w) {
  var P = {
    // ---- actions and answers
    check:    '<polyline points="4 12.5 9.5 18 20 6"/>',
    cross:    '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>',
    plus:     '<line x1="12" y1="4.5" x2="12" y2="19.5"/><line x1="4.5" y1="12" x2="19.5" y2="12"/>',
    minus:    '<line x1="4.5" y1="12" x2="19.5" y2="12"/>',
    back:     '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/>',
    next:     '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>',
    eye:      '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    camera:   '<rect x="2.5" y="7" width="19" height="13" rx="2.5"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.8"/>',
    nocamera: '<rect x="2.5" y="7" width="19" height="13" rx="2.5"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.8"/><line x1="3" y1="3" x2="21" y2="21"/>',
    gallery:  '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><polyline points="21 16 15.5 11 5 20"/>',
    scale:    '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7.5 12a4.5 4.5 0 0 1 9 0"/><line x1="12" y1="12" x2="14.4" y2="9.6"/>',
    count:    '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="8.5" y="3.5" width="7" height="7" rx="1.5"/>',
    phone:    '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2C9.5 20 4 14.5 4.5 5.5a2 2 0 0 1 2-2z"/>',
    chat:     '<path d="M4 5h16v11H11l-5 4v-4H4z"/>',
    navigate: '<polygon points="12 3 19.5 20.5 12 16.5 4.5 20.5"/>',
    pin:      '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
    map:      '<polygon points="3 6 9 4 15 6 21 4 21 18 15 20 9 18 3 20"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    truck:    '<rect x="2" y="7" width="12" height="9" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    upload:   '<line x1="12" y1="16" x2="12" y2="5"/><polyline points="7 10 12 5 17 10"/><line x1="5" y1="20" x2="19" y2="20"/>',
    power:    '<path d="M7 5.5a8 8 0 1 0 10 0"/><line x1="12" y1="3" x2="12" y2="11"/>',
    list:     '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><line x1="8.5" y1="11" x2="15.5" y2="11"/><line x1="8.5" y1="15" x2="13.5" y2="15"/>',
    today:    '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/><polyline points="9 15 11.2 17.2 15.5 12.8"/>',
    tag:      '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    cash:     '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/>',
    digital:  '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><polyline points="9.5 12 11.5 14 15 10"/>',
    // ---- problems
    warning:  '<path d="M12 3.5L21.5 20h-19z"/><line x1="12" y1="10" x2="12" y2="14.5"/><line x1="12" y1="17.3" x2="12.01" y2="17.3"/>',
    breakdown:'<path d="M4 3.5l1 2M8 2.5v2.5M12 3.5l-1 2"/><rect x="2" y="9" width="12" height="8" rx="1"/><path d="M14 11h4l3 3v3h-7z"/><circle cx="7" cy="19" r="1.8"/><circle cx="17" cy="19" r="1.8"/>',
    unwell:   '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="9.5" y1="11.5" x2="14.5" y2="11.5"/>',
    roadblock:'<rect x="3" y="8" width="18" height="6" rx="1"/><line x1="6" y1="14" x2="6" y2="21"/><line x1="18" y1="14" x2="18" y2="21"/><line x1="8" y1="8" x2="11" y2="14"/><line x1="13" y1="8" x2="16" y2="14"/>',
    help:     '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    absent:   '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/>',
    empty:    '<path d="M3 13h5l1.5 3h5l1.5-3h5v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z"/><path d="M3 13l3-8h12l3 8"/>',
    wrongplace:'<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><line x1="9.5" y1="7.5" x2="14.5" y2="12.5"/><line x1="14.5" y1="7.5" x2="9.5" y2="12.5"/>',
    refused:  '<polygon points="8 3 16 3 21 8 21 16 16 21 8 21 3 16 3 8"/><line x1="8.5" y1="12" x2="15.5" y2="12"/>',
    other:    '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    // ---- scrap items
    iron:        '<path d="M4 5h16v3h-6v8h6v3H4v-3h6V8H4z"/>',
    copper:      '<circle cx="11" cy="12" r="8"/><circle cx="11" cy="12" r="4.5"/><circle cx="11" cy="12" r="1"/><path d="M19 12.5c1.8.3 3 1 3 3.5"/>',
    aluminium:   '<rect x="7" y="4" width="10" height="16" rx="2.5"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="16" x2="17" y2="16"/><path d="M10 4V3h4v1"/>',
    brass:       '<path d="M3 10h11a4 4 0 0 1 4 4v1"/><path d="M15 10V7"/><line x1="12" y1="7" x2="18" y2="7"/><path d="M18 18.5c-.9 1-1.6 1.6-1.6 2.4a1.6 1.6 0 0 0 3.2 0c0-.8-.7-1.4-1.6-2.4z"/>',
    paper:       '<path d="M3 8l9-4.5L21 8v9l-9 4.5L3 17z"/><path d="M3 8l9 4.5L21 8"/><line x1="12" y1="12.5" x2="12" y2="21.5"/>',
    plastic:     '<path d="M10 2.5h4v3l2 2.5v12a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20V8l2-2.5z"/><line x1="8" y1="12" x2="16" y2="12"/>',
    electronics: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>',
    battery:     '<rect x="3" y="7" width="16" height="10" rx="2"/><line x1="21.5" y1="10.5" x2="21.5" y2="13.5"/><path d="M11 9l-2 3h3l-2 3"/>',
    tv:          '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    fridge:      '<rect x="6" y="2.5" width="12" height="19" rx="2"/><line x1="6" y1="10" x2="18" y2="10"/><line x1="9" y1="6" x2="9" y2="8"/><line x1="9" y1="13" x2="9" y2="17"/>',
    ac:          '<rect x="3" y="5" width="18" height="7" rx="2"/><line x1="6" y1="9" x2="18" y2="9"/><path d="M8 15c0 2-1 3-1 5M12 15c0 2-1 3-1 5M16 15c0 2-1 3-1 5"/>',
    washer:      '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><line x1="7" y1="6.5" x2="9" y2="6.5"/>',
    bike:        '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-8h5l3 8M10 8l3 8M9 5h3"/>',
    part:        '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    bin:         '<path d="M5 7h14l-1.2 13H6.2z"/><path d="M3.5 7h17"/><path d="M9 7V4.5h6V7"/>'
  };
  var ITEMS = ["iron", "copper", "aluminium", "brass", "paper", "plastic", "electronics", "battery", "tv", "fridge", "ac", "washer", "bike", "part", "bin"];
  var ITEM_LABELS = { iron: "Iron / steel", copper: "Copper / wire", aluminium: "Aluminium / cans", brass: "Brass / taps", paper: "Paper / cardboard",
                      plastic: "Plastic", electronics: "Electronics", battery: "Battery", tv: "TV / screen", fridge: "Fridge / freezer",
                      ac: "Air conditioner", washer: "Washing machine", bike: "Bicycle", part: "Machine part", bin: "Other scrap" };

  var I = w.SCIcons = { items: ITEMS, labels: ITEM_LABELS };

  // <svg> for an icon name; `size` in px (default 24). Colour follows the surrounding text.
  I.svg = function (name, size) {
    var s = size || 24, body = P[name] || P.bin;
    return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  };
  I.has = function (name) { return !!P[name]; };

  // Picks a picture for a scrap item from its name, if the office has not chosen one
  I.guess = function (name) {
    var n = " " + String(name || "").toLowerCase() + " ";
    var rules = [
      [/copper|wire|cable/, "copper"], [/brass|tap\b|taps\b|valve/, "brass"], [/alumin|\bcans?\b/, "aluminium"],
      [/iron|steel|metal|\brod|girder|pipe/, "iron"], [/paper|cardboard|carton|newspaper|book/, "paper"],
      [/plastic|bottle|container/, "plastic"], [/batter|inverter/, "battery"],
      [/television|\btvs?\b|monitor|screen|\blcd\b|\bled\b/, "tv"], [/fridge|refrigerator|freezer/, "fridge"],
      [/air ?cond|\bacs?\b|cooler/, "ac"], [/washing|washer|laundry/, "washer"], [/bike|bicycle|cycle/, "bike"],
      [/electronic|circuit|computer|laptop|phone|\bpcb\b|appliance/, "electronics"], [/engine|gear|machine|motor|part/, "part"]
    ];
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(n)) return rules[i][1];
    return "bin";
  };
  // The picture for an item: the one the office chose, else a good guess from its name
  I.forItem = function (name, chosen) { return chosen && P[chosen] ? chosen : I.guess(name); };
  I.item = function (name, chosen, size) { return I.svg(I.forItem(name, chosen), size); };
})(window);

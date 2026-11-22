/* data.js: catalog, stores, size/length matrix, dates.
 * Everything in this file is [SIMULATED] unless a comment says [OBSERVED].
 * Classic script: attaches to window.AE so index.html works from file://.
 */
(function (AE) {
  "use strict";

  // ---- Dates [SIMULATED] -------------------------------------------------
  AE.TODAY_LABEL = "Mon, Nov 30, 2026";
  AE.SHIP_ESTIMATE = "Tue, Dec 8";
  AE.ORDER_NUMBER = "AE-SIM-463001";
  AE.VERSION = "v1.0-pretest";
  AE.TAX_RATE_LABEL = "9.2%";

  // ---- Colors (washes) ---------------------------------------------------
  AE.COLORS = {
    "dark-indigo": { name: "Dark Indigo", hex: "#25324f", seam: "#7d8cab" },
    "medium-bright-indigo": { name: "Medium Bright Indigo", hex: "#4767a3", seam: "#b4c6e8" },
    "light-vintage": { name: "Light Vintage", hex: "#93acc9", seam: "#e3ecf6" }
  };

  // ---- Products (prices in integer cents) -------------------------------
  // The wide-leg product, its Medium Bright Indigo wash, style 0437-6331 and
  // the $66.45 / $69.95 price are [OBSERVED]. Everything else is [SIMULATED].
  AE.PRODUCTS = {
    "straight": {
      id: "straight",
      name: "AE Stretch Super High-Waisted Baggy Straight Jean",
      style: null,
      shape: "straight",
      colors: ["dark-indigo"],
      prices: { "dark-indigo": { sale: 5995, orig: 6495 } }
    },
    "wide-leg": {
      id: "wide-leg",
      name: "AE Super High-Waisted Baggy Wide-Leg Jean",
      style: "0437-6331",
      shape: "wide",
      colors: ["dark-indigo", "medium-bright-indigo", "light-vintage"],
      prices: {
        "dark-indigo": { sale: 6645, orig: 6995 },
        "medium-bright-indigo": { sale: 6645, orig: 6995 },
        "light-vintage": { sale: 6645, orig: 6995 }
      }
    },
    "curvy": {
      id: "curvy",
      name: "AE Curvy Super High-Waisted Baggy Wide-Leg Jean",
      style: null,
      shape: "wide",
      colors: ["medium-bright-indigo"],
      prices: { "medium-bright-indigo": { sale: 7195, orig: 7995 } }
    }
  };

  // Search-result cards, in result order. Card 3 (center) is the scenario target.
  AE.CARDS = [
    { id: "c1", productId: "straight", colorId: "dark-indigo" },
    { id: "c2", productId: "wide-leg", colorId: "dark-indigo" },
    { id: "c3", productId: "wide-leg", colorId: "medium-bright-indigo" },
    { id: "c4", productId: "wide-leg", colorId: "light-vintage" },
    { id: "c5", productId: "curvy", colorId: "medium-bright-indigo" }
  ];

  // ---- Sizes and lengths -------------------------------------------------
  // Size range and length names [OBSERVED]; availability [SIMULATED] except
  // 18 Short unavailable and 10 Long available, which were [OBSERVED].
  AE.SIZES = ["000", "00", "0", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20"];
  AE.LENGTHS = ["X-Short", "Short", "Regular", "Long", "X-Long"];

  function sizeIndex(size) { return AE.SIZES.indexOf(size); }
  function between(size, lo, hi) {
    var i = sizeIndex(size);
    return i >= sizeIndex(lo) && i <= sizeIndex(hi);
  }

  /** Is this length offered in this size? Same matrix for every product. */
  AE.isLengthAvailable = function (size, length) {
    if (sizeIndex(size) < 0 || AE.LENGTHS.indexOf(length) < 0) return false;
    switch (length) {
      case "X-Short": return between(size, "000", "8");
      case "Short": return size !== "18";
      case "Regular": return true;
      case "Long": return between(size, "0", "20");
      case "X-Long": return between(size, "8", "18");
    }
    return false;
  };

  // ---- Stores [SIMULATED; Westgate name, distance and Dec 1 OBSERVED] ----
  AE.STORES = [
    { id: "westgate", name: "Tanger Outlet Westgate – American Eagle Outlet", distance: "4.8 mi", date: "Tue, Dec 1", shortDate: "Dec 1" },
    { id: "aerie", name: "Aerie – Westgate", distance: "4.7 mi", date: "Wed, Dec 2", shortDate: "Dec 2" },
    { id: "arrowhead", name: "Arrowhead Towne Center – American Eagle", distance: "9.3 mi", date: "Thu, Dec 3", shortDate: "Dec 3" }
  ];

  AE.getStore = function (id) {
    for (var i = 0; i < AE.STORES.length; i++) if (AE.STORES[i].id === id) return AE.STORES[i];
    return null;
  };
  AE.getProduct = function (id) { return AE.PRODUCTS[id] || null; };
  AE.getColor = function (id) { return AE.COLORS[id] || null; };
  AE.getPrice = function (productId, colorId) {
    var p = AE.getProduct(productId);
    return p && p.prices[colorId] ? p.prices[colorId] : null;
  };

  // ---- Search [DESIGN] ---------------------------------------------------
  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
  }
  /** Cards whose name, color or style number contains every typed word. */
  AE.searchCards = function (query) {
    var words = normalize(query).split(" ").filter(Boolean);
    return AE.CARDS.filter(function (card) {
      var p = AE.PRODUCTS[card.productId];
      var hay = normalize(p.name + " " + AE.COLORS[card.colorId].name + " " + (p.style || ""));
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
  };

  // ---- Product image: local inline SVG jeans silhouette tinted per wash ----
  AE.jeansSvg = function (productId, colorId, opts) {
    var p = AE.getProduct(productId), c = AE.getColor(colorId);
    if (!p || !c) return "";
    var label = (opts && opts.label) || (p.name + " in " + c.name);
    var legs = p.shape === "wide"
      ? "M58 70 L142 70 L150 112 L170 280 L114 280 L100 140 L86 280 L30 280 L50 112 Z"
      : "M58 70 L142 70 L148 112 L152 280 L108 280 L100 140 L92 280 L48 280 L52 112 Z";
    return '<svg class="jeans" viewBox="0 0 200 300" role="img" aria-label="' + escapeAttr(label) + '">' +
      '<rect width="200" height="300" fill="#f1f3f7"/>' +
      '<path d="' + legs + '" fill="' + c.hex + '"/>' +
      '<rect x="58" y="62" width="84" height="14" fill="' + c.hex + '" stroke="' + c.seam + '" stroke-width="1.5"/>' +
      '<path d="M100 76 L100 128" stroke="' + c.seam + '" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<path d="M66 82 Q78 98 92 84" fill="none" stroke="' + c.seam + '" stroke-width="1.5"/>' +
      '<path d="M134 82 Q122 98 108 84" fill="none" stroke="' + c.seam + '" stroke-width="1.5"/>' +
      '<circle cx="100" cy="69" r="3" fill="#c9a54a"/>' +
      "</svg>";
  };

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }
})(window.AE = window.AE || {});

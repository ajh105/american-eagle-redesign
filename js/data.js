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
      fit: "Baggy Straight",
      details: ["Super high rise", "Relaxed, baggy straight leg", "Some stretch"],
      colors: ["dark-indigo"],
      prices: { "dark-indigo": { sale: 5995, orig: 6495 } }
    },
    "wide-leg": {
      id: "wide-leg",
      name: "AE Super High-Waisted Baggy Wide-Leg Jean",
      style: "0437-6331",
      shape: "wide",
      fit: "Baggy Wide-Leg",
      details: ["Super high rise", "Wide leg with a slouchy, long inseam", "Some stretch, lightweight fabric"],
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
      fit: "Curvy",
      details: ["Super high rise", "Curvy fit: extra room through hip and thigh", "Wide leg"],
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

  // ---- Product images ---------------------------------------------------
  // Original flat-lay renders made by tools/render-product-images.js (not AE photography).
  // Replace a file with a licensed photo of the same name to swap it in.
  AE.IMAGE_VIEWS = ["front", "back", "detail", "pocket"];
  AE.VIEW_LABELS = { front: "front", back: "back", detail: "waistband detail", pocket: "back pocket detail" };
  AE.productImage = function (productId, colorId, view) {
    return "assets/products/" + productId + "_" + colorId + "_" + (view || "front") + ".jpg";
  };

  // ---- Navigation categories [DESIGN] ------------------------------------
  // Women and Jeans open the women's jeans results; the others explain the prototype's scope.
  AE.CATEGORIES = [
    { id: "new", label: "New" },
    { id: "women", label: "Women", results: true },
    { id: "men", label: "Men" },
    { id: "jeans", label: "Jeans", results: true },
    { id: "loungewear", label: "Loungewear & PJs" },
    { id: "aerie", label: "Aerie" },
    { id: "clearance", label: "Clearance" }
  ];
  AE.getCategory = function (id) {
    for (var i = 0; i < AE.CATEGORIES.length; i++) if (AE.CATEGORIES[i].id === id) return AE.CATEGORIES[i];
    return null;
  };
  AE.FIT_OPTIONS = ["Baggy Wide-Leg", "Baggy Straight", "Curvy"];
  AE.SORT_OPTIONS = [
    { id: "featured", label: "Featured" },
    { id: "price-asc", label: "Price: Low to High" },
    { id: "price-desc", label: "Price: High to Low" }
  ];

  /** Cards for the S1 results view: search or category, then fit/color filters, then sort. */
  AE.resultsFor = function (search) {
    var base;
    if (search.category) {
      var cat = AE.getCategory(search.category);
      base = cat && cat.results ? AE.CARDS.slice() : [];
    } else {
      base = AE.searchCards(search.query);
    }
    var fits = search.fits || [], colors = search.colors || [];
    var filtered = base.filter(function (c) {
      return (!fits.length || fits.indexOf(AE.PRODUCTS[c.productId].fit) >= 0) &&
        (!colors.length || colors.indexOf(c.colorId) >= 0);
    });
    if (search.sort === "price-asc" || search.sort === "price-desc") {
      var dir = search.sort === "price-asc" ? 1 : -1;
      filtered = filtered.map(function (c, i) { return { c: c, i: i }; }).sort(function (a, b) {
        var d = AE.getPrice(a.c.productId, a.c.colorId).sale - AE.getPrice(b.c.productId, b.c.colorId).sale;
        return d ? d * dir : a.i - b.i;
      }).map(function (x) { return x.c; });
    }
    return { base: base, cards: filtered };
  };

  /** Percent saved, rounded, for "Save N%" badges. */
  AE.savePercent = function (productId, colorId) {
    var p = AE.getPrice(productId, colorId);
    return Math.round((p.orig - p.sale) * 100 / p.orig);
  };

})(window.AE = window.AE || {});

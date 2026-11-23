/* views.js: S1–S8 render functions and the site header. Each returns an HTML string
 * built only from the central state (plus transient validation feedback in `ui`).
 * Views never keep private copies of state.
 *
 * Visual language follows the measured ae.com styles (see docs/VISUAL_DIRECTION.md);
 * interactions follow the redesign spec (AE_PROTOTYPE_CONTEXT.md).
 */
(function (AE) {
  "use strict";

  var V = {};

  // ---- Helpers ---------------------------------------------------------------

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
  function sizeId(size) { return "size-" + slug(size); }
  function lengthId(length) { return "len-" + slug(length); }

  var ICONS = {
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 8h14l-1 13H6L5 8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    store: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 10v10h16V10M3 10l2-6h14l2 6H3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="17.5" r="1.8" fill="#fff" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="17.5" r="1.8" fill="#fff" stroke="currentColor" stroke-width="1.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 7v6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1.3" fill="#fff"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  };
  function icon(name, cls) { return '<span class="icon ' + (cls || "") + '">' + ICONS[name] + "</span>"; }

  function img(item, view, cls, alt) {
    return '<img class="' + (cls || "") + '" src="' + AE.productImage(item.productId, item.colorId, view) + '" alt="' + esc(alt || "") + '" loading="lazy" decoding="async">';
  }
  function photoAlt(item, view) {
    return AE.getProduct(item.productId).name + " in " + AE.getColor(item.colorId).name + ", " + AE.VIEW_LABELS[view || "f"] + " view";
  }

  function priceInline(productId, colorId, qty) {
    var p = AE.getPrice(productId, colorId), n = qty || 1;
    return '<span class="price-orig"><span class="visually-hidden">Original price </span>' + AE.money(p.orig * n) + "</span> " +
      '<span class="price-sale"><span class="visually-hidden">Sale price </span>' + AE.money(p.sale * n) + "</span>";
  }

  function noticeHtml(state, route) {
    var n = state.notice;
    if (!n || n.route !== route || n.field) return "";
    var ic = n.kind === "success" ? "check" : n.kind === "warning" ? "alert" : "info";
    return '<div class="notice notice-' + esc(n.kind || "info") + '">' + icon(ic) + "<p>" + esc(n.text) + "</p></div>";
  }

  function fieldError(id, msg) {
    return msg ? '<p class="field-error" id="' + id + '">' + icon("alert") + esc(msg) + "</p>" : "";
  }

  function itemName(item) { return AE.getProduct(item.productId).name; }
  function colorName(item) { return AE.getColor(item.colorId).name; }

  /** Small AE / Aerie store badge (typeset initials, not logo artwork). */
  function storeBadge(store) {
    return store.id === "aerie"
      ? '<span class="store-badge aerie" aria-hidden="true">ae</span>'
      : '<span class="store-badge" aria-hidden="true">AE</span>';
  }

  /** Method / store / date rows shared by S4, S5, S6 (memory scaffold, F3). */
  function fulfilmentRows(item) {
    if (item.method === "ship") {
      return "<dt>Delivery</dt><dd>Ship to Me · Free</dd>" +
        "<dt>Estimated delivery</dt><dd>" + esc(AE.SHIP_ESTIMATE) + "</dd>";
    }
    var store = AE.getStore(item.storeId);
    return "<dt>Delivery</dt><dd>Store Pickup · Free</dd>" +
      "<dt>Pickup store</dt><dd>" + (store ? esc(store.name) : '<span class="text-warning">No store selected</span>') + "</dd>" +
      "<dt>Pickup date</dt><dd>" + (store ? "Ready " + esc(store.date) : "—") + "</dd>";
  }

  function itemSpecs(item, opts) {
    var p = AE.getProduct(item.productId);
    return '<dl class="specs">' +
      (p.style ? "<dt>Style:</dt><dd>" + esc(p.style) + "</dd>" : "") +
      "<dt>Color:</dt><dd>" + esc(colorName(item)) + "</dd>" +
      "<dt>Size:</dt><dd>" + esc(item.size) + "</dd>" +
      "<dt>Length:</dt><dd>" + esc(item.length) + "</dd>" +
      (opts && opts.noQty ? "" : "<dt>Qty:</dt><dd>" + item.qty + "</dd>") +
      "</dl>";
  }

  function summaryLines(item) {
    var l = AE.priceLines(item);
    var totalLabel = (arguments[1] && arguments[1].totalLabel) || "Estimated Total:";
    return '<dl class="summary-lines">' +
      "<dt>Merchandise:</dt><dd>" + AE.money(l.merch) + "</dd>" +
      '<dt>Savings:</dt><dd class="saving">' + AE.money(-l.savings) + "</dd>" +
      '<dd class="sub-line"><span class="saving">' + AE.money(-l.savings) + "</span> Item Discounts</dd>" +
      "<dt>" + (item.method === "pickup" ? "Store Pickup:" : "Shipping:") + "</dt><dd>Free</dd>" +
      "<dt>Estimated tax (simulated):</dt><dd>" + AE.money(l.tax) + "</dd>" +
      '<dt class="total">' + totalLabel + '</dt><dd class="total" data-testid="order-total">' + AE.money(l.total) + "</dd>" +
      '<dd class="saving-note">You’re saving ' + AE.money(l.savings) + "!</dd>" +
      "</dl>";
  }

  V.title = function (state) {
    return {
      S1: state.search.view === "results" ? "Women’s Jeans" : "Women’s Jeans & Denim", S2: "Product Details", S3: "Choose a Pickup Store",
      S4: "Added to Bag", S5: "Shopping Bag", S6: "Checkout", S7: "Choose Another Store", S8: "Order Confirmation"
    }[state.route] || "";
  };

  /** Id of the control that should receive focus for a validation error. */
  V.firstControlId = function (state, field) {
    var d = state.draft;
    if (field === "size") return d.size ? sizeId(d.size) : sizeId(AE.SIZES[0]);
    if (field === "length") {
      if (!d.size) return sizeId(AE.SIZES[0]);
      for (var i = 0; i < AE.LENGTHS.length; i++) if (AE.isLengthAvailable(d.size, AE.LENGTHS[i])) return lengthId(AE.LENGTHS[i]);
    }
    if (field === "method") return "method-pickup";
    return null;
  };

  /** States drawn as overlays on top of another page (S3 modal, S4 drawer). */
  V.isOverlay = function (state) { return state.route === "S3" || state.route === "S4"; };

  // ---- Header ----------------------------------------------------------------

  V.header = function (state) {
    // Badge counts distinct line items, not quantity (1 item at qty 3 shows "1"); hidden when empty.
    var count = state.bag ? 1 : 0;
    var checkoutish = state.route === "S6" || state.route === "S7" || state.route === "S8";
    if (checkoutish) {
      return '<div class="checkout-header"><div class="wrap checkout-header-inner">' +
        '<span class="wordmark-small">AMERICAN EAGLE</span>' +
        "</div></div>";
    }
    var activeCat = state.route === "S1" && state.search.view === "results" ? state.search.category : null;
    return '<div class="brand-bar"><div class="wrap brand-bar-inner">' +
      '<span class="brand-tab">AMERICAN EAGLE</span>' +
      '<button type="button" class="icon-button bag-button" data-action="viewBag" id="header-bag" aria-label="Shopping bag, ' + count + (count === 1 ? " item" : " items") + '">' +
      icon("bag") + (count ? '<span class="bag-count" id="header-bag-count" aria-hidden="true">' + count + "</span>" : "") + "</button>" +
      "</div></div>" +
      '<div class="masthead"><div class="wrap masthead-inner">' +
      '<span class="masthead-spacer"></span>' +
      '<button type="button" class="logo" data-action="goHome" id="logo-home" aria-label="American Eagle home (prototype)">AMERICAN EAGLE</button>' +
      '<form class="header-search" data-form="search" role="search">' +
      '<button type="submit" class="search-submit" id="search-button" aria-label="Search">' + icon("search") + "</button>" +
      '<label for="search-input" class="visually-hidden">Search jeans</label>' +
      '<input id="search-input" type="search" name="q" placeholder="Search" autocomplete="off" value="' + esc(state.route === "S1" && state.search.view === "results" ? state.search.query : "") + '">' +
      "</form></div></div>" +
      '<nav class="cat-nav" aria-label="Shop by category"><ul class="wrap">' +
      AE.CATEGORIES.map(function (c) {
        return '<li><button type="button" data-action="openCategory" data-category="' + c.id + '" id="nav-' + c.id + '"' +
          (activeCat === c.id ? ' aria-current="page" class="is-current"' : "") + ">" + esc(c.label) + "</button></li>";
      }).join("") + "</ul></nav>";
  };

  // ---- S1 Home and search results --------------------------------------------

  function homeView() {
    var heroCards = [AE.CARDS[1], AE.CARDS[2], AE.CARDS[3]];
    var fits = [
      { q: "baggy wide-leg", label: "Baggy & Wide Leg Jeans", tag: "Super relaxed & laidback.", card: AE.CARDS[2] },
      { q: "straight", label: "Straight Leg Jeans", tag: "Classic straight fits.", card: AE.CARDS[0] },
      { q: "curvy", label: "Curvy Jeans", tag: "Say goodbye to waistband gapping.", card: AE.CARDS[4] }
    ];
    return '<section class="home" data-state="S1" aria-labelledby="h1">' +
      '<div class="hero">' +
      '<div class="hero-images">' + heroCards.map(function (c) { return img(c, "of", "hero-img", ""); }).join("") + "</div>" +
      '<div class="hero-copy"><p class="eyebrow">Women’s Denim</p>' +
      '<h1 id="h1">The Baggy Edit</h1>' +
      "<p>Super high-waisted, super relaxed. Free store pickup.</p>" +
      '<div class="hero-actions"><button type="button" class="btn btn-cream" data-action="openCategory" data-category="jeans" id="hero-shop">Shop Women’s Jeans</button></div></div></div>' +
      '<div class="wrap home-section"><h2 class="cat-title">Shop Women’s Jeans by Fit</h2>' +
      '<ul class="fit-tiles">' + fits.map(function (f, i) {
        return '<li><button type="button" class="fit-tile" data-action="runSearch" data-query="' + esc(f.q) + '" id="fit-' + i + '">' +
          img(f.card, "of", "fit-img", "") + '<span class="fit-label">' + esc(f.label) + '</span><span class="fit-tag">' + esc(f.tag) + "</span></button></li>";
      }).join("") + "</ul></div>" +
      '<div class="wrap home-section home-perks">' +
      '<div class="perk">' + icon("store") + "<div><strong>Free Store Pickup</strong><p>Choose a nearby store and see the pickup date before you add to bag.</p></div></div>" +
      '<div class="perk">' + icon("truck") + "<div><strong>Free Standard Shipping</strong><p>Prefer delivery? Ship to Me arrives by " + esc(AE.SHIP_ESTIMATE) + ".</p></div></div>" +
      "</div></section>";
  }

  function resultsView(state) {
    var s = state.search;
    var r = AE.resultsFor(s);
    var cat = s.category ? AE.getCategory(s.category) : null;
    var unavailable = cat && !cat.results;
    var heading = cat ? (cat.results ? "Women’s Jeans" : cat.label) : (s.query ? "Search results for “" + esc(s.query) + "”" : "All Jeans");
    var count = r.cards.length;
    var status = unavailable ? "" : (s.query
      ? (count ? count + (count === 1 ? " result" : " results") + " for “" + esc(s.query) + "”" : "")
      : "Showing " + count + " of " + r.base.length + " jeans");
    var filtersOn = (s.fits.length + s.colors.length) > 0;

    var rail = unavailable ? "" :
      '<section class="filter-rail" aria-label="Filter and sort">' +
      '<h2 class="rail-title">Filter + Sort</h2>' +
      '<details class="facet" open><summary>Sort By</summary><div class="facet-body" role="radiogroup" aria-label="Sort by">' +
      AE.SORT_OPTIONS.map(function (o) {
        return '<label class="facet-option"><input type="radio" name="sort" value="' + o.id + '" data-change="sort" id="sort-' + o.id + '"' + (s.sort === o.id ? " checked" : "") + "><span>" + esc(o.label) + "</span></label>";
      }).join("") + "</div></details>" +
      '<details class="facet" open><summary>Fit</summary><div class="facet-body">' +
      AE.FIT_OPTIONS.map(function (f) {
        return '<label class="facet-option"><input type="checkbox" value="' + esc(f) + '" data-change="filter-fit" id="fit-filter-' + slug(f) + '"' + (s.fits.indexOf(f) >= 0 ? " checked" : "") + "><span>" + esc(f) + "</span></label>";
      }).join("") + "</div></details>" +
      '<details class="facet" open><summary>Color</summary><div class="facet-body">' +
      Object.keys(AE.COLORS).map(function (cid) {
        var c = AE.COLORS[cid];
        return '<label class="facet-option"><input type="checkbox" value="' + cid + '" data-change="filter-color" id="color-filter-' + cid + '"' + (s.colors.indexOf(cid) >= 0 ? " checked" : "") + '><span class="facet-swatch" style="background:' + c.hex + '" aria-hidden="true"></span><span>' + esc(c.name) + "</span></label>";
      }).join("") + "</div></details>" +
      (filtersOn ? '<button type="button" class="link-button" data-action="clearFilters" id="clear-filters">Clear filters</button>' : "") +
      "</section>";

    var grid;
    if (unavailable) {
      grid = '<div class="empty-results"><p>This demo store only carries women’s jeans.</p>' +
        '<button type="button" class="btn btn-dark" data-action="openCategory" data-category="jeans" id="shop-jeans">Shop Women’s Jeans</button></div>';
    } else if (!count) {
      grid = '<div class="empty-results"><p>' + (r.base.length && filtersOn
        ? "No jeans match these filters."
        : "We couldn’t find any results for “" + esc(s.query) + "”. Try searching for “jeans”.") + "</p>" +
        (r.base.length && filtersOn ? '<button type="button" class="btn btn-outline" data-action="clearFilters" id="clear-filters-empty">Clear filters</button>' : "") + "</div>";
    } else {
      grid = '<ul class="results-grid">' + r.cards.map(function (c) {
        var p = AE.getProduct(c.productId), col = AE.getColor(c.colorId);
        return '<li><button type="button" class="result-card" id="card-' + c.id + '" data-action="openCard" data-card="' + c.id + '">' +
          '<span class="tile-media">' + img(c, "of", "tile-img", "") + img(c, "ob", "tile-img tile-img-alt", "") +
          '<span class="save-badge">Save ' + AE.savePercent(c.productId, c.colorId) + "%</span></span>" +
          '<span class="tile-flag">' + esc(p.fit) + "</span>" +
          '<span class="tile-name">' + esc(p.name) + "</span>" +
          '<span class="tile-color">' + esc(col.name) + "</span>" +
          '<span class="tile-price">' + priceInline(c.productId, c.colorId) + "</span></button></li>";
      }).join("") + "</ul>";
    }

    return '<section class="results-page wrap" data-state="S1" aria-labelledby="h1">' +
      '<nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><button type="button" class="crumb" data-action="goHome" id="crumb-home">Home</button></li><li aria-current="page">' + (cat ? esc(cat.label) : "Search") + "</li></ol></nav>" +
      '<div class="results-head"><h1 id="h1">' + heading + (unavailable ? "" : ' <span class="count">(' + count + ")</span>") + "</h1>" +
      (state.bag ? '<button type="button" class="btn btn-outline btn-sm bag-link" data-action="viewBag" id="results-bag">Bag (' + state.bag.qty + ")</button>" : "") + "</div>" +
      (status ? '<p class="results-status" id="results-status" tabindex="-1" aria-live="polite">' + status + "</p>" : '<p class="visually-hidden" id="results-status" tabindex="-1" aria-live="polite">' + (unavailable ? "No products in this category" : "No results") + "</p>") +
      '<div class="results-layout' + (unavailable ? " no-rail" : "") + '">' + rail + '<div class="results-main">' + grid + "</div></div></section>";
  }

  V.S1 = function (state) {
    return state.search.view === "results" ? resultsView(state) : homeView();
  };

  // ---- S2 Product details ----------------------------------------------------

  V.S2 = function (state, ui) {
    var d = state.draft;
    var p = AE.getProduct(d.productId);
    var col = AE.getColor(d.colorId);
    var errs = ui.errors || {};
    var editing = state.editing;
    var price = AE.getPrice(d.productId, d.colorId);

    var gallery = '<div class="gallery">' + AE.galleryViews(d.productId, d.colorId).map(function (v) {
      return '<div class="gallery-item' + (v === "of" ? " wide" : "") + '">' + img(d, v, "gallery-img", photoAlt(d, v)) + "</div>";
    }).join("") + "</div>";

    // Color swatches (fabric crops of the product image)
    var colorGroup = '<fieldset class="pdp-row opt-group"><legend class="row-label">Color:</legend><div class="row-body">' +
      '<div class="swatches">' + p.colors.map(function (cid) {
        var c = AE.getColor(cid);
        return '<span class="swatch"><input type="radio" name="color" id="color-' + cid + '" value="' + cid + '" data-change="color"' + (cid === d.colorId ? " checked" : "") + ">" +
          '<label for="color-' + cid + '" style="background-image:url(' + AE.productImage(d.productId, cid, "s") + ')"><span class="visually-hidden">' + esc(c.name) + "</span></label></span>";
      }).join("") + "</div>" +
      '<p class="swatch-name">' + esc(col.name) + "</p></div></fieldset>";

    // Size
    var sizeGroup = '<fieldset class="opt-group' + (errs.size ? " has-error" : "") + '"' + (errs.size ? ' aria-describedby="err-size"' : "") + ">" +
      '<legend class="opt-legend">Size' + (d.size ? ': <span class="chosen">' + esc(d.size) + "</span>" : "") + "</legend>" +
      '<div class="size-grid" id="size-options">' + AE.SIZES.map(function (sz) {
        return '<span class="chip"><input type="radio" name="size" id="' + sizeId(sz) + '" value="' + sz + '" data-change="size"' + (sz === d.size ? " checked" : "") + (errs.size ? ' aria-invalid="true"' : "") + ">" +
          '<label for="' + sizeId(sz) + '">' + esc(sz) + "</label></span>";
      }).join("") + "</div>" + fieldError("err-size", errs.size) + "</fieldset>";

    // Length (depends on size; unavailable options stay visible, disabled, with a reason)
    var lengthNote = state.notice && state.notice.field === "length" && state.notice.route === "S2"
      ? '<p class="inline-note" id="length-note">' + icon("info") + esc(state.notice.text) + "</p>" : "";
    var lengthGroup = '<fieldset class="opt-group' + (errs.length ? " has-error" : "") + '"' + (errs.length ? ' aria-describedby="err-length"' : "") + ">" +
      '<legend class="opt-legend">Length' + (d.length ? ': <span class="chosen">' + esc(d.length) + "</span>" : "") + "</legend>" +
      (d.size ? "" : '<p class="opt-hint" id="length-hint">Choose a size first to see which lengths are available.</p>') +
      lengthNote +
      '<div class="length-grid">' + AE.LENGTHS.map(function (len) {
        var available = d.size && AE.isLengthAvailable(d.size, len);
        var unavailableForSize = d.size && !available;
        return '<span class="chip' + (unavailableForSize ? " chip-unavailable" : "") + '"><input type="radio" name="length" id="' + lengthId(len) + '" value="' + len + '" data-change="length"' +
          (len === d.length ? " checked" : "") + (!available ? " disabled" : "") + (errs.length ? ' aria-invalid="true"' : "") +
          (!d.size ? ' aria-describedby="length-hint"' : "") + ">" +
          '<label for="' + lengthId(len) + '"><span class="len-name">' + esc(len) + "</span>" + (unavailableForSize ? '<span class="len-reason"> (not available in size ' + esc(d.size) + ")</span>" : "") + "</label></span>";
      }).join("") + "</div>" + fieldError("err-length", errs.length) + "</fieldset>";

    // Quantity stepper
    var qtyGroup = '<div class="opt-group qty-group"><span class="opt-legend" id="draft-qty-label">Quantity</span>' +
      '<div class="stepper" role="group" aria-labelledby="draft-qty-label">' +
      '<button type="button" id="draft-qty-down" data-action="draftQtyDown" aria-label="Decrease quantity"' + (d.qty <= 1 ? " disabled" : "") + ">−</button>" +
      '<output id="draft-qty" aria-live="polite">' + d.qty + "</output>" +
      '<button type="button" id="draft-qty-up" data-action="draftQtyUp" aria-label="Increase quantity"' + (d.qty >= 5 ? " disabled" : "") + ">+</button></div></div>";

    // Method (no preselection; hidden in edit mode)
    var methodGroup = editing ? "" :
      '<fieldset class="opt-group' + (errs.method ? " has-error" : "") + '"' + (errs.method ? ' aria-describedby="err-method"' : "") + ">" +
      '<legend class="opt-legend">How do you want to get it?</legend>' +
      '<div class="method-options">' +
      '<label class="method-option" for="method-pickup"><input type="radio" name="method" id="method-pickup" value="pickup" data-change="method"' + (d.method === "pickup" ? " checked" : "") + (errs.method ? ' aria-invalid="true"' : "") + ">" +
      icon("store", "method-icon") + '<span><span class="method-title">Store Pickup</span><span class="method-desc">Free · Choose a nearby store and see its pickup date</span></span></label>' +
      '<label class="method-option" for="method-ship"><input type="radio" name="method" id="method-ship" value="ship" data-change="method"' + (d.method === "ship" ? " checked" : "") + (errs.method ? ' aria-invalid="true"' : "") + ">" +
      icon("truck", "method-icon") + '<span><span class="method-title">Ship to Me</span><span class="method-desc">Free standard shipping · Arrives by ' + esc(AE.SHIP_ESTIMATE) + "</span></span></label>" +
      "</div>" + fieldError("err-method", errs.method) + "</fieldset>";

    var replaceNotice = !editing && state.bag
      ? '<div class="notice notice-info">' + icon("info") + "<p>Your bag has an item. Adding this will replace it.</p></div>" : "";
    var editNotice = editing
      ? '<div class="notice notice-info">' + icon("info") + "<p>You’re editing the item in your Shopping Bag. Your delivery choice won’t change.</p></div>" : "";

    var parts = [esc(col.name), d.size && d.length ? esc(d.size + " " + d.length) : (d.size ? "Size " + esc(d.size) + " · Select a length" : "Select a size"), "Qty " + d.qty];
    if (!editing) parts.push(d.method === "pickup" ? "Store Pickup" : d.method === "ship" ? "Ship to Me" : "Select delivery");
    var btnLabel = editing ? "Update item" : d.method === "pickup" ? "Choose a store" : "Add to bag";

    var secondary = editing
      ? '<div class="secondary-links"><button type="button" class="link-button" data-action="cancelEdit">Cancel and return to bag</button></div>'
      : "";

    var crumbs = editing
      ? '<nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><button type="button" class="crumb" data-action="cancelEdit">Shopping Bag</button></li><li aria-current="page">Edit item</li></ol></nav>'
      : '<nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><button type="button" class="crumb" data-action="goHome">Home</button></li>' +
        '<li><button type="button" class="crumb" data-action="backToResults" id="back-to-results">Women’s Jeans</button></li><li aria-current="page">' + esc(p.fit) + " Jeans</li></ol></nav>";

    return '<section class="pdp wrap" data-state="S2" aria-labelledby="h1">' + crumbs +
      '<div class="pdp-grid">' + gallery +
      '<form class="buy-panel" data-form="product" novalidate>' +
      '<p class="tile-flag pdp-flag">' + esc(p.fit) + "</p>" +
      '<h1 id="h1" class="pdp-title">' + esc(p.name) + "</h1>" +
      (p.style ? '<p class="pdp-style">Style ' + esc(p.style) + "</p>" : "") +
      '<div class="pdp-row"><span class="row-label">Price:</span><div class="row-body pdp-price">' +
      '<span class="price-now">Now ' + AE.money(price.sale) + '</span> <span class="price-orig"><span class="visually-hidden">Original price </span>' + AE.money(price.orig) + '</span> <span class="save-badge inline">Save ' + AE.savePercent(d.productId, d.colorId) + "%</span></div></div>" +
      colorGroup + editNotice +
      '<div class="pdp-controls">' + sizeGroup + lengthGroup + qtyGroup + methodGroup + "</div>" +
      replaceNotice +
      '<p class="selection-summary" id="selection-summary" aria-live="polite"><span class="label">Your selection</span><strong>' + parts.join(" · ") + "</strong></p>" +
      '<button type="submit" class="btn btn-dark btn-block btn-lg" id="primary-action" data-action="submitProduct">' + icon("bag") + btnLabel + "</button>" +
      secondary +
      '<details class="pdp-details"><summary>The Details</summary><ul>' + p.details.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
      (p.style ? "<li>Style " + esc(p.style) + "</li>" : "") + "</ul></details>" +
      "</form></div></section>";
  };

  // ---- Overlay helpers ---------------------------------------------------------

  /** Render another state's page as an inert, id-free backdrop for S3/S4. */
  function underlay(html) {
    return '<div class="underlay" inert aria-hidden="true">' + html
      .replace(/\sid="[^"]*"/g, "")
      .replace(/\sdata-(action|change|form|testid)="[^"]*"/g, "")
      .replace(/\saria-live="[^"]*"/g, "")
      .replace(/\srole="(alert|status)"/g, "")
      .replace(/<h1\b/g, '<p class="h1-like"').replace(/<\/h1>/g, "</p>")
      .replace(/<form\b/g, "<div").replace(/<\/form>/g, "</div>") + "</div>";
  }

  // ---- S3 Store selection (Find a Store overlay) --------------------------------

  V.S3 = function (state, ui) {
    var change = state.storeMode === "change";
    var item = change ? state.bag : state.draft;
    var pending = change ? state.storeChange.pendingStoreId : state.draft.storeId;
    var switching = change && state.bag.method === "ship";
    var zipValid = /^\d{5}$/.test(state.zip || "");
    var back = change ? V.S5(state, {}) : V.S2(Object.assign({}, state, { notice: null }), {});

    var recap = '<div class="modal-recap">' + img(item, "f", "recap-img", "") +
      '<div><p class="recap-name">' + esc(itemName(item)) + "</p>" +
      '<p class="recap-meta">' + esc(colorName(item)) + " · " + esc(AE.fitLabel(item)) + " · Qty " + item.qty + "</p></div></div>";

    var zipForm = '<form class="zip-row" data-form="zip" novalidate>' +
      '<div class="field float' + (ui.zipError ? " has-error" : "") + '">' +
      '<input id="zip-input" name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder=" " value="' + esc(state.zip) + '"' +
      (ui.zipError ? ' aria-invalid="true" aria-describedby="zip-error"' : "") + ">" +
      '<label for="zip-input">ZIP Code</label></div>' +
      '<button type="submit" class="btn btn-dark" id="find-stores">Find stores</button></form>' +
      fieldError("zip-error", ui.zipError);

    var list = "";
    if (zipValid) {
      list = '<h2 class="stores-heading">Stores within 50 miles of ' + esc(state.zip) + ":</h2>" +
        '<p class="muted small" id="store-results-status" tabindex="-1">Store Pickup is always free.</p>' +
        '<ul class="store-list">' + AE.STORES.map(function (st) {
          var blocked = AE.isStoreBlocked(state, st.id, item);
          var selected = pending === st.id && !blocked;
          var action;
          if (blocked) {
            action = '<button type="button" class="btn btn-outline btn-sm" id="store-' + st.id + '" disabled>Unavailable for ' + esc(AE.variantLabel(item)) + "</button>";
          } else if (selected) {
            action = '<span class="selected-badge" id="store-' + st.id + '-status">' + icon("check") + "Selected for pickup</span>";
          } else {
            action = '<button type="button" class="btn btn-outline btn-sm" id="store-' + st.id + '" data-action="selectStore" data-store="' + st.id + '">Use this store for pickup<span class="visually-hidden">: ' + esc(st.name) + "</span></button>";
          }
          return '<li class="store-row' + (selected ? " is-selected" : "") + (blocked ? " is-blocked" : "") + '" data-store-row="' + st.id + '">' +
            '<p class="store-ready">' + (blocked ? "Currently unavailable" : "Ready for pickup by <strong>" + esc(st.date) + "</strong>") + "</p>" +
            '<div class="store-main">' + storeBadge(st) + '<p class="store-name">' + esc(st.name) + "</p></div>" +
            '<div class="store-foot"><p class="store-meta">' + esc(st.distance.replace(" mi", " miles")) + " away</p>" +
            '<div class="store-actions">' + action + "</div></div></li>";
        }).join("") + "</ul>";
    }

    var selectedStore = pending ? AE.getStore(pending) : null;
    var reason = selectedStore
      ? '<p class="reason">Pickup at <strong>' + esc(selectedStore.name) + "</strong> · Ready " + esc(selectedStore.date) + "</p>"
      : '<p class="reason">' + (zipValid ? "Choose a store to continue." : "Enter your ZIP code to see nearby stores.") + "</p>";

    var footer = change
      ? '<div class="modal-footer">' + reason + '<div class="modal-footer-actions">' +
        '<button type="button" class="btn btn-outline" data-action="cancelStoreChange" id="cancel-store">Cancel</button>' +
        '<button type="button" class="btn btn-dark" data-action="updateStore" id="update-store"' + (pending ? "" : " disabled") + ">Update store</button></div></div>"
      : '<div class="modal-footer">' + reason + '<div class="modal-footer-actions">' +
        '<button type="button" class="btn btn-outline" data-action="backToProduct" id="back-to-product">Back</button>' +
        '<button type="button" class="btn btn-dark" data-action="addPickupToBag" id="add-to-bag"' + (pending ? "" : " disabled") + ">Add to bag</button></div></div>";

    var intro = change
      ? (switching ? "Choose a store to switch this item to Store Pickup. Cancel keeps Ship to Me." : "Choose a different pickup store. Your bag won’t change until you select Update store.")
      : "Selecting a store doesn’t add the item to your bag. Select Add to bag when you’re ready.";

    return underlay(back) +
      '<div class="overlay-scrim" aria-hidden="true"></div>' +
      '<section class="modal" data-state="S3" role="dialog" aria-modal="true" aria-labelledby="h1">' +
      '<div class="modal-head"><h1 id="h1">' + (change ? "Change Pickup Store" : "Choose a Pickup Store") + "</h1>" +
      '<button type="button" class="icon-button modal-close" data-action="' + (change ? "cancelStoreChange" : "backToProduct") + '" aria-label="' + (change ? "Close and keep your current choice" : "Close and go back to the product") + '">' + icon("close") + "</button></div>" +
      '<div class="modal-body"><p class="modal-intro">' + intro + "</p>" + noticeHtml(state, "S3") + recap + zipForm + list + "</div>" +
      footer + "</section>";
  };

  // ---- S4 Added to bag (right drawer) ---------------------------------------------

  V.S4 = function (state) {
    var b = state.bag;
    var l = AE.priceLines(b);
    var back = state.draft.productId ? V.S2(Object.assign({}, state, { notice: null, bag: null }), {}) : homeView();
    var store = b.method === "pickup" ? AE.getStore(b.storeId) : null;
    var fulfil = b.method === "pickup"
      ? '<div class="fulfil-card">' + (store ? storeBadge(store) : "") + "<div><p class=\"fulfil-title\">Store Pickup · Free</p>" +
        "<p>" + (store ? esc(store.name) : "No store selected") + "</p>" +
        (store ? '<p class="fulfil-date">Ready for pickup ' + esc(store.date) + "</p>" : "") + "</div></div>"
      : '<div class="fulfil-card">' + icon("truck", "fulfil-icon") + '<div><p class="fulfil-title">Ship to Me · Free</p><p class="fulfil-date">Estimated delivery ' + esc(AE.SHIP_ESTIMATE) + "</p></div></div>";

    return underlay(back) +
      '<div class="overlay-scrim" aria-hidden="true"></div>' +
      '<section class="drawer" data-state="S4" role="dialog" aria-modal="true" aria-labelledby="h1">' +
      '<div class="drawer-head"><h1 id="h1">Added to bag!</h1></div>' +
      '<div class="drawer-body">' +
      '<div class="drawer-item">' + img(b, "f", "drawer-img", "") +
      '<div><p class="drawer-name">' + esc(itemName(b)) + "</p>" +
      '<p class="drawer-price"><span class="price-sale">' + AE.money(l.subtotal) + '</span> <span class="price-orig"><span class="visually-hidden">Original price </span>' + AE.money(l.merch) + "</span></p>" +
      '<dl class="specs"><dt>Color:</dt><dd>' + esc(colorName(b)) + "</dd><dt>Size:</dt><dd>" + esc(b.size) + "</dd><dt>Length:</dt><dd>" + esc(b.length) + "</dd><dt>Qty:</dt><dd>" + b.qty + "</dd>" +
      (b.qty > 1 ? "<dt>Each:</dt><dd>" + AE.money(l.unitSale) + "</dd>" : "") + "</dl></div></div>" +
      fulfil +
      '<div class="drawer-actions"><button type="button" class="btn btn-outline" data-action="keepShopping" id="keep-shopping">Keep shopping</button>' +
      '<button type="button" class="btn btn-dark" data-action="viewBag" id="view-bag">View bag</button></div>' +
      "</div></section>";
  };

  // ---- S5 Shopping bag ---------------------------------------------------------

  /** Observed on ae.com in the bag and checkout. */
  function notReserved() {
    return '<p class="not-reserved"><span aria-hidden="true">⏳</span> Items in bag are not reserved. Check out now before they sell out!</p>';
  }

  function deliveryToggle(b) {
    return '<div class="delivery-toggle" role="group" aria-label="Delivery method">' +
      '<button type="button" id="seg-ship" data-action="methodShip" aria-pressed="' + (b.method === "ship") + '">' + (b.method === "ship" ? icon("check", "seg-check") : "") + "Ship to Me</button>" +
      '<button type="button" id="seg-pickup" data-action="methodPickup" aria-pressed="' + (b.method === "pickup") + '">' + (b.method === "pickup" ? icon("check", "seg-check") : "") + "Store Pickup</button></div>";
  }

  V.S5 = function (state) {
    var b = state.bag;
    if (!b) {
      return '<section class="bag-page wrap" data-state="S5" aria-labelledby="h1">' +
        '<h1 id="h1" class="page-title">Shopping Bag</h1>' + noticeHtml(state, "S5") +
        '<div class="empty-bag"><p>Your Shopping Bag is empty.</p>' +
        '<button type="button" class="btn btn-dark" data-action="goSearch" id="go-search">Continue shopping</button></div></section>';
    }
    var store = b.method === "pickup" ? AE.getStore(b.storeId) : null;
    var needsStore = b.method === "pickup" && !store;
    var l = AE.priceLines(b);

    var summary = '<section class="bag-summary" aria-labelledby="summary-h">' +
      '<h2 id="summary-h" class="section-title">Order Summary</h2>' +
      '<div class="summary-box">' + summaryLines(b) +
      '<button type="button" class="btn btn-blue btn-block btn-lg" data-action="goCheckout" id="checkout-button"' + (needsStore ? ' disabled aria-describedby="checkout-reason"' : "") + ">Checkout</button>" +
      (needsStore ? '<p class="checkout-reason" id="checkout-reason">' + icon("alert") + "Choose a store to continue.</p>" : "") +
      '<div class="summary-context">' + (b.method === "pickup" ? icon("store") : icon("truck")) + "<div>" +
      "<p><strong>" + (b.method === "pickup" ? "Store Pickup" : "Ship to Me") + "</strong></p>" +
      (b.method === "pickup"
        ? (store ? "<p>" + esc(store.name) + "</p><p>Ready " + esc(store.date) + "</p>" : '<p class="muted">No store selected</p>')
        : "<p>Estimated delivery " + esc(AE.SHIP_ESTIMATE) + "</p>") +
      "</div></div></div></section>";

    var line = '<div class="bag-items"><h2 class="section-title">1 Item</h2>' + notReserved() +
      '<div class="line-item">' + '<span class="tile-media">' + img(b, "f", "line-img", "") + '<span class="save-badge">Save ' + AE.savePercent(b.productId, b.colorId) + "%</span></span>" +
      '<div class="line-info">' +
      '<p class="line-title">' + esc(itemName(b)) + "</p>" +
      '<p class="line-price">' + priceInline(b.productId, b.colorId, b.qty) + (b.qty > 1 ? ' <span class="muted small">(' + AE.money(l.unitSale) + " each)</span>" : "") + "</p>" +
      itemSpecs(b, { noQty: true }) +
      '<div class="qty-row"><span id="qty-label">Qty:</span>' +
      '<div class="stepper" role="group" aria-labelledby="qty-label">' +
      '<button type="button" id="qty-down" data-action="qtyDown" aria-label="Decrease quantity"' + (b.qty <= 1 ? " disabled" : "") + ">−</button>" +
      '<output id="qty-value" aria-live="polite">' + b.qty + "</output>" +
      '<button type="button" id="qty-up" data-action="qtyUp" aria-label="Increase quantity"' + (b.qty >= 5 ? " disabled" : "") + ">+</button>" +
      "</div></div>" +
      '<div class="line-links"><button type="button" class="link-button" data-action="editItem" id="edit-item">Edit item</button>' +
      '<button type="button" class="link-button" data-action="removeItem" id="remove-item">Remove</button></div>' +
      "</div></div></div>";

    var detail;
    if (b.method === "ship") {
      detail = '<div class="pickup-card">' + icon("truck", "fulfil-icon") + '<div class="pickup-card-body"><p class="pickup-ready">Free standard shipping</p>' +
        '<p class="pickup-store">Estimated delivery ' + esc(AE.SHIP_ESTIMATE) + "</p></div></div>";
    } else if (store) {
      detail = '<div class="pickup-card"><div class="pickup-card-body">' +
        '<p class="pickup-ready">1 item will be ready by <strong>' + esc(store.date) + "</strong>:</p>" +
        '<div class="store-main">' + storeBadge(store) + '<p class="pickup-store">' + esc(store.name) + "</p></div>" +
        '<div class="store-foot"><p class="store-meta">' + esc(store.distance.replace(" mi", " miles")) + " away · Free</p>" +
        '<button type="button" class="btn btn-outline btn-sm" data-action="changeStore" id="change-store">Change store</button></div></div></div>';
    } else {
      detail = '<div class="pickup-card missing">' + icon("alert", "warn-icon") + '<div class="pickup-card-body"><p class="pickup-store">No pickup store selected.</p>' +
        "<p>Choose a store to see the pickup date.</p>" +
        '<button type="button" class="btn btn-dark btn-sm" data-action="changeStore" id="change-store">Change store</button></div></div>';
    }
    var fulfil = '<div class="bag-delivery" role="group" aria-labelledby="fulfil-h">' +
      '<h2 id="fulfil-h" class="section-title">Delivery Options</h2>' + deliveryToggle(b) + detail + "</div>";

    return '<section class="bag-page wrap" data-state="S5" aria-labelledby="h1">' +
      '<h1 id="h1" class="page-title">Shopping Bag</h1>' + noticeHtml(state, "S5") +
      '<div class="two-col"><div class="col-main">' + line + fulfil + "</div>" + summary + "</div></section>";
  };

  // ---- S6 Checkout -----------------------------------------------------------------

  function inputField(state, f, ui) {
    var id = "f-" + f.id;
    var err = ui.errors && ui.errors[f.id];
    var value = state[f.group][f.id] || "";
    var describedBy = [];
    if (f.hint) describedBy.push(id + "-hint");
    if (err) describedBy.push(id + "-error");
    var autocomplete = f.group === "payment" ? "off" : (f.autocomplete || "on");
    return '<div class="field float' + (err ? " has-error" : "") + '">' +
      '<input id="' + id + '" name="' + f.id + '" type="' + (f.type || "text") + '" data-field="' + f.id + '" data-group="' + f.group + '"' +
      ' value="' + esc(value) + '" placeholder=" " autocomplete="' + autocomplete + '"' + (f.inputmode ? ' inputmode="' + f.inputmode + '"' : "") +
      (f.group === "payment" ? ' spellcheck="false"' : "") +
      (err ? ' aria-invalid="true"' : "") + (describedBy.length ? ' aria-describedby="' + describedBy.join(" ") + '"' : "") + ">" +
      '<label for="' + id + '">' + esc(f.label) + "</label>" +
      (f.hint ? '<p class="field-hint" id="' + id + '-hint">' + esc(f.hint) + "</p>" : "") +
      fieldError(id + "-error", err) + "</div>";
  }

  function checkoutItem(b) {
    return '<div class="co-item">' + '<span class="tile-media">' + img(b, "f", "co-img", "") + "</span>" +
      '<div><p class="line-title">' + esc(itemName(b)) + "</p>" +
      '<p class="line-price">' + priceInline(b.productId, b.colorId, b.qty) + "</p>" +
      itemSpecs(b) + "</div></div>";
  }

  /** Order summary used on S6: product, color, size and length, qty, method, store, date, total. */
  function orderSummaryPanel(state, b, button) {
    return '<section class="co-summary" aria-labelledby="order-h">' +
      '<div class="co-bag-head"><h2 id="order-h" class="section-title">Shopping Bag</h2><span class="muted small">1 item</span></div>' +
      checkoutItem(b) +
      '<dl class="kv">' + fulfilmentRows(b) + "</dl>" +
      '<h2 class="section-title">Order Summary</h2>' +
      '<div class="summary-box">' + summaryLines(b, { totalLabel: "Order Total:" }) + (button || "") +
      '<p class="charge-note">Simulated checkout. No card is charged and no order is sent.</p></div>' +
      '<button type="button" class="link-button" data-action="backToBag" id="back-to-bag-summary">Edit in bag</button>' +
      "</section>";
  }

  V.S6 = function (state, ui) {
    var b = state.bag;
    var fields = AE.checkoutFields(b.method);
    var store = b.method === "pickup" ? AE.getStore(b.storeId) : null;
    var summary = ui.summary && ui.summary.length
      ? '<div class="error-summary" id="error-summary" role="alert">' +
        "<h2>" + icon("alert") + "Please fix " + (ui.summary.length === 1 ? "1 problem" : ui.summary.length + " problems") + " to continue</h2><ul>" +
        ui.summary.map(function (e) {
          return '<li data-summary-field="' + e.field + '"><a href="#f-' + e.field + '" data-action="focusField" data-target="f-' + e.field + '">' + esc(e.message) + "</a></li>";
        }).join("") + "</ul></div>"
      : "";
    var recoveryBanner = state.recovery.message
      ? '<div class="notice notice-success" id="recovery-banner">' + icon("check") + "<p>" + esc(state.recovery.message) + "</p></div>" : "";

    var delivery = b.method === "pickup"
      ? '<h2 class="section-title">Store Pickup</h2><div class="pickup-card"><div class="pickup-card-body">' +
        '<p class="pickup-ready">' + b.qty + (b.qty === 1 ? " item" : " items") + " will be ready by <strong>" + esc(store.date) + "</strong>:</p>" +
        '<div class="store-main">' + storeBadge(store) + '<p class="pickup-store">' + esc(store.name) + "</p></div>" +
        '<div class="store-foot"><p class="store-meta">' + esc(store.distance.replace(" mi", " miles")) + " away · Free</p>" +
        '<button type="button" class="link-button" data-action="backToBag" id="change-in-bag">Change in bag</button></div></div></div>' +
        '<p class="pickup-note">We’ll email you with instructions when your order is ready for pickup.</p>'
      : '<h2 class="section-title">Ship To Me</h2><div class="pickup-card">' + icon("truck", "fulfil-icon") + '<div class="pickup-card-body">' +
        '<p class="pickup-store">Free standard shipping</p><p>Estimated delivery ' + esc(AE.SHIP_ESTIMATE) + "</p>" +
        '<button type="button" class="link-button" data-action="backToBag" id="change-in-bag">Change in bag</button></div></div>';

    var contactFields = b.method === "pickup"
      ? fields.contact.map(function (f) { return inputField(state, f, ui); }).join("")
      : fields.contact.slice(0, 3).map(function (f) { return inputField(state, f, ui); }).join("") +
        '<div class="field-grid">' + fields.contact.slice(3).map(function (f) { return inputField(state, f, ui); }).join("") + "</div>";

    var form = '<form class="co-form" id="checkout-form" data-form="checkout" novalidate aria-labelledby="h1">' +
      '<div class="fictional-note">' + icon("info") + "<p>Use fictional details. Don’t enter real personal or payment information.</p>" +
      '<button type="button" class="link-button" data-action="fillSample" id="fill-sample">Use sample details</button></div>' +
      delivery +
      '<fieldset class="form-section"><legend class="section-title">' + (b.method === "pickup" ? "Pickup Person" : "Shipping Address") + "</legend>" +
      contactFields + "</fieldset>" +
      '<fieldset class="form-section"><legend class="section-title">Payment (Simulated)</legend>' +
      inputField(state, fields.payment[0], ui) +
      '<div class="field-grid two">' + inputField(state, fields.payment[1], ui) + inputField(state, fields.payment[2], ui) + "</div>" +
      "</fieldset></form>";

    var button = '<button type="submit" form="checkout-form" class="btn btn-blue btn-block btn-lg" id="checkout-submit" data-action="submitCheckout">' + esc(AE.checkoutButtonLabel(state)) + "</button>";

    return '<section class="checkout-page wrap" data-state="S6" aria-labelledby="h1">' +
      '<div class="page-head"><h1 id="h1" class="page-title">Checkout</h1>' +
      '<button type="button" class="link-button" data-action="backToBag" id="back-to-bag">← Back to bag</button></div>' +
      recoveryBanner + summary +
      '<div class="two-col"><div class="col-main">' + form + "</div>" + orderSummaryPanel(state, b, button) + "</div></section>";
  };

  // ---- S7 Availability recovery [SIMULATED event] -------------------------------------

  V.S7 = function (state) {
    var b = state.bag;
    var blocked = state.recovery.blocked;
    var failed = AE.getStore(blocked.storeId);
    var variant = AE.variantLabel(b);
    var c = state.checkout, pay = state.payment;
    var digits = (pay.cardNumber || "").replace(/\D/g, "");

    var alternatives = AE.STORES.filter(function (st) { return !AE.isStoreBlocked(state, st.id, b); });
    var altList = '<ul class="store-list alt-stores">' + alternatives.map(function (st) {
      return '<li class="store-row" data-store-row="' + st.id + '">' +
        '<p class="store-ready">Ready for pickup by <strong>' + esc(st.date) + "</strong></p>" +
        '<div class="store-main">' + storeBadge(st) + '<p class="store-name">' + esc(st.name) + "</p></div>" +
        '<div class="store-foot"><p class="store-meta">' + esc(st.distance.replace(" mi", " miles")) + " away</p>" +
        '<div class="store-actions"><button type="button" class="btn btn-dark btn-sm" id="alt-' + st.id + '" data-action="chooseReplacement" data-store="' + st.id + '">Use this store for pickup<span class="visually-hidden">: ' + esc(st.name) + "</span></button></div></div></li>";
    }).join("") + "</ul>";

    var details = '<dl class="kv">' +
      "<dt>Pickup person</dt><dd>" + esc(c.name) + "</dd>" +
      "<dt>Email</dt><dd>" + esc(c.email) + "</dd>" +
      "<dt>Phone</dt><dd>" + esc(c.phone) + "</dd>" +
      "<dt>Payment</dt><dd>" + (digits ? "Simulated card ending " + esc(digits.slice(-4)) : "Simulated card") + "</dd></dl>";

    return '<section class="recovery-page wrap" data-state="S7" aria-labelledby="h1">' +
      '<div class="recovery-alert" role="alert">' + icon("alert", "recovery-icon") +
      '<div><h1 id="h1">' + esc(failed.name) + " can no longer fulfill " + esc(variant) + "</h1>" +
      "<p>Your order has not been placed. Nothing was lost: your item, pickup choice, and checkout details are saved. Choose another store to continue.</p></div>" +
      "</div>" +
      '<div class="two-col"><div class="col-main">' +
      '<h2 class="section-title">Choose another pickup store</h2>' +
      '<p class="muted">These stores can fulfill ' + esc(variant) + ".</p>" + altList +
      '<div class="secondary-links"><button type="button" class="link-button" data-action="returnToBag" id="return-to-bag">Return to bag</button></div></div>' +
      '<section class="co-summary" aria-labelledby="saved-h"><h2 id="saved-h" class="section-title">Saved for you</h2>' +
      checkoutItem(b) +
      '<dl class="kv"><dt>Delivery</dt><dd>Store Pickup · Free</dd><dt>Order Total</dt><dd>' + AE.money(AE.priceLines(b).total) + "</dd></dl>" +
      '<h3 class="sub-title">Your details</h3>' + details + "</section></div></section>";
  };

  // ---- S8 Order confirmation ---------------------------------------------------------

  V.S8 = function (state) {
    var o = state.order, s = o.snapshot;
    var item = { productId: s.productId, colorId: s.colorId };
    var fulfil = s.method === "pickup"
      ? "<dt>Delivery</dt><dd>Store Pickup · Free</dd><dt>Pickup store</dt><dd>" + esc(s.storeName) + "</dd><dt>Pickup date</dt><dd>Ready " + esc(s.pickupDate) + "</dd>"
      : "<dt>Delivery</dt><dd>Ship to Me · Free</dd><dt>Estimated delivery</dt><dd>" + esc(s.shipEstimate) + "</dd>";
    var lines = s.lines;
    return '<section class="confirm-page wrap" data-state="S8" aria-labelledby="h1">' +
      '<div class="confirm-head">' + icon("check", "confirm-check") +
      '<div><h1 id="h1" class="page-title">Order placed (simulated)</h1>' +
      '<p class="order-number">Order number <strong data-testid="order-number">' + esc(o.number) + "</strong></p></div></div>" +
      '<div class="notice notice-info sim-note">' + icon("info") + "<p><strong>No real order or payment was made.</strong> Nothing was charged, reserved or shipped.</p></div>" +
      '<div class="two-col"><div class="col-main">' +
      '<h2 class="section-title">' + (s.method === "pickup" ? "Pickup Details" : "Delivery Details") + "</h2>" +
      '<div class="co-item">' + '<span class="tile-media">' + img(item, "f", "co-img", "") + "</span>" +
      '<div><p class="line-title">' + esc(s.productName) + "</p>" +
      '<dl class="detail-list">' +
      "<dt>Color</dt><dd>" + esc(s.colorName) + "</dd>" +
      "<dt>Size</dt><dd>" + esc(s.size) + "</dd>" +
      "<dt>Length</dt><dd>" + esc(s.length) + "</dd>" +
      "<dt>Quantity</dt><dd>" + s.qty + "</dd>" + fulfil +
      "<dt>Payment</dt><dd>Simulated card</dd>" +
      "</dl></div></div></div>" +
      '<section class="co-summary" aria-labelledby="sum-h"><h2 id="sum-h" class="section-title">Order Summary</h2>' +
      '<div class="summary-box"><dl class="summary-lines">' +
      "<dt>Merchandise:</dt><dd>" + AE.money(lines.merch) + "</dd>" +
      '<dt>Savings:</dt><dd class="saving">' + AE.money(-lines.savings) + "</dd>" +
      "<dt>" + (s.method === "pickup" ? "Store Pickup:" : "Shipping:") + "</dt><dd>Free</dd>" +
      "<dt>Estimated tax (simulated):</dt><dd>" + AE.money(lines.tax) + "</dd>" +
      '<dt class="total">Order Total:</dt><dd class="total" data-testid="order-total">' + AE.money(lines.total) + "</dd></dl>" +
      '<button type="button" class="btn btn-dark btn-block btn-lg" data-action="startOver" id="start-over">Start over</button></div></section>' +
      "</div></section>";
  };

  V.render = function (state, ui) {
    var fn = V[state.route] || V.S1;
    return fn(state, ui || {});
  };

  V.esc = esc;
  AE.views = V;
})(window.AE = window.AE || {});

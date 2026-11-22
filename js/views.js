/* views.js: S1–S8 render functions. Each returns an HTML string built only
 * from the central state (plus transient validation feedback in `ui`).
 * Views never keep private copies of state.
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

  function priceHtml(productId, colorId) {
    var p = AE.getPrice(productId, colorId);
    return '<span class="price-sale">' + AE.money(p.sale) + '</span>' +
      '<span class="price-orig"><span class="visually-hidden">Original price </span>' + AE.money(p.orig) + "</span>";
  }

  function noticeHtml(state, route) {
    var n = state.notice;
    if (!n || n.route !== route || n.field) return "";
    return '<div class="notice notice-' + esc(n.kind || "info") + '" role="status"><p>' + esc(n.text) + "</p></div>";
  }

  function fieldError(id, msg) {
    return msg ? '<p class="field-error" id="' + id + '">' + esc(msg) + "</p>" : "";
  }

  function itemName(item) { return AE.getProduct(item.productId).name; }
  function colorName(item) { return AE.getColor(item.colorId).name; }

  /** Method / store / date rows shared by S4, S5, S6 (memory scaffold, F3). */
  function fulfilmentRows(item) {
    if (item.method === "ship") {
      return "<dt>Method</dt><dd>Ship to me (free)</dd>" +
        "<dt>Estimated delivery</dt><dd>" + esc(AE.SHIP_ESTIMATE) + "</dd>";
    }
    var store = AE.getStore(item.storeId);
    return "<dt>Method</dt><dd>Store pickup (free)</dd>" +
      "<dt>Pickup store</dt><dd>" + (store ? esc(store.name) : '<span class="checkout-reason">No store selected</span>') + "</dd>" +
      "<dt>Pickup date</dt><dd>" + (store ? "Ready " + esc(store.date) : "—") + "</dd>";
  }

  function summaryLines(item) {
    var l = AE.priceLines(item);
    return '<dl class="summary-lines">' +
      "<dt>Merchandise (" + l.qty + (l.qty === 1 ? " item" : " items") + ")</dt><dd>" + AE.money(l.merch) + "</dd>" +
      '<dt>Savings</dt><dd class="saving">' + AE.money(-l.savings) + "</dd>" +
      "<dt>" + (item.method === "pickup" ? "Store pickup" : "Shipping") + "</dt><dd>Free</dd>" +
      "<dt>Estimated tax (simulated)</dt><dd>" + AE.money(l.tax) + "</dd>" +
      '<dt class="total">Total</dt><dd class="total" data-testid="order-total">' + AE.money(l.total) + "</dd>" +
      "</dl>";
  }

  V.title = function (state) {
    return {
      S1: "Product search", S2: "Product details", S3: "Store selection", S4: "Added to bag",
      S5: "Shopping bag", S6: "Checkout", S7: "Availability recovery", S8: "Order confirmation"
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

  // ---- S1 Product search -----------------------------------------------------

  V.S1 = function (state) {
    var q = state.search.query || "";
    var cards = AE.searchCards(q);
    var bagLink = state.bag
      ? '<button type="button" class="btn btn-secondary btn-sm bag-link" data-action="viewBag">Bag (1)</button>'
      : "";
    var status = q.trim()
      ? (cards.length ? cards.length + (cards.length === 1 ? " result" : " results") + " for “" + esc(q.trim()) + "”" : "")
      : "Showing all " + cards.length + " jeans";
    var results = cards.length
      ? '<ul class="results-grid">' + cards.map(function (c) {
          var p = AE.getProduct(c.productId), col = AE.getColor(c.colorId);
          return '<li><button type="button" class="result-card" id="card-' + c.id + '" data-action="openCard" data-card="' + c.id + '">' +
            AE.jeansSvg(c.productId, c.colorId) +
            '<span class="card-body"><span class="card-name">' + esc(p.name) + "</span>" +
            '<span class="card-color">' + esc(col.name) + "</span>" +
            "<span>" + priceHtml(c.productId, c.colorId) + "</span></span></button></li>";
        }).join("") + "</ul>"
      : '<div class="notice notice-info"><p>No jeans match “' + esc(q.trim()) + "”. Try “baggy”.</p></div>";

    return '<section data-state="S1" aria-labelledby="h1">' +
      '<div class="page-head"><h1 id="h1">Find your jeans</h1>' + bagLink + "</div>" +
      '<form class="search-form" data-form="search" role="search">' +
      '<div class="search-field"><label for="search-input">Search jeans</label>' +
      '<input id="search-input" type="search" name="q" value="' + esc(q) + '" placeholder="Try a style, wash, or style number" autocomplete="off"></div>' +
      '<button type="submit" class="btn btn-primary" id="search-button">Search</button></form>' +
      (status ? '<p class="results-status" id="results-status" tabindex="-1" aria-live="polite">' + status + "</p>" : '<p class="visually-hidden" id="results-status" tabindex="-1" aria-live="polite">No results</p>') +
      results + "</section>";
  };

  // ---- S2 Product details ----------------------------------------------------

  V.S2 = function (state, ui) {
    var d = state.draft;
    var p = AE.getProduct(d.productId);
    var col = AE.getColor(d.colorId);
    var errs = ui.errors || {};
    var editing = state.editing;

    // Color
    var colorGroup;
    if (p.colors.length > 1) {
      colorGroup = '<fieldset class="opt-group"><legend>Color: <span class="chosen">' + esc(col.name) + "</span></legend>" +
        '<div class="chip-row">' + p.colors.map(function (cid) {
          var c = AE.getColor(cid);
          return '<span class="chip swatch"><input type="radio" name="color" id="color-' + cid + '" value="' + cid + '" data-change="color"' + (cid === d.colorId ? " checked" : "") + ">" +
            '<label for="color-' + cid + '"><span class="swatch-dot" style="background:' + c.hex + '" aria-hidden="true"></span>' + esc(c.name) + "</label></span>";
        }).join("") + "</div></fieldset>";
    } else {
      colorGroup = '<p class="opt-group"><strong class="method-title" style="display:inline">Color:</strong> ' + esc(col.name) + "</p>";
    }

    // Size
    var sizeGroup = '<fieldset class="opt-group' + (errs.size ? " has-error" : "") + '"' + (errs.size ? ' aria-describedby="err-size"' : "") + ">" +
      '<legend>Size' + (d.size ? ': <span class="chosen">' + esc(d.size) + "</span>" : "") + "</legend>" +
      '<div class="chip-row" id="size-options">' + AE.SIZES.map(function (sz) {
        return '<span class="chip"><input type="radio" name="size" id="' + sizeId(sz) + '" value="' + sz + '" data-change="size"' + (sz === d.size ? " checked" : "") + (errs.size ? ' aria-invalid="true"' : "") + ">" +
          '<label for="' + sizeId(sz) + '">' + esc(sz) + "</label></span>";
      }).join("") + "</div>" + fieldError("err-size", errs.size) + "</fieldset>";

    // Length (depends on size; unavailable options stay visible, disabled, with a reason)
    var lengthNote = state.notice && state.notice.field === "length" && state.notice.route === "S2"
      ? '<p class="notice notice-info small" id="length-note">' + esc(state.notice.text) + "</p>" : "";
    var lengthGroup = '<fieldset class="opt-group' + (errs.length ? " has-error" : "") + '"' + (errs.length ? ' aria-describedby="err-length"' : "") + ">" +
      '<legend>Length' + (d.length ? ': <span class="chosen">' + esc(d.length) + "</span>" : "") + "</legend>" +
      (d.size ? "" : '<p class="opt-hint" id="length-hint">Choose a size first to see which lengths are available.</p>') +
      lengthNote +
      '<div class="chip-row length-list">' + AE.LENGTHS.map(function (len) {
        var available = d.size && AE.isLengthAvailable(d.size, len);
        var disabled = !available;
        var text = esc(len) + (d.size && !available ? " (not available in size " + esc(d.size) + ")" : "");
        return '<span class="chip"><input type="radio" name="length" id="' + lengthId(len) + '" value="' + len + '" data-change="length"' +
          (len === d.length ? " checked" : "") + (disabled ? " disabled" : "") + (errs.length ? ' aria-invalid="true"' : "") +
          (!d.size ? ' aria-describedby="length-hint"' : "") + ">" +
          '<label for="' + lengthId(len) + '">' + text + "</label></span>";
      }).join("") + "</div>" + fieldError("err-length", errs.length) + "</fieldset>";

    // Quantity
    var qtyGroup = '<div class="opt-group"><label for="qty-select" class="method-title">Quantity</label>' +
      '<select id="qty-select" class="qty-select" data-change="qty">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (n === d.qty ? " selected" : "") + ">" + n + "</option>"; }).join("") +
      "</select></div>";

    // Method (no preselection; hidden in edit mode)
    var methodGroup = editing ? "" :
      '<fieldset class="opt-group' + (errs.method ? " has-error" : "") + '"' + (errs.method ? ' aria-describedby="err-method"' : "") + ">" +
      "<legend>How do you want to get it?</legend>" +
      '<div class="method-options">' +
      '<div class="method-option"><label for="method-pickup"><input type="radio" name="method" id="method-pickup" value="pickup" data-change="method"' + (d.method === "pickup" ? " checked" : "") + (errs.method ? ' aria-invalid="true"' : "") + ">" +
      '<span><span class="method-title">Store pickup</span><span class="method-desc">Free. Choose a nearby store next and see its pickup date.</span></span></label></div>' +
      '<div class="method-option"><label for="method-ship"><input type="radio" name="method" id="method-ship" value="ship" data-change="method"' + (d.method === "ship" ? " checked" : "") + (errs.method ? ' aria-invalid="true"' : "") + ">" +
      '<span><span class="method-title">Ship to me</span><span class="method-desc">Free standard shipping. Estimated delivery ' + esc(AE.SHIP_ESTIMATE) + ".</span></span></label></div>" +
      "</div>" + fieldError("err-method", errs.method) + "</fieldset>";

    var replaceNotice = !editing && state.bag
      ? '<div class="notice notice-info"><p>Your bag has an item. Adding this will replace it.</p></div>' : "";
    var editNotice = editing
      ? '<div class="notice notice-info"><p>You’re editing the item in your bag. Your pickup or shipping choice stays the same.</p></div>' : "";

    // Selection summary beside the primary button
    var parts = [esc(col.name), d.size && d.length ? esc(d.size + " " + d.length) : (d.size ? "Size " + esc(d.size) + " · length not chosen" : "Size not chosen"), "qty " + d.qty];
    if (!editing) parts.push(d.method === "pickup" ? "Store pickup" : d.method === "ship" ? "Ship to me" : "method not chosen");
    var btnLabel = editing ? "Update item" : d.method === "pickup" ? "Choose a store" : "Add to bag";

    var secondary = editing
      ? '<div class="secondary-links"><button type="button" class="link-button" data-action="cancelEdit">Cancel and return to bag</button></div>'
      : '<div class="secondary-links"><button type="button" class="link-button" data-action="backToResults">Back to search results</button></div>';

    return '<section data-state="S2" aria-labelledby="h1">' +
      '<div class="product-layout">' +
      '<div class="product-media">' + AE.jeansSvg(d.productId, d.colorId) + "</div>" +
      '<form class="product-info" data-form="product" novalidate>' +
      (p.style ? '<p class="style">Style ' + esc(p.style) + "</p>" : "") +
      '<h1 id="h1">' + esc(p.name) + "</h1>" +
      '<p class="product-price">' + priceHtml(d.productId, d.colorId) + "</p>" +
      editNotice + colorGroup + sizeGroup + lengthGroup + qtyGroup + methodGroup + replaceNotice +
      '<div class="buy-bar">' +
      '<p class="selection-summary" id="selection-summary" aria-live="polite"><span class="label">Your selection</span><strong>' + parts.join(" · ") + "</strong></p>" +
      '<button type="submit" class="btn btn-primary" id="primary-action" data-action="submitProduct">' + btnLabel + "</button>" +
      "</div>" + secondary + "</form></div></section>";
  };

  // ---- S3 Store selection ----------------------------------------------------

  V.S3 = function (state, ui) {
    var change = state.storeMode === "change";
    var item = change ? state.bag : state.draft;
    var pending = change ? state.storeChange.pendingStoreId : state.draft.storeId;
    var switching = change && state.bag.method === "ship";
    var zipValid = /^\d{5}$/.test(state.zip || "");

    var recap = '<div class="panel item-recap">' + AE.jeansSvg(item.productId, item.colorId, { label: "" }) +
      '<div><p class="line-title">' + esc(itemName(item)) + "</p>" +
      '<p class="muted">' + esc(colorName(item)) + " · " + esc(AE.fitLabel(item)) + " · qty " + item.qty + "</p></div></div>";

    var zipForm = '<form class="zip-row" data-form="zip" novalidate>' +
      '<div class="field' + (ui.zipError ? " has-error" : "") + '"><label for="zip-input">ZIP code</label>' +
      '<input id="zip-input" name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="' + esc(state.zip) + '"' +
      (ui.zipError ? ' aria-invalid="true" aria-describedby="zip-error"' : "") + "></div>" +
      '<button type="submit" class="btn btn-secondary" id="find-stores">Find stores</button></form>' +
      fieldError("zip-error", ui.zipError);

    var list = "";
    if (zipValid) {
      list = '<p class="muted small" id="store-results-status" tabindex="-1">Sample stores near ' + esc(state.zip) + ". Pickup is free.</p>" +
        '<ul class="store-list">' + AE.STORES.map(function (st) {
          var blocked = AE.isStoreBlocked(state, st.id, item);
          var selected = pending === st.id && !blocked;
          var action;
          if (blocked) {
            action = '<button type="button" class="btn btn-secondary btn-sm" id="store-' + st.id + '" disabled>Unavailable for ' + esc(AE.variantLabel(item)) + "</button>";
          } else if (selected) {
            action = '<span class="selected-badge" id="store-' + st.id + '-status">✓ Selected for pickup</span>';
          } else {
            action = '<button type="button" class="btn btn-secondary btn-sm" id="store-' + st.id + '" data-action="selectStore" data-store="' + st.id + '">Use this store for pickup<span class="visually-hidden">: ' + esc(st.name) + "</span></button>";
          }
          return '<li class="store-row' + (selected ? " is-selected" : "") + (blocked ? " is-blocked" : "") + '" data-store-row="' + st.id + '">' +
            '<div><p class="store-name">' + esc(st.name) + "</p>" +
            '<p class="store-meta">' + esc(st.distance) + " away · <strong>Ready for pickup " + esc(st.date) + "</strong></p></div>" +
            '<div class="store-actions">' + action + "</div></li>";
        }).join("") + "</ul>";
    }

    var selectedStore = pending ? AE.getStore(pending) : null;
    var reason = selectedStore
      ? '<p class="reason">Picking up at <strong>' + esc(selectedStore.name) + "</strong>, ready " + esc(selectedStore.date) + ".</p>"
      : '<p class="reason">' + (zipValid ? "Choose a store to continue." : "Enter your ZIP code to see nearby stores.") + "</p>";

    var footer = change
      ? '<div class="store-footer">' + reason + '<div class="store-footer-right">' +
        '<button type="button" class="btn btn-secondary" data-action="cancelStoreChange" id="cancel-store">Cancel</button>' +
        '<button type="button" class="btn btn-primary" data-action="updateStore" id="update-store"' + (pending ? "" : " disabled") + ">Update store</button></div></div>"
      : '<div class="store-footer">' + reason + '<div class="store-footer-right">' +
        '<button type="button" class="btn btn-secondary" data-action="backToProduct" id="back-to-product">Back</button>' +
        '<button type="button" class="btn btn-primary" data-action="addPickupToBag" id="add-to-bag"' + (pending ? "" : " disabled") + ">Add to bag</button></div></div>";

    var intro = change
      ? (switching ? "Choose a store to switch this item to free store pickup. Cancel keeps Ship to me." : "Choose a different pickup store. Your bag won’t change until you press Update store.")
      : "Choosing a store doesn’t add anything to your bag. Press Add to bag when you’re ready.";

    return '<section data-state="S3" aria-labelledby="h1">' +
      '<h1 id="h1">' + (change ? "Change pickup store" : "Choose a pickup store") + "</h1>" +
      '<p class="muted">' + intro + "</p>" + noticeHtml(state, "S3") +
      recap +
      '<div class="panel">' + zipForm + list + footer + "</div></section>";
  };

  // ---- S4 Added to bag -------------------------------------------------------

  V.S4 = function (state) {
    var b = state.bag;
    var l = AE.priceLines(b);
    return '<section data-state="S4" aria-labelledby="h1" class="narrow">' +
      '<div class="panel">' +
      '<div class="confirm-head"><span class="check-circle" aria-hidden="true">✓</span><h1 id="h1">Added to your bag</h1></div>' +
      '<p class="muted">' + (b.method === "pickup" ? "Store pickup is set for this item." : "Ship to me is set for this item.") + "</p>" +
      '<div class="item-block">' + AE.jeansSvg(b.productId, b.colorId, { label: "" }) +
      "<div><p class=\"line-title\">" + esc(itemName(b)) + "</p>" +
      '<dl class="detail-list">' +
      "<dt>Color</dt><dd>" + esc(colorName(b)) + "</dd>" +
      "<dt>Size</dt><dd>" + esc(b.size) + "</dd>" +
      "<dt>Length</dt><dd>" + esc(b.length) + "</dd>" +
      "<dt>Quantity</dt><dd>" + b.qty + "</dd>" +
      "<dt>Price</dt><dd>" + AE.money(l.subtotal) + (b.qty > 1 ? ' <span class="muted">(' + AE.money(l.unitSale) + " each)</span>" : "") + "</dd>" +
      fulfilmentRows(b) +
      "</dl></div></div>" +
      '<div class="actions-row"><button type="button" class="btn btn-primary" data-action="viewBag" id="view-bag">View bag</button>' +
      '<button type="button" class="btn btn-secondary" data-action="keepShopping" id="keep-shopping">Keep shopping</button></div>' +
      "</div></section>";
  };

  // ---- S5 Shopping bag -------------------------------------------------------

  V.S5 = function (state) {
    var b = state.bag;
    if (!b) {
      return '<section data-state="S5" aria-labelledby="h1">' +
        '<h1 id="h1">Shopping bag</h1>' + noticeHtml(state, "S5") +
        '<div class="panel empty-bag"><p>Your bag is empty.</p>' +
        '<button type="button" class="btn btn-primary" data-action="goSearch" id="go-search">Search for jeans</button></div></section>';
    }
    var store = b.method === "pickup" ? AE.getStore(b.storeId) : null;
    var needsStore = b.method === "pickup" && !store;
    var l = AE.priceLines(b);

    var summary = '<aside class="panel bag-summary" aria-labelledby="summary-h">' +
      '<h2 id="summary-h">Order summary</h2>' + summaryLines(b) +
      '<button type="button" class="btn btn-primary btn-block" data-action="goCheckout" id="checkout-button"' + (needsStore ? ' disabled aria-describedby="checkout-reason"' : "") + ">Checkout</button>" +
      (needsStore ? '<p class="checkout-reason" id="checkout-reason">Choose a store to continue.</p>' : "") +
      '<div class="summary-context">' +
      "<p><strong>" + (b.method === "pickup" ? "Store pickup" : "Ship to me") + "</strong></p>" +
      (b.method === "pickup"
        ? (store ? "<p>" + esc(store.name) + "</p><p>Ready " + esc(store.date) + "</p>" : '<p class="muted">No store selected</p>')
        : "<p>Estimated delivery " + esc(AE.SHIP_ESTIMATE) + "</p>") +
      "</div></aside>";

    var line = '<div class="panel">' +
      '<div class="line-item">' + AE.jeansSvg(b.productId, b.colorId, { label: "" }) +
      "<div>" +
      '<p class="line-title">' + esc(itemName(b)) + "</p>" +
      '<dl class="detail-list">' +
      "<dt>Color</dt><dd>" + esc(colorName(b)) + "</dd>" +
      "<dt>Size</dt><dd>" + esc(b.size) + "</dd>" +
      "<dt>Length</dt><dd>" + esc(b.length) + "</dd></dl>" +
      '<div class="qty-row"><span id="qty-label">Quantity</span>' +
      '<div class="stepper" role="group" aria-labelledby="qty-label">' +
      '<button type="button" id="qty-down" data-action="qtyDown" aria-label="Decrease quantity"' + (b.qty <= 1 ? " disabled" : "") + ">−</button>" +
      '<output id="qty-value" aria-live="polite">' + b.qty + "</output>" +
      '<button type="button" id="qty-up" data-action="qtyUp" aria-label="Increase quantity"' + (b.qty >= 5 ? " disabled" : "") + ">+</button>" +
      "</div></div>" +
      '<div class="line-links"><button type="button" class="link-button" data-action="editItem" id="edit-item">Edit item</button>' +
      '<button type="button" class="link-button danger" data-action="removeItem" id="remove-item">Remove</button></div>' +
      "</div>" +
      '<div class="line-price">' + '<span class="price-sale">' + AE.money(l.subtotal) + "</span>" +
      '<span class="price-orig"><span class="visually-hidden">Original price </span>' + AE.money(l.merch) + "</span>" +
      (b.qty > 1 ? '<p class="muted small">' + AE.money(l.unitSale) + " each</p>" : "") + "</div>" +
      "</div></div>";

    var detail;
    if (b.method === "ship") {
      detail = '<div class="fulfil-detail"><p><strong>Ship to me</strong> · Free standard shipping<br>Estimated delivery <strong>' + esc(AE.SHIP_ESTIMATE) + "</strong></p></div>";
    } else if (store) {
      detail = '<div class="fulfil-detail"><p><strong>' + esc(store.name) + "</strong><br>Ready for pickup <strong>" + esc(store.date) + "</strong> · Free</p>" +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="changeStore" id="change-store">Change store</button></div>';
    } else {
      detail = '<div class="fulfil-detail missing"><p><strong>No pickup store selected.</strong><br>Choose a store to see the pickup date.</p>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="changeStore" id="change-store">Change store</button></div>';
    }
    var fulfil = '<div class="panel" role="group" aria-labelledby="fulfil-h">' +
      '<h2 id="fulfil-h">How you’ll get it</h2>' +
      '<div class="segmented">' +
      '<button type="button" id="seg-pickup" data-action="methodPickup" aria-pressed="' + (b.method === "pickup") + '">Store pickup</button>' +
      '<button type="button" id="seg-ship" data-action="methodShip" aria-pressed="' + (b.method === "ship") + '">Ship to me</button>' +
      "</div>" + detail + "</div>";

    return '<section data-state="S5" aria-labelledby="h1">' +
      '<h1 id="h1">Shopping bag</h1>' + noticeHtml(state, "S5") +
      '<div class="bag-layout"><div class="bag-main">' + line + fulfil + "</div>" + summary + "</div></section>";
  };

  // ---- S6–S8 (Phase 3) -------------------------------------------------------

  V.render = function (state, ui) {
    var fn = V[state.route] || V.S1;
    return fn(state, ui || {});
  };

  V.esc = esc;
  V.summaryLines = summaryLines;
  V.fulfilmentRows = fulfilmentRows;
  V.noticeHtml = noticeHtml;
  V.fieldError = fieldError;
  AE.views = V;
})(window.AE = window.AE || {});

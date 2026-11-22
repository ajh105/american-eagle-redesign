/* state.js: the single central state object, pure update functions, persistence.
 *
 * Every action is a pure function (state, args) -> new state. They never touch
 * the DOM. main.js dispatches them, persists the result, and re-renders.
 *
 * Persistence: sessionStorage key "aeProto.v1", written after every change,
 * EXCLUDING `payment` (card number, expiry, CVV live in memory only).
 */
(function (AE) {
  "use strict";

  var STORAGE_KEY = "aeProto.v1";

  function emptyCheckout() {
    return { name: "", email: "", phone: "", address1: "", city: "", state: "", zip: "" };
  }
  function emptyPayment() {
    return { cardNumber: "", exp: "", cvv: "" };
  }
  function emptyDraft() {
    return { productId: null, colorId: null, size: null, length: null, qty: 1, method: null, storeId: null };
  }

  AE.initialState = function () {
    return {
      route: "S1",
      search: { query: "" },
      zip: "",                    // last valid ZIP searched on S3
      draft: emptyDraft(),        // S2 selection in progress (+ storeId chosen on S3 in add mode)
      bag: null,                  // single line item [DESIGN]
      editing: false,             // S2 in edit mode
      storeMode: "add",           // "add" (from S2) | "change" (from S5)
      storeChange: { pendingStoreId: null, prev: null }, // S3 change mode: nothing is written to bag until Update store
      checkout: emptyCheckout(),  // fictional values; persisted for the session
      payment: emptyPayment(),    // MEMORY ONLY: never persisted
      recoveryUsed: false,
      recovery: { active: false, blocked: null, message: null },
      order: null,
      notice: null                // { route, text, kind }: one-off inline message shown on a state
    };
  };

  // ---- Helpers -----------------------------------------------------------

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /** Exact product variant: product | color | size | length. */
  AE.variantKey = function (item) {
    if (!item) return null;
    return [item.productId, item.colorId, item.size, item.length].join("|");
  };

  /** A store is blocked only while the item's variant equals the recorded failed variant. */
  AE.isStoreBlocked = function (state, storeId, item) {
    var b = state.recovery.blocked;
    return !!(b && item && b.storeId === storeId && b.variantKey === AE.variantKey(item));
  };

  AE.variantLabel = function (item) {
    var c = AE.getColor(item.colorId);
    return item.size + " " + item.length + " in " + (c ? c.name : "");
  };

  /** Size-length label such as "10 Long". */
  AE.fitLabel = function (item) { return item.size + " " + item.length; };

  function itemFromDraft(d) {
    return { productId: d.productId, colorId: d.colorId, size: d.size, length: d.length, qty: d.qty };
  }

  /** If the item's current store is blocked for its variant, clear it and return a message. */
  function revalidateStore(s, holder) {
    if (holder && holder.storeId && AE.isStoreBlocked(s, holder.storeId, holder)) {
      var store = AE.getStore(holder.storeId);
      holder.storeId = null;
      return store.name + " can't fulfill " + AE.variantLabel(holder) + ". Choose another store to continue.";
    }
    return null;
  }

  // ---- S2 draft validation ----------------------------------------------

  /** Returns ordered list of {field, message}. requireMethod=false in edit mode. */
  AE.validateDraft = function (draft, requireMethod) {
    var errs = [];
    if (!draft.size) errs.push({ field: "size", message: "Choose a size." });
    if (!draft.length) errs.push({ field: "length", message: draft.size ? "Choose a length." : "Choose a length (pick a size first)." });
    else if (draft.size && !AE.isLengthAvailable(draft.size, draft.length)) errs.push({ field: "length", message: "That length isn't available in size " + draft.size + "." });
    if (requireMethod && !draft.method) errs.push({ field: "method", message: "Choose Store pickup or Ship to me." });
    return errs;
  };

  // ---- Checkout fields and validation [DESIGN] ---------------------------

  AE.checkoutFields = function (method) {
    var contact = method === "pickup"
      ? [
          { id: "name", group: "checkout", label: "Pickup person full name", autocomplete: "name" },
          { id: "email", group: "checkout", label: "Email", type: "email", autocomplete: "email" },
          { id: "phone", group: "checkout", label: "Phone", type: "tel", autocomplete: "tel" }
        ]
      : [
          { id: "name", group: "checkout", label: "Full name", autocomplete: "name" },
          { id: "email", group: "checkout", label: "Email", type: "email", autocomplete: "email" },
          { id: "address1", group: "checkout", label: "Address line 1", autocomplete: "address-line1" },
          { id: "city", group: "checkout", label: "City", autocomplete: "address-level2" },
          { id: "state", group: "checkout", label: "State", hint: "2 letters, e.g. AZ", autocomplete: "address-level1" },
          { id: "zip", group: "checkout", label: "ZIP code", hint: "5 digits", autocomplete: "postal-code", inputmode: "numeric" }
        ];
    var payment = [
      { id: "cardNumber", group: "payment", label: "Simulated card number", hint: "12–19 digits", inputmode: "numeric" },
      { id: "exp", group: "payment", label: "Expiry (MM/YY)", hint: "MM/YY", inputmode: "numeric" },
      { id: "cvv", group: "payment", label: "CVV", hint: "3–4 digits", inputmode: "numeric" }
    ];
    return { contact: contact, payment: payment, all: contact.concat(payment) };
  };

  AE.validateField = function (id, value) {
    var v = String(value || "").trim();
    switch (id) {
      case "name": return v ? null : "Enter a full name.";
      case "email": return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : (v ? "Enter an email like name@example.com." : "Enter an email address.");
      case "phone":
        var digits = v.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15 && /^[\d\s().+-]+$/.test(v) ? null : (v ? "Enter a phone number with 7–15 digits." : "Enter a phone number.");
      case "address1": return v ? null : "Enter a street address.";
      case "city": return v ? null : "Enter a city.";
      case "state": return /^[A-Za-z]{2}$/.test(v) ? null : (v ? "Use a 2-letter state, e.g. AZ." : "Enter a state.");
      case "zip": return /^\d{5}$/.test(v) ? null : (v ? "ZIP code must be 5 digits." : "Enter a ZIP code.");
      case "cardNumber":
        return /^[\d ]+$/.test(v) && v.replace(/ /g, "").length >= 12 && v.replace(/ /g, "").length <= 19 ? null : (v ? "Card number must be 12–19 digits." : "Enter a simulated card number.");
      case "exp":
        var m = /^(\d{2})\/(\d{2})$/.exec(v);
        return m && +m[1] >= 1 && +m[1] <= 12 ? null : (v ? "Use MM/YY, e.g. 12/30." : "Enter an expiry date.");
      case "cvv": return /^\d{3,4}$/.test(v) ? null : (v ? "CVV must be 3 or 4 digits." : "Enter a CVV.");
    }
    return null;
  };

  /** Ordered list of {field, message} for the current order's method. */
  AE.validateCheckout = function (state) {
    if (!state.bag) return [];
    var fields = AE.checkoutFields(state.bag.method).all;
    var errs = [];
    fields.forEach(function (f) {
      var msg = AE.validateField(f.id, state[f.group][f.id]);
      if (msg) errs.push({ field: f.id, message: msg });
    });
    return errs;
  };

  /** S6 primary button label. */
  AE.checkoutButtonLabel = function (state) {
    return state.bag && state.bag.method === "pickup" && !state.recoveryUsed ? "Review order" : "Place simulated order";
  };

  // ---- Actions (pure): (state, args) -> new state --------------------------

  var A = {};

  A.reset = function () {
    var s = AE.initialState();
    s.route = "S1";
    return s;
  };

  A.setSearch = function (s, a) { s.search.query = a.query; return s; };

  // S1 -> S2
  A.openCard = function (s, a) {
    var card = AE.CARDS.filter(function (c) { return c.id === a.cardId; })[0];
    if (!card) return s;
    s.draft = emptyDraft();
    s.draft.productId = card.productId;
    s.draft.colorId = card.colorId;
    s.editing = false;
    s.notice = null;
    s.route = "S2";
    return s;
  };

  // S2 selections
  A.setDraftColor = function (s, a) { s.draft.colorId = a.colorId; return s; };
  A.setDraftSize = function (s, a) {
    s.draft.size = a.size;
    if (s.draft.length && !AE.isLengthAvailable(a.size, s.draft.length)) {
      s.notice = { route: "S2", kind: "info", field: "length", text: "Length cleared: " + s.draft.length + " isn't available in size " + a.size + "." };
      s.draft.length = null;
    } else if (s.notice && s.notice.field === "length") {
      s.notice = null;
    }
    return s;
  };
  A.setDraftLength = function (s, a) {
    if (s.draft.size && AE.isLengthAvailable(s.draft.size, a.length)) s.draft.length = a.length;
    if (s.notice && s.notice.field === "length") s.notice = null;
    return s;
  };
  A.setDraftQty = function (s, a) { s.draft.qty = Math.max(1, Math.min(5, a.qty | 0)); return s; };
  A.setDraftMethod = function (s, a) { s.draft.method = a.method; return s; };

  // S2 -> S3 (pickup)
  A.chooseStore = function (s) {
    s.storeMode = "add";
    s.route = "S3";
    return s;
  };

  // S2 -> S4 (ship)
  A.addShipToBag = function (s) {
    var item = itemFromDraft(s.draft);
    item.method = "ship";
    item.storeId = null;
    s.bag = item;
    s.recovery.message = null;
    s.route = "S4";
    return s;
  };

  // S3
  A.setZip = function (s, a) { s.zip = a.zip; return s; };
  A.selectStore = function (s, a) {
    if (s.storeMode === "change") s.storeChange.pendingStoreId = a.storeId;
    else s.draft.storeId = a.storeId;
    return s;
  };
  A.addPickupToBag = function (s) {
    if (!s.draft.storeId) return s;
    var item = itemFromDraft(s.draft);
    item.method = "pickup";
    item.storeId = s.draft.storeId;
    if (AE.isStoreBlocked(s, item.storeId, item)) return s;
    s.bag = item;
    s.recovery.message = null;
    s.route = "S4";
    return s;
  };
  A.backToProduct = function (s) { s.route = "S2"; return s; };

  // S3 change mode (opened from S5). The bag is never written until Update store.
  A.openChangeStore = function (s) {
    if (!s.bag) return s;
    s.storeMode = "change";
    s.storeChange = { pendingStoreId: s.bag.storeId, prev: { method: s.bag.method, storeId: s.bag.storeId } };
    s.route = "S3";
    return s;
  };
  A.updateStore = function (s) {
    var id = s.storeChange.pendingStoreId;
    if (!s.bag || !id || AE.isStoreBlocked(s, id, s.bag)) return s;
    var changed = s.bag.method !== "pickup" || s.bag.storeId !== id;
    s.bag.method = "pickup";
    s.bag.storeId = id;
    if (changed) s.recovery.message = null;
    s.storeChange = { pendingStoreId: null, prev: null };
    var store = AE.getStore(id);
    s.notice = { route: "S5", kind: "success", text: "Pickup store updated to " + store.name + ", ready " + store.date + "." };
    s.route = "S5";
    return s;
  };
  A.cancelStoreChange = function (s) {
    s.storeChange = { pendingStoreId: null, prev: null };
    s.route = "S5";
    return s;
  };

  // S4
  A.viewBag = function (s) { s.route = "S5"; return s; };
  A.keepShopping = function (s) { s.draft = emptyDraft(); s.route = "S1"; return s; };

  // S5
  A.editItem = function (s) {
    if (!s.bag) return s;
    s.draft = itemFromDraft(s.bag);
    s.draft.method = s.bag.method;
    s.draft.storeId = s.bag.storeId;
    s.editing = true;
    s.route = "S2";
    return s;
  };
  A.updateItem = function (s) {
    if (!s.bag) return s;
    s.bag.productId = s.draft.productId;
    s.bag.colorId = s.draft.colorId;
    s.bag.size = s.draft.size;
    s.bag.length = s.draft.length;
    s.bag.qty = s.draft.qty;
    var msg = revalidateStore(s, s.bag);
    s.editing = false;
    s.notice = msg
      ? { route: "S5", kind: "warning", text: msg }
      : { route: "S5", kind: "success", text: "Item updated: " + AE.variantLabel(s.bag) + ", qty " + s.bag.qty + "." };
    if (msg) s.recovery.message = null;
    s.route = "S5";
    return s;
  };
  A.cancelEdit = function (s) { s.editing = false; s.route = "S5"; return s; };
  A.setBagQty = function (s, a) {
    if (s.bag) s.bag.qty = Math.max(1, Math.min(5, a.qty | 0));
    return s;
  };
  A.switchToShip = function (s) {
    if (!s.bag) return s;
    s.bag.method = "ship";
    s.bag.storeId = null;
    s.recovery.message = null;
    s.notice = { route: "S5", kind: "info", text: "Switched to Ship to me. Estimated delivery " + AE.SHIP_ESTIMATE + "." };
    return s;
  };
  A.removeItem = function (s) {
    // Keeps recoveryUsed and recovery.blocked for the whole session.
    s.bag = null;
    s.draft = emptyDraft();
    s.notice = { route: "S5", kind: "info", text: "Item removed from your bag." };
    return s;
  };
  A.goCheckout = function (s) {
    if (!s.bag || (s.bag.method === "pickup" && !s.bag.storeId)) return s;
    s.route = "S6";
    return s;
  };

  // S6
  A.setField = function (s, a) { s[a.group][a.field] = a.value; return s; };
  A.fillSample = function (s) {
    s.checkout.name = "Alex Sample";
    s.checkout.email = "alex@example.com";
    s.checkout.phone = "555-0100";
    if (s.bag && s.bag.method === "ship") {
      s.checkout.address1 = "100 Sample St";
      s.checkout.city = "Phoenix";
      s.checkout.state = "AZ";
      s.checkout.zip = "85001";
    }
    s.payment.cardNumber = "4111 1111 1111 1111";
    s.payment.exp = "12/30";
    s.payment.cvv = "123";
    return s;
  };
  A.backToBag = function (s) { s.route = "S5"; return s; };

  /** S6 primary button. Callers validate first; this re-checks so S7/S8 are never reached invalid. */
  A.submitCheckout = function (s) {
    if (!s.bag || AE.validateCheckout(s).length) return s;
    if (s.bag.method === "pickup" && !s.bag.storeId) return s;
    if (s.bag.method === "pickup" && !s.recoveryUsed) {
      // [SIMULATED] recovery event: fires once per session at the first valid pickup review,
      // for whichever store is selected at that moment.
      s.recoveryUsed = true;
      s.recovery.blocked = { storeId: s.bag.storeId, variantKey: AE.variantKey(s.bag) };
      s.recovery.active = true;
      s.recovery.message = null;
      s.bag.storeId = null;
      s.route = "S7";
      return s;
    }
    var store = s.bag.method === "pickup" ? AE.getStore(s.bag.storeId) : null;
    var product = AE.getProduct(s.bag.productId);
    s.order = {
      number: AE.ORDER_NUMBER,
      snapshot: {
        productName: product.name,
        style: product.style,
        productId: s.bag.productId,
        colorId: s.bag.colorId,
        colorName: AE.getColor(s.bag.colorId).name,
        size: s.bag.size,
        length: s.bag.length,
        qty: s.bag.qty,
        method: s.bag.method,
        storeName: store ? store.name : null,
        pickupDate: store ? store.date : null,
        shipEstimate: s.bag.method === "ship" ? AE.SHIP_ESTIMATE : null,
        contactName: s.checkout.name,
        lines: AE.priceLines(s.bag)
      }
    };
    s.payment = emptyPayment(); // never retained once the simulated order is placed
    s.route = "S8";
    return s;
  };

  // S7
  A.chooseReplacement = function (s, a) {
    if (!s.bag || !s.recovery.active) return s;
    if (AE.isStoreBlocked(s, a.storeId, s.bag) || !AE.getStore(a.storeId)) return s;
    s.bag.storeId = a.storeId;
    s.recovery.active = false;
    var store = AE.getStore(a.storeId);
    s.recovery.message = "Pickup store changed to " + store.name + " (" + store.shortDate + "). Review your order, then place it.";
    s.route = "S6";
    return s;
  };
  A.returnToBagFromRecovery = function (s) {
    // Pickup stays the intended method; the unavailable store and its date stay cleared.
    s.recovery.active = false;
    if (s.bag) { s.bag.method = "pickup"; s.bag.storeId = null; }
    s.notice = { route: "S5", kind: "warning", text: "Pickup is still your method. Choose a new store to continue to checkout." };
    s.route = "S5";
    return s;
  };

  // S8
  A.startOver = function () { return A.reset(); };

  AE.actions = A;

  /** Apply an action purely: returns a new state; the input is untouched. */
  AE.reduce = function (state, name, args) {
    if (!A[name]) throw new Error("Unknown action: " + name);
    return A[name](clone(state), args || {});
  };

  // ---- Persistence (sessionStorage, payment excluded) ---------------------

  var memoryFallback = null;

  AE.persist = function (state) {
    var copy = clone(state);
    delete copy.payment; // never persisted
    var json = JSON.stringify(copy);
    try { window.sessionStorage.setItem(STORAGE_KEY, json); }
    catch (e) { memoryFallback = json; }
  };

  AE.restore = function () {
    var json = null;
    try { json = window.sessionStorage.getItem(STORAGE_KEY); }
    catch (e) { json = memoryFallback; }
    var base = AE.initialState();
    if (!json) return base;
    try {
      var saved = JSON.parse(json);
      // Shallow-merge known keys only; payment always starts empty.
      Object.keys(base).forEach(function (k) {
        if (k !== "payment" && saved[k] !== undefined) base[k] = saved[k];
      });
      base.checkout = Object.assign(emptyCheckout(), base.checkout || {});
      base.draft = Object.assign(emptyDraft(), base.draft || {});
      base.recovery = Object.assign({ active: false, blocked: null, message: null }, base.recovery || {});
      base.storeChange = Object.assign({ pendingStoreId: null, prev: null }, base.storeChange || {});
    } catch (e) { return AE.initialState(); }
    return base;
  };

  AE.STORAGE_KEY = STORAGE_KEY;
})(window.AE = window.AE || {});

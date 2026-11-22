/* main.js: owns the single state object, dispatches actions, syncs the hash,
 * renders the current state, and manages focus. Event handling is delegated
 * via data-action / data-field attributes so views stay plain HTML strings.
 */
(function (AE) {
  "use strict";

  var state = null;
  // Transient UI feedback (validation messages). Not part of the shopping state.
  var ui = { errors: {}, summary: [], zipError: null, focusField: null };

  function clearUi() { ui = { errors: {}, summary: [], zipError: null, focusField: null }; }

  AE.getState = function () { return state; };

  // ---- Commit / render -----------------------------------------------------

  function commit(next, prevRoute, opts) {
    state = next;
    AE.persist(state);
    var routeChanged = state.route !== prevRoute;
    if (routeChanged) clearUi();
    var wanted = AE.routeToHash(state.route);
    if (location.hash !== wanted) {
      if (opts && opts.replace) location.replace(wanted);
      else location.hash = wanted;
    }
    render(routeChanged);
  }

  function dispatch(name, args) {
    var prev = state.route;
    var next = AE.reduce(state, name, args);
    var g = AE.guard(next, next.route, prev);
    commit(g.state, prev);
  }
  AE.dispatch = dispatch;

  /** Update state without re-rendering (typing in text fields). */
  function silentUpdate(name, args) {
    state = AE.reduce(state, name, args);
    AE.persist(state);
  }

  function render(routeChanged) {
    var main = document.getElementById("main");
    var activeId = document.activeElement && document.activeElement.id;
    var scrollY = window.scrollY;

    main.innerHTML = AE.views.render(state, ui);
    main.setAttribute("data-state", state.route);
    document.getElementById("footer-state").textContent = "Screen " + state.route;
    document.title = AE.views.title(state) + " – AE Pickup Prototype";

    if (routeChanged) {
      window.scrollTo(0, 0);
      focusHeading();
    } else if (ui.focusField) {
      var el = document.getElementById(ui.focusField);
      ui.focusField = null;
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "center" });
      }
    } else {
      window.scrollTo(0, scrollY);
      var again = activeId && document.getElementById(activeId);
      if (again && !again.disabled) again.focus({ preventScroll: true });
      else if (activeId) focusHeading(true);
    }
  }

  function focusHeading(preventScroll) {
    var h1 = document.querySelector("#main h1");
    if (h1) {
      h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: !!preventScroll });
    }
  }

  // ---- Hash routing ---------------------------------------------------------

  function onHashChange() {
    var requested = AE.hashToRoute(location.hash);
    if (requested && requested === state.route) return; // already rendered by dispatch
    var prev = state.route;
    var g = AE.guard(state, requested || state.route, prev);
    commit(g.state, prev, { replace: g.route !== requested });
  }

  // ---- Form handlers --------------------------------------------------------

  function submitProduct() {
    var d = state.draft;
    var errs = AE.validateDraft(d, !state.editing);
    if (errs.length) {
      ui.errors = {};
      errs.forEach(function (e) { ui.errors[e.field] = e.message; });
      ui.focusField = AE.views.firstControlId(state, errs[0].field);
      render(false);
      return;
    }
    if (state.editing) dispatch("updateItem");
    else if (d.method === "pickup") dispatch("chooseStore");
    else dispatch("addShipToBag");
  }

  function submitZip(form) {
    var input = form.querySelector("#zip-input");
    var zip = input.value.trim();
    if (!/^\d{5}$/.test(zip)) {
      ui.zipError = zip ? "Enter a 5-digit ZIP code, like 85392." : "Enter a ZIP code to find stores.";
      ui.focusField = "zip-input";
      render(false);
      return;
    }
    ui.zipError = null;
    dispatch("setZip", { zip: zip });
    var first = document.querySelector(".store-list");
    if (first) {
      var status = document.getElementById("store-results-status");
      if (status) status.focus();
    }
  }

  function submitCheckout() {
    var errs = AE.validateCheckout(state);
    if (errs.length) {
      ui.errors = {};
      errs.forEach(function (e) { ui.errors[e.field] = e.message; });
      ui.summary = errs;
      ui.focusField = "f-" + errs[0].field;
      render(false);
      return;
    }
    clearUi();
    dispatch("submitCheckout");
  }

  /** Clear a field's error as soon as its value becomes valid. */
  function revalidateField(field, value) {
    if (!ui.errors[field]) return;
    var msg = AE.validateField(field, value);
    if (msg) return;
    delete ui.errors[field];
    ui.summary = ui.summary.filter(function (e) { return e.field !== field; });
    var input = document.getElementById("f-" + field);
    if (input) {
      input.removeAttribute("aria-invalid");
      var err = document.getElementById("f-" + field + "-error");
      if (err) err.remove();
      var wrap = input.closest(".field");
      if (wrap) wrap.classList.remove("has-error");
    }
    var item = document.querySelector('[data-summary-field="' + field + '"]');
    if (item) item.remove();
    if (!ui.summary.length) {
      var box = document.getElementById("error-summary");
      if (box) box.remove();
    }
  }

  // ---- Event delegation ----------------------------------------------------

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-action]");
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
    var action = el.getAttribute("data-action");
    switch (action) {
      case "skip":
        ev.preventDefault();
        focusHeading();
        return;
      case "resetDemo":
        ev.preventDefault();
        clearUi();
        state.payment = { cardNumber: "", exp: "", cvv: "" };
        dispatch("reset");
        focusHeading();
        return;
      case "openCard": dispatch("openCard", { cardId: el.getAttribute("data-card") }); return;
      case "submitProduct": ev.preventDefault(); submitProduct(); return;
      case "backToResults": dispatch("keepShopping"); return;
      case "cancelEdit": dispatch("cancelEdit"); return;
      case "selectStore": dispatch("selectStore", { storeId: el.getAttribute("data-store") }); return;
      case "addPickupToBag": dispatch("addPickupToBag"); return;
      case "backToProduct": dispatch("backToProduct"); return;
      case "updateStore": dispatch("updateStore"); return;
      case "cancelStoreChange": dispatch("cancelStoreChange"); return;
      case "viewBag": dispatch("viewBag"); return;
      case "keepShopping": dispatch("keepShopping"); return;
      case "editItem": dispatch("editItem"); return;
      case "removeItem": dispatch("removeItem"); focusHeading(); return;
      case "qtyDown": dispatch("setBagQty", { qty: state.bag.qty - 1 }); return;
      case "qtyUp": dispatch("setBagQty", { qty: state.bag.qty + 1 }); return;
      case "methodShip":
        if (state.bag && state.bag.method !== "ship") dispatch("switchToShip");
        return;
      case "methodPickup":
        if (state.bag && state.bag.method === "pickup" && state.bag.storeId) return;
        dispatch("openChangeStore");
        return;
      case "changeStore": dispatch("openChangeStore"); return;
      case "goCheckout": dispatch("goCheckout"); return;
      case "goSearch": dispatch("keepShopping"); return;
      case "fillSample":
        ev.preventDefault();
        state = AE.reduce(state, "fillSample");
        AE.persist(state);
        ui.errors = {}; ui.summary = [];
        ui.focusField = "f-name";
        render(false);
        return;
      case "submitCheckout": ev.preventDefault(); submitCheckout(); return;
      case "backToBag": dispatch("backToBag"); return;
      case "chooseReplacement": dispatch("chooseReplacement", { storeId: el.getAttribute("data-store") }); return;
      case "returnToBag": dispatch("returnToBagFromRecovery"); return;
      case "startOver":
        clearUi();
        state.payment = { cardNumber: "", exp: "", cvv: "" };
        dispatch("startOver");
        return;
    }
  });

  document.addEventListener("change", function (ev) {
    var t = ev.target;
    var kind = t.getAttribute("data-change");
    if (!kind) return;
    switch (kind) {
      case "color": dispatch("setDraftColor", { colorId: t.value }); break;
      case "size":
        delete ui.errors.size;
        dispatch("setDraftSize", { size: t.value });
        break;
      case "length":
        delete ui.errors.length;
        dispatch("setDraftLength", { length: t.value });
        break;
      case "qty": dispatch("setDraftQty", { qty: parseInt(t.value, 10) }); break;
      case "method":
        delete ui.errors.method;
        dispatch("setDraftMethod", { method: t.value });
        break;
    }
  });

  document.addEventListener("input", function (ev) {
    var t = ev.target;
    var field = t.getAttribute("data-field");
    if (!field) return;
    var group = t.getAttribute("data-group");
    silentUpdate("setField", { group: group, field: field, value: t.value });
    revalidateField(field, t.value);
  });

  document.addEventListener("submit", function (ev) {
    var form = ev.target;
    var kind = form.getAttribute("data-form");
    if (!kind) return;
    ev.preventDefault();
    if (kind === "search") {
      var q = form.querySelector("#search-input").value;
      dispatch("setSearch", { query: q });
      var status = document.getElementById("results-status");
      if (status) status.focus();
    } else if (kind === "zip") submitZip(form);
    else if (kind === "product") submitProduct();
    else if (kind === "checkout") submitCheckout();
  });

  // ---- Boot -------------------------------------------------------------------

  function boot() {
    state = AE.restore();
    var requested = AE.hashToRoute(location.hash) || state.route || "S1";
    var g = AE.guard(state, requested, null);
    state = g.state;
    AE.persist(state);
    var wanted = AE.routeToHash(state.route);
    if (location.hash !== wanted) location.replace(wanted);
    render(false);
    window.addEventListener("hashchange", onHashChange);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.AE = window.AE || {});

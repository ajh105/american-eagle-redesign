/* router.js: hash routing (#/s1 … #/s8) with a guard run on every hashchange and on load.
 * Hash routing keeps the prototype working from file:// and under a GitHub Pages
 * project path (no server rewrites needed).
 */
(function (AE) {
  "use strict";

  var ROUTES = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

  AE.routeToHash = function (route) { return "#/" + route.toLowerCase(); };

  AE.hashToRoute = function (hash) {
    var m = /^#\/(s[1-8])$/i.exec(hash || "");
    return m ? m[1].toUpperCase() : null;
  };

  function draftReadyForStore(s) {
    return s.draft.productId && s.draft.method === "pickup" && AE.validateDraft(s.draft, true).length === 0;
  }

  /**
   * Decide which route is allowed and apply route-entry effects. Pure:
   * returns { state, route } with a new state object when something changed.
   */
  AE.guard = function (state, requested, fromRoute) {
    var s = JSON.parse(JSON.stringify(state));
    s.payment = state.payment; // keep memory-only payment through the clone
    var route = ROUTES.indexOf(requested) >= 0 ? requested : "S1";

    // A placed order is final: stay on S8 until Start over.
    if (s.order) route = "S8";
    else if (route === "S8") route = "S1";

    // While recovery is active the shopper is on S7. Reaching S5 (e.g. browser
    // Back to the bag) counts as "Return to bag"; anything else returns to S7.
    if (s.recovery.active && route !== "S7") {
      if (route === "S5") {
        s = AE.reduce(s, "returnToBagFromRecovery");
        s.payment = state.payment;
      } else route = "S7";
    }
    if (route === "S7" && !s.recovery.active) route = s.bag ? "S6" : "S1";

    if (route === "S2" && !s.draft.productId) route = "S1";

    if (route === "S3") {
      if (s.storeMode === "change") {
        if (!s.bag) route = "S5";
      } else if (!draftReadyForStore(s)) {
        route = s.draft.productId ? "S2" : "S1";
      }
    }

    if (route === "S4" && !s.bag) route = "S1";
    if (route === "S6" && (!s.bag || (s.bag.method === "pickup" && !s.bag.storeId))) route = "S5";

    // Re-check S7 after earlier redirects may have landed there.
    if (route === "S7" && !s.recovery.active) route = "S1";

    // ---- Route-entry effects ----
    if (route !== "S2") s.editing = false;
    if (route !== "S3") s.storeChange = { pendingStoreId: null, prev: null };

    if (route === "S3" && fromRoute !== "S3") {
      if (s.storeMode === "change" && s.bag) {
        // Entering change mode (also via browser history): start from the bag's current store.
        if (!s.storeChange || s.storeChange.prev === null) {
          s.storeChange = { pendingStoreId: s.bag.storeId, prev: { method: s.bag.method, storeId: s.bag.storeId } };
        }
      }
    }
    if (route === "S3") {
      // A store blocked for the current variant can never stay selected.
      var holder = s.storeMode === "change" ? s.bag : s.draft;
      var pending = s.storeMode === "change" ? s.storeChange.pendingStoreId : s.draft.storeId;
      if (holder && pending && AE.isStoreBlocked(s, pending, holder)) {
        if (s.storeMode === "change") s.storeChange.pendingStoreId = null;
        else s.draft.storeId = null;
        s.notice = { route: "S3", kind: "warning", text: AE.getStore(pending).name + " can't fulfill " + AE.variantLabel(holder) + ". Choose another store." };
      }
    }

    // Notices belong to one state; drop them when the shopper moves elsewhere.
    if (s.notice && s.notice.route !== route) s.notice = null;

    s.route = route;
    return { state: s, route: route };
  };
})(window.AE = window.AE || {});

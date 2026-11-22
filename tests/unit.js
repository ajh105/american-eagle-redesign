/* Unit checks for the pure logic (data, pricing, state, router).
 * Run: node tests/unit.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ctx = { window: {}, console };
vm.createContext(ctx);
["data.js", "pricing.js", "state.js", "router.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8"), ctx, { filename: f })
);
const AE = ctx.window.AE;

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok  " + name); }
  catch (e) { console.error("  FAIL " + name + "\n       " + e.message); process.exitCode = 1; }
}
const ids = (cards) => cards.map((c) => c.id).join(",");
function run(s, name, args) { const n = AE.reduce(s, name, args); return AE.guard(n, n.route, s.route).state; }

// ---- Pricing ----
test("qty 1 target = $72.56", () => {
  const l = AE.priceLines({ productId: "wide-leg", colorId: "medium-bright-indigo", qty: 1 });
  assert.strictEqual(AE.money(l.subtotal), "$66.45");
  assert.strictEqual(AE.money(l.tax), "$6.11");
  assert.strictEqual(AE.money(l.total), "$72.56");
  assert.strictEqual(AE.money(l.merch), "$69.95");
  assert.strictEqual(AE.money(l.savings), "$3.50");
});
test("qty 2 = $145.13, qty 3 = $217.69, savings $3.50/pair", () => {
  const l2 = AE.priceLines({ productId: "wide-leg", colorId: "medium-bright-indigo", qty: 2 });
  const l3 = AE.priceLines({ productId: "wide-leg", colorId: "medium-bright-indigo", qty: 3 });
  assert.strictEqual(AE.money(l2.total), "$145.13");
  assert.strictEqual(AE.money(l3.total), "$217.69");
  assert.strictEqual(l2.savings, 700);
  assert.strictEqual(l3.savings, 1050);
});

// ---- Search ----
test("search examples from spec", () => {
  assert.strictEqual(ids(AE.searchCards("baggy wide-leg")), "c2,c3,c4,c5");
  assert.strictEqual(ids(AE.searchCards("BAGGY")), "c1,c2,c3,c4,c5");
  assert.strictEqual(ids(AE.searchCards("0437")), "c2,c3,c4");
  assert.strictEqual(ids(AE.searchCards("")), "c1,c2,c3,c4,c5");
  assert.strictEqual(ids(AE.searchCards("baggy wide leg")), "c2,c3,c4,c5");
  assert.strictEqual(AE.searchCards("skirt").length, 0);
});

test("S1 results: category, fit/color filters, sort; header search resets filters", () => {
  const ids2 = (r) => r.cards.map((c) => c.id).join(",");
  assert.strictEqual(ids2(AE.resultsFor({ category: "jeans", sort: "featured", fits: [], colors: [] })), "c1,c2,c3,c4,c5");
  assert.strictEqual(ids2(AE.resultsFor({ category: "men", sort: "featured", fits: [], colors: [] })), "");
  assert.strictEqual(ids2(AE.resultsFor({ query: "baggy", sort: "price-asc", fits: ["Baggy Wide-Leg"], colors: [] })), "c2,c3,c4");
  assert.strictEqual(ids2(AE.resultsFor({ query: "", sort: "price-desc", fits: [], colors: ["medium-bright-indigo"] })), "c5,c3");
  let s = AE.initialState();
  assert.strictEqual(s.search.view, "home");
  s = run(s, "openCategory", { id: "jeans" });
  s = run(s, "toggleFilter", { kind: "fit", value: "Curvy" });
  assert.deepStrictEqual(Array.from(s.search.fits), ["Curvy"]);
  s = run(s, "runSearch", { query: " baggy " });
  assert.strictEqual(s.search.query, "baggy");
  assert.strictEqual(s.search.fits.length, 0);
  assert.strictEqual(s.search.view, "results");
});

// ---- Size / length ----
test("size 10: X-Short unavailable, others available; 18 Short unavailable", () => {
  assert.strictEqual(AE.isLengthAvailable("10", "X-Short"), false);
  ["Short", "Regular", "Long", "X-Long"].forEach((l) => assert.ok(AE.isLengthAvailable("10", l), l));
  assert.strictEqual(AE.isLengthAvailable("18", "Short"), false);
});
test("size change keeps or clears length", () => {
  let s = AE.initialState();
  s = run(s, "openCard", { cardId: "c3" });
  s = run(s, "setDraftSize", { size: "10" });
  s = run(s, "setDraftLength", { length: "Long" });
  s = run(s, "setDraftSize", { size: "4" });
  assert.strictEqual(s.draft.length, "Long");
  s = run(s, "setDraftSize", { size: "000" });
  assert.strictEqual(s.draft.length, null);
  assert.ok(/Long isn't available in size 000/.test(s.notice.text));
});

// ---- Flow helpers ----
function toBag(storeId) {
  let s = AE.initialState();
  s = run(s, "openCard", { cardId: "c3" });
  s = run(s, "setDraftSize", { size: "10" });
  s = run(s, "setDraftLength", { length: "Long" });
  s = run(s, "setDraftMethod", { method: "pickup" });
  s = run(s, "chooseStore");
  assert.strictEqual(s.route, "S3");
  s = run(s, "setZip", { zip: "85392" });
  s = run(s, "selectStore", { storeId });
  s = run(s, "addPickupToBag");
  assert.strictEqual(s.route, "S4");
  s = run(s, "viewBag");
  return s;
}
function fill(s) { return run(s, "fillSample"); }

test("happy path with recovery naming the selected store", () => {
  let s = toBag("westgate");
  s = run(s, "goCheckout");
  assert.strictEqual(s.route, "S6");
  assert.strictEqual(AE.checkoutButtonLabel(s), "Review order");
  s = fill(s);
  s = run(s, "submitCheckout");
  assert.strictEqual(s.route, "S7");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.recovery.blocked)), { storeId: "westgate", variantKey: "wide-leg|medium-bright-indigo|10|Long" });
  assert.strictEqual(s.bag.storeId, null);
  assert.strictEqual(s.checkout.name, "Alex Sample");
  s = run(s, "chooseReplacement", { storeId: "westgate" });
  assert.strictEqual(s.route, "S7", "blocked store refused");
  s = run(s, "chooseReplacement", { storeId: "aerie" });
  assert.strictEqual(s.route, "S6");
  assert.strictEqual(AE.checkoutButtonLabel(s), "Place simulated order");
  assert.ok(/Aerie – Westgate \(Dec 2\)/.test(s.recovery.message));
  s = run(s, "submitCheckout");
  assert.strictEqual(s.route, "S8");
  assert.strictEqual(s.order.number, "AE-SIM-463001");
  assert.strictEqual(s.order.snapshot.storeName, "Aerie – Westgate");
  assert.strictEqual(AE.money(s.order.snapshot.lines.total), "$72.56");
  assert.strictEqual(s.payment.cardNumber, "");
});
test("recovery names Aerie when Aerie is selected", () => {
  let s = fill(run(toBag("aerie"), "goCheckout"));
  s = run(s, "submitCheckout");
  assert.strictEqual(s.recovery.blocked.storeId, "aerie");
});
test("recovery uses store changed in bag before first review", () => {
  let s = toBag("westgate");
  s = run(s, "openChangeStore");
  s = run(s, "selectStore", { storeId: "arrowhead" });
  s = run(s, "updateStore");
  s = fill(run(s, "goCheckout"));
  s = run(s, "submitCheckout");
  assert.strictEqual(s.recovery.blocked.storeId, "arrowhead");
});
test("cancel store change leaves bag unchanged; cancel switch-to-pickup stays ship", () => {
  let s = toBag("westgate");
  const before = JSON.stringify(s.bag);
  s = run(s, "openChangeStore");
  s = run(s, "selectStore", { storeId: "aerie" });
  s = run(s, "cancelStoreChange");
  assert.strictEqual(s.route, "S5");
  assert.strictEqual(JSON.stringify(s.bag), before);
  s = run(s, "switchToShip");
  assert.strictEqual(s.bag.method, "ship");
  assert.strictEqual(s.bag.storeId, null);
  s = run(s, "openChangeStore");
  s = run(s, "selectStore", { storeId: "aerie" });
  s = run(s, "cancelStoreChange");
  assert.strictEqual(s.bag.method, "ship");
});
test("return to bag from S7 keeps pickup, clears store, blocks checkout", () => {
  let s = fill(run(toBag("westgate"), "goCheckout"));
  s = run(s, "submitCheckout");
  s = run(s, "returnToBagFromRecovery");
  assert.strictEqual(s.route, "S5");
  assert.strictEqual(s.bag.method, "pickup");
  assert.strictEqual(s.bag.storeId, null);
  assert.strictEqual(s.recovery.active, false);
  const t = run(s, "goCheckout");
  assert.strictEqual(t.route, "S5", "checkout blocked without a store");
  s = run(s, "openChangeStore");
  s = run(s, "selectStore", { storeId: "westgate" });
  s = run(s, "updateStore");
  assert.strictEqual(s.bag.storeId, null, "blocked store can't be applied");
  s = run(s, "selectStore", { storeId: "arrowhead" });
  s = run(s, "updateStore");
  assert.strictEqual(s.bag.storeId, "arrowhead");
  s = run(s, "goCheckout");
  assert.strictEqual(s.route, "S6");
  assert.strictEqual(AE.checkoutButtonLabel(s), "Place simulated order");
  s = run(s, "submitCheckout");
  assert.strictEqual(s.route, "S8", "recovery fires once per session");
});
test("variant memory: change variant unblocks, return to 10 Long re-blocks", () => {
  let s = fill(run(toBag("westgate"), "goCheckout"));
  s = run(s, "submitCheckout");
  s = run(s, "chooseReplacement", { storeId: "aerie" });
  s = run(s, "backToBag");
  s = run(s, "editItem");
  s = run(s, "setDraftLength", { length: "Regular" });
  s = run(s, "updateItem");
  assert.strictEqual(AE.isStoreBlocked(s, "westgate", s.bag), false);
  s = run(s, "openChangeStore");
  s = run(s, "selectStore", { storeId: "westgate" });
  s = run(s, "updateStore");
  assert.strictEqual(s.bag.storeId, "westgate");
  s = run(s, "editItem");
  s = run(s, "setDraftLength", { length: "Long" });
  s = run(s, "updateItem");
  assert.strictEqual(s.bag.storeId, null, "store cleared when variant returns to failed one");
  assert.ok(/can't fulfill 10 Long in Medium Bright Indigo/.test(s.notice.text));
  assert.strictEqual(s.recovery.blocked.storeId, "westgate");
});
test("edit item never duplicates; remove keeps recovery record", () => {
  let s = toBag("aerie");
  s = run(s, "editItem");
  s = run(s, "setDraftSize", { size: "12" });
  s = run(s, "setDraftQty", { qty: 2 });
  s = run(s, "updateItem");
  assert.strictEqual(s.bag.size, "12");
  assert.strictEqual(s.bag.qty, 2);
  assert.strictEqual(s.bag.storeId, "aerie");
  assert.strictEqual(AE.money(AE.priceLines(s.bag).total), "$145.13");
  s = fill(run(s, "goCheckout"));
  s = run(s, "submitCheckout");
  s = run(s, "returnToBagFromRecovery");
  s = run(s, "removeItem");
  assert.strictEqual(s.bag, null);
  assert.strictEqual(s.recoveryUsed, true);
  assert.ok(s.recovery.blocked);
});
test("ship order goes straight to S8 with estimate", () => {
  let s = AE.initialState();
  s = run(s, "openCard", { cardId: "c3" });
  s = run(s, "setDraftSize", { size: "10" });
  s = run(s, "setDraftLength", { length: "Long" });
  s = run(s, "setDraftMethod", { method: "ship" });
  s = run(s, "addShipToBag");
  assert.strictEqual(s.route, "S4");
  s = fill(run(run(s, "viewBag"), "goCheckout"));
  assert.strictEqual(AE.checkoutButtonLabel(s), "Place simulated order");
  s = run(s, "submitCheckout");
  assert.strictEqual(s.route, "S8");
  assert.strictEqual(s.order.snapshot.shipEstimate, "Tue, Dec 8");
});
test("invalid checkout never reaches S7/S8", () => {
  let s = run(toBag("westgate"), "goCheckout");
  s = run(s, "submitCheckout");
  assert.strictEqual(s.route, "S6");
  assert.ok(AE.validateCheckout(s).length >= 6);
});
test("guards: S7/S8 direct redirect; S6 with empty bag -> S5", () => {
  const s = AE.initialState();
  assert.strictEqual(AE.guard(s, "S7", "S1").route, "S1");
  assert.strictEqual(AE.guard(s, "S8", "S1").route, "S1");
  assert.strictEqual(AE.guard(s, "S6", "S1").route, "S5");
  assert.strictEqual(AE.guard(s, "S3", "S1").route, "S1");
});
test("persist never stores payment", () => {
  const store = {};
  ctx.window.sessionStorage = { setItem: (k, v) => { store[k] = v; }, getItem: (k) => store[k] || null };
  let s = fill(run(toBag("westgate"), "goCheckout"));
  AE.persist(s);
  const raw = store[AE.STORAGE_KEY];
  assert.ok(!/4111|12\/30|cvv|cardNumber/.test(raw));
  const r = AE.restore();
  assert.strictEqual(r.payment.cardNumber, "");
  assert.strictEqual(r.checkout.name, "Alex Sample");
});
test("reset clears recoveryUsed so recovery recurs", () => {
  let s = fill(run(toBag("westgate"), "goCheckout"));
  s = run(s, "submitCheckout");
  s = run(s, "reset");
  assert.strictEqual(s.recoveryUsed, false);
  assert.strictEqual(s.recovery.blocked, null);
});

console.log(`\n${passed} unit checks passed` + (process.exitCode ? " (with failures above)" : ""));

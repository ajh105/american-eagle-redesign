/* Acceptance tests from AE_PROTOTYPE_CONTEXT.md §11 (tests 1–13).
 *
 * Usage:
 *   node tests/acceptance.js http://localhost:8000/        # any static host
 *   node tests/acceptance.js file:///abs/path/index.html   # double-click mode
 *   node tests/acceptance.js https://<user>.github.io/<repo>/
 * Requires Playwright (require('playwright')).
 */
"use strict";
const { chromium } = require("playwright");
const assert = require("assert");

const BASE = (process.argv[2] || "http://localhost:8463/").replace(/#.*$/, "");
const ONLY = process.argv[3] ? new Set(process.argv[3].split(",")) : null;

const results = [];
let consoleErrors = [];

// ---------- helpers ----------
async function fresh(page) {
  await page.goto(BASE + "#/s1");
  await page.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} });
  await page.goto("about:blank");
  await page.goto(BASE + "#/s1");
  await page.waitForSelector('[data-state="S1"]');
}
const route = (page) => page.evaluate(() => location.hash);
const text = (page, sel) => page.textContent(sel);
const mainText = (page) => page.textContent("#main");
async function expectState(page, id) {
  await page.waitForSelector(`#main[data-state="${id}"]`, { timeout: 4000 });
  assert.strictEqual(await route(page), "#/" + id.toLowerCase());
}

async function search(page, q) {
  await page.fill("#search-input", q);
  await page.click("#search-button");
}
/** S2 quantity is a stepper (visual refinement); step it to the target value. */
async function setDraftQty(page, qty) {
  for (let i = 0; i < 6; i++) {
    const cur = parseInt(await page.textContent("#draft-qty"), 10);
    if (cur === qty) return;
    await page.click(cur < qty ? "#draft-qty-up" : "#draft-qty-down");
  }
  throw new Error("Could not set quantity to " + qty);
}
async function selectOptions(page, { size = "10", length = "long", method = "pickup", qty } = {}) {
  if (size) await page.click(`label[for="size-${size}"]`);
  if (length) await page.click(`label[for="len-${length}"]`);
  if (qty) await setDraftQty(page, qty);
  if (method) await page.click(`label[for="method-${method}"]`);
}
async function findStores(page, zip = "85392") {
  await page.fill("#zip-input", zip);
  await page.click("#find-stores");
}
/** S1 → S5 with a pickup item at the given store. */
async function pickupToBag(page, store = "westgate", opts = {}) {
  await search(page, "baggy wide-leg");
  await page.click("#card-c3");
  await expectState(page, "S2");
  await selectOptions(page, opts);
  await page.click("#primary-action");
  await expectState(page, "S3");
  await findStores(page);
  await page.click(`#store-${store}`);
  await page.click("#add-to-bag");
  await expectState(page, "S4");
  await page.click("#view-bag");
  await expectState(page, "S5");
}
async function fillPickupDetails(page) {
  await page.fill("#f-name", "Alex Sample");
  await page.fill("#f-email", "alex@example.com");
  await page.fill("#f-phone", "555-0100");
  await fillPayment(page);
}
async function fillPayment(page) {
  await page.fill("#f-cardNumber", "4111 1111 1111 1111");
  await page.fill("#f-exp", "12/30");
  await page.fill("#f-cvv", "123");
}
async function checkoutToRecovery(page) {
  await page.click("#checkout-button");
  await expectState(page, "S6");
  assert.strictEqual((await text(page, "#checkout-submit")).trim(), "Review order");
  await fillPickupDetails(page);
  await page.click("#checkout-submit");
  await expectState(page, "S7");
}
async function bagChangeStore(page, store) {
  await page.click("#change-store");
  await expectState(page, "S3");
  if (!(await page.$("#store-" + store))) await findStores(page);
  await page.click("#store-" + store);
  await page.click("#update-store");
  await expectState(page, "S5");
}
async function editItem(page, changes) {
  await page.click("#edit-item");
  await expectState(page, "S2");
  assert.strictEqual((await text(page, "#primary-action")).trim(), "Update item");
  assert.strictEqual(await page.$("#method-pickup"), null, "method hidden in edit mode");
  if (changes.size) await page.click(`label[for="size-${changes.size}"]`);
  if (changes.length) await page.click(`label[for="len-${changes.length}"]`);
  if (changes.qty) await setDraftQty(page, changes.qty);
  await page.click("#primary-action");
  await expectState(page, "S5");
}
async function tabTo(page, id, max = 250) {
  for (let i = 0; i < max; i++) {
    if ((await page.evaluate(() => document.activeElement && document.activeElement.id)) === id) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Keyboard could not reach #" + id);
}

async function test(num, name, page, fn) {
  if (ONLY && !ONLY.has(String(num))) return;
  try {
    await fresh(page);
    await fn(page);
    results.push({ num, name, ok: true });
    console.log(`  PASS ${num}. ${name}`);
  } catch (e) {
    results.push({ num, name, ok: false, err: e.message });
    console.log(`  FAIL ${num}. ${name}\n       ${e.message.split("\n").join("\n       ")}`);
  }
}

// ---------- tests ----------
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  console.log("Acceptance tests against " + BASE);

  await test(1, "Happy path S1→S2→S3→S4→S5→S6→S7→S6→S8", page, async (p) => {
    await search(p, "baggy wide-leg");
    assert.strictEqual(await p.$$eval(".result-card", (els) => els.length), 4);
    await p.click("#card-c3");
    await expectState(p, "S2");
    assert.ok((await mainText(p)).includes("Medium Bright Indigo"));
    await selectOptions(p, { size: "10", length: "long", method: "pickup" });
    assert.strictEqual((await text(p, "#primary-action")).trim(), "Choose a store");
    assert.ok((await text(p, "#selection-summary")).includes("Medium Bright Indigo · 10 Long · qty 1"));
    await p.click("#primary-action");
    await expectState(p, "S3");
    assert.strictEqual(await p.inputValue("#zip-input"), "", "ZIP starts empty");
    await findStores(p);
    assert.strictEqual(await p.$$eval(".store-row", (els) => els.length), 3);
    assert.ok(await p.isDisabled("#add-to-bag"), "Add to bag disabled before a store");
    await p.click("#store-westgate");
    assert.ok((await mainText(p)).includes("Selected for pickup"));
    await p.click("#add-to-bag");
    await expectState(p, "S4");
    let t = await mainText(p);
    for (const s of ["Tanger Outlet Westgate – American Eagle Outlet", "Tue, Dec 1", "Store pickup", "10", "Long", "$66.45"]) assert.ok(t.includes(s), "S4 shows " + s);
    await p.click("#view-bag");
    await expectState(p, "S5");
    t = await mainText(p);
    assert.ok(t.includes("Tanger Outlet Westgate") && t.includes("Tue, Dec 1"));
    assert.strictEqual(await text(p, "[data-testid=order-total]"), "$72.56");
    await checkoutToRecovery(p);
    assert.ok((await text(p, "h1")).includes("Tanger Outlet Westgate – American Eagle Outlet can no longer fulfill 10 Long in Medium Bright Indigo"));
    await p.click("#alt-aerie");
    await expectState(p, "S6");
    t = await mainText(p);
    assert.ok(t.includes("Pickup store changed to Aerie – Westgate (Dec 2)"));
    assert.ok(t.includes("Aerie – Westgate") && t.includes("Wed, Dec 2"));
    assert.strictEqual((await text(p, "#checkout-submit")).trim(), "Place simulated order");
    await p.click("#checkout-submit");
    await expectState(p, "S8");
    t = await mainText(p);
    for (const s of ["Order placed (simulated)", "AE-SIM-463001", "Aerie – Westgate", "Wed, Dec 2", "$72.56", "No real order or payment"]) assert.ok(t.includes(s), "S8 shows " + s);
    assert.ok(!t.includes("4111"), "S8 never shows card number");
  });

  await test(2, "Math: $72.56 / $145.13 / $217.69, savings $3.50 per pair, 9.2% tax", page, async (p) => {
    await pickupToBag(p);
    assert.strictEqual(await text(p, "[data-testid=order-total]"), "$72.56");
    assert.ok((await mainText(p)).includes("−$3.50") && (await mainText(p)).includes("$6.11"));
    await p.click("#qty-up");
    assert.strictEqual(await text(p, "[data-testid=order-total]"), "$145.13");
    assert.ok((await mainText(p)).includes("−$7.00") && (await mainText(p)).includes("$12.23"));
    await p.click("#qty-up");
    assert.strictEqual(await text(p, "[data-testid=order-total]"), "$217.69");
    assert.ok((await mainText(p)).includes("−$10.50") && (await mainText(p)).includes("$18.34"));
    assert.ok((await mainText(p)).includes("Estimated tax (simulated)"));
  });

  await test(3, "Size and length dependencies", page, async (p) => {
    await search(p, "baggy wide-leg"); // S1 now lands on the homepage
    await p.click("#card-c3");
    assert.ok(await p.isDisabled("#len-long"), "Length disabled until size chosen");
    await p.click('label[for="size-10"]');
    assert.ok(await p.isDisabled("#len-x-short"));
    assert.strictEqual((await text(p, 'label[for="len-x-short"]')).trim(), "X-Short (not available in size 10)");
    for (const l of ["short", "regular", "long", "x-long"]) assert.ok(!(await p.isDisabled("#len-" + l)), l + " enabled");
    await p.click('label[for="size-18"]');
    assert.ok(await p.isDisabled("#len-short"), "18 Short disabled");
    await p.click('label[for="size-10"]');
    await p.click('label[for="len-long"]');
    await p.click('label[for="size-4"]');
    assert.ok(await p.isChecked("#len-long"), "size 4 keeps Long");
    await p.click('label[for="size-000"]');
    assert.ok(!(await p.isChecked("#len-long")), "000 clears Long");
    assert.ok((await mainText(p)).includes("Length cleared: Long isn't available in size 000"));
  });

  await test(4, "Method required: inline error and focus", page, async (p) => {
    await search(p, "baggy wide-leg"); // S1 now lands on the homepage
    await p.click("#card-c3");
    await selectOptions(p, { size: "10", length: "long", method: null });
    await p.click("#primary-action");
    await expectState(p, "S2");
    assert.ok((await mainText(p)).includes("Choose Store pickup or Ship to me."));
    assert.strictEqual(await p.evaluate(() => document.activeElement.id), "method-pickup");
    await fresh(p);
    await search(p, "baggy wide-leg"); // S1 now lands on the homepage
    await p.click("#card-c3");
    await p.click("#primary-action");
    assert.ok((await mainText(p)).includes("Choose a size."));
    assert.strictEqual(await p.evaluate(() => document.activeElement.id), "size-000");
  });

  await test(5, "No duplicates: edit size, qty, method keep one line item", page, async (p) => {
    await pickupToBag(p, "aerie");
    await editItem(p, { size: "12" });
    assert.strictEqual(await p.$$eval(".line-item", (els) => els.length), 1);
    let t = await mainText(p);
    assert.ok(t.includes("12") && t.includes("Aerie – Westgate") && t.includes("Wed, Dec 2"), "store kept after revalidation");
    await editItem(p, { qty: 2 });
    assert.strictEqual(await p.$$eval(".line-item", (els) => els.length), 1);
    assert.strictEqual(await text(p, "[data-testid=order-total]"), "$145.13");
    await p.click("#seg-ship");
    assert.strictEqual(await p.$$eval(".line-item", (els) => els.length), 1);
    assert.strictEqual(await text(p, "[data-testid=order-total]"), "$145.13");
    // Adding again from S1 replaces (single line item) after the notice.
    // Browser Back out of edit mode returns to the bag with nothing duplicated.
    await p.click("#edit-item"); await p.goBack();
    await expectState(p, "S5");
    assert.strictEqual(await p.$$eval(".line-item", (els) => els.length), 1);
  });

  await test(6, "Change store in bag; Cancel leaves bag unchanged; Cancel switch-to-pickup stays ship", page, async (p) => {
    await pickupToBag(p, "westgate");
    await bagChangeStore(p, "arrowhead");
    let t = await mainText(p);
    assert.ok(t.includes("Arrowhead Towne Center – American Eagle") && t.includes("Thu, Dec 3"));
    const before = await p.evaluate(() => sessionStorage.getItem("aeProto.v1"));
    await p.click("#change-store");
    await expectState(p, "S3");
    assert.ok((await text(p, "#update-store")) && (await text(p, "#cancel-store")));
    await p.click("#store-aerie");
    await p.click("#cancel-store");
    await expectState(p, "S5");
    t = await mainText(p);
    assert.ok(t.includes("Arrowhead Towne Center") && t.includes("Thu, Dec 3") && !t.includes("Aerie"), "previous store kept");
    const after = await p.evaluate(() => JSON.parse(sessionStorage.getItem("aeProto.v1")).bag);
    assert.deepStrictEqual(after, JSON.parse(before).bag);
    // S6 follows the store (recovery then names Arrowhead; S8 follows the replacement)
    await checkoutToRecovery(p);
    assert.ok((await text(p, "h1")).includes("Arrowhead Towne Center"));
    await p.click("#alt-westgate");
    t = await mainText(p);
    assert.ok(t.includes("Tanger Outlet Westgate") && t.includes("Tue, Dec 1"));
    await p.click("#checkout-submit");
    await expectState(p, "S8");
    assert.ok((await mainText(p)).includes("Tanger Outlet Westgate") && (await mainText(p)).includes("Tue, Dec 1"));
    // Cancel "Switch to pickup"
    await fresh(p);
    await pickupToBag(p, "westgate");
    await p.click("#seg-ship");
    await p.click("#seg-pickup");
    await expectState(p, "S3");
    await p.click("#store-aerie");
    await p.click("#cancel-store");
    await expectState(p, "S5");
    assert.strictEqual(await p.getAttribute("#seg-ship", "aria-pressed"), "true", "still ship");
    assert.ok((await mainText(p)).includes("Tue, Dec 8"));
  });

  await test(7, "Switch to ship: store cleared, Dec 8, direct order", page, async (p) => {
    await pickupToBag(p, "westgate");
    await p.click("#seg-ship");
    let t = await mainText(p);
    assert.ok(t.includes("Tue, Dec 8") && !t.includes("Tanger Outlet"));
    await p.click("#checkout-button");
    await expectState(p, "S6");
    assert.strictEqual((await text(p, "#checkout-submit")).trim(), "Place simulated order");
    await p.fill("#f-name", "Alex Sample");
    await p.fill("#f-email", "alex@example.com");
    await p.fill("#f-address1", "100 Sample St");
    await p.fill("#f-city", "Phoenix");
    await p.fill("#f-state", "AZ");
    await p.fill("#f-zip", "85001");
    await fillPayment(p);
    await p.click("#checkout-submit");
    await expectState(p, "S8");
    t = await mainText(p);
    assert.ok(t.includes("Ship to me") && t.includes("Tue, Dec 8") && t.includes("$72.56"));
  });

  await test(8, "Validation: summary, inline errors, focus first; no S7/S8", page, async (p) => {
    await pickupToBag(p);
    await p.click("#checkout-button");
    await expectState(p, "S6");
    await p.click("#checkout-submit");
    await expectState(p, "S6");
    assert.ok(await p.isVisible("#error-summary"));
    assert.strictEqual(await p.getAttribute("#error-summary", "role"), "alert");
    assert.strictEqual(await p.getAttribute("#f-name", "aria-invalid"), "true");
    assert.ok(await p.isVisible("#f-name-error"));
    assert.strictEqual(await p.evaluate(() => document.activeElement.id), "f-name");
    // Errors clear as corrected; partial fix still blocks
    await p.fill("#f-name", "Alex Sample");
    assert.strictEqual(await p.$("#f-name-error"), null);
    await p.fill("#f-email", "alex@example.com");
    await p.fill("#f-phone", "555-0100");
    await p.fill("#f-cardNumber", "12");
    await p.click("#checkout-submit");
    await expectState(p, "S6");
    assert.strictEqual(await p.evaluate(() => document.activeElement.id), "f-cardNumber");
    // Scrolled into view
    assert.ok(await p.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
  });

  await test(9, "Recovery: names selected store, blocks variant, preserves fields, once per session, variant memory", page, async (p) => {
    // (a) Aerie selected at first review
    await pickupToBag(p, "aerie");
    await checkoutToRecovery(p);
    assert.ok((await text(p, "h1")).includes("Aerie – Westgate can no longer fulfill 10 Long in Medium Bright Indigo"));
    assert.strictEqual(await p.$$eval(".alt-stores .store-row", (els) => els.length), 2);
    assert.strictEqual(await p.$("#alt-aerie"), null, "failed store not offered");
    let t = await mainText(p);
    assert.ok(t.includes("Tue, Dec 1") && t.includes("Thu, Dec 3") && t.includes("has not been placed"));
    assert.ok(t.includes("Alex Sample") && t.includes("ending 1111"), "entered details shown");
    assert.strictEqual(await p.getAttribute(".recovery-alert", "role"), "alert");
    // (b) after changing stores in the bag
    await fresh(p);
    await pickupToBag(p, "westgate");
    await bagChangeStore(p, "aerie");
    await bagChangeStore(p, "arrowhead");
    await checkoutToRecovery(p);
    assert.ok((await text(p, "h1")).includes("Arrowhead Towne Center – American Eagle can no longer fulfill"));
    // (c) Westgate: preserved fields on return to S6; no second recovery
    await fresh(p);
    await pickupToBag(p, "westgate");
    await checkoutToRecovery(p);
    await p.click("#alt-arrowhead");
    await expectState(p, "S6");
    for (const [f, v] of [["name", "Alex Sample"], ["email", "alex@example.com"], ["phone", "555-0100"], ["cardNumber", "4111 1111 1111 1111"], ["exp", "12/30"], ["cvv", "123"]]) {
      assert.strictEqual(await p.inputValue("#f-" + f), v, f + " preserved");
    }
    // Failed store never selectable for the exact variant
    await p.click("#back-to-bag");
    await p.click("#change-store");
    assert.ok(await p.isDisabled("#store-westgate"));
    assert.ok((await text(p, "#store-westgate")).includes("Unavailable for 10 Long in Medium Bright Indigo"));
    await p.click("#cancel-store");
    // Variant memory: change length → Westgate selectable; back to 10 Long → blocked again
    await editItem(p, { length: "regular" });
    await p.click("#change-store");
    assert.ok(!(await p.isDisabled("#store-westgate")), "selectable for 10 Regular");
    await p.click("#store-westgate");
    await p.click("#update-store");
    assert.ok((await mainText(p)).includes("Tanger Outlet Westgate"));
    await editItem(p, { length: "long" });
    t = await mainText(p);
    assert.ok(t.includes("can't fulfill 10 Long in Medium Bright Indigo"), "message when store cleared");
    assert.ok(await p.isDisabled("#checkout-button"));
    await p.click("#change-store");
    assert.ok(await p.isDisabled("#store-westgate"), "blocked again for 10 Long");
    await p.click("#store-aerie");
    await p.click("#update-store");
    await p.click("#checkout-button");
    assert.strictEqual((await text(p, "#checkout-submit")).trim(), "Place simulated order", "no second recovery");
    await fillPayment(p); // payment is memory-only; re-enter in case
    await p.click("#checkout-submit");
    await expectState(p, "S8");
  });

  await test(10, "Return to bag from S7: pickup kept, store cleared, Checkout waits", page, async (p) => {
    await pickupToBag(p, "westgate");
    await checkoutToRecovery(p);
    await p.click("#return-to-bag");
    await expectState(p, "S5");
    assert.strictEqual(await p.getAttribute("#seg-pickup", "aria-pressed"), "true");
    const t = await mainText(p);
    assert.ok(!t.includes("Tue, Dec 1") && t.includes("No pickup store selected"));
    assert.ok(await p.isDisabled("#checkout-button"));
    assert.ok((await text(p, "#checkout-reason")).includes("Choose a store to continue"));
    await p.click("#change-store");
    await expectState(p, "S3");
    assert.ok(await p.isDisabled("#store-westgate"));
    await p.click("#store-arrowhead");
    await p.click("#update-store");
    await expectState(p, "S5");
    assert.ok(!(await p.isDisabled("#checkout-button")));
    await p.click("#checkout-button");
    await expectState(p, "S6");
    assert.strictEqual(await p.inputValue("#f-name"), "Alex Sample");
    assert.strictEqual((await text(p, "#checkout-submit")).trim(), "Place simulated order");
  });

  await test(11, "Reset: Start over and banner Reset clear everything; recovery recurs (twice)", page, async (p) => {
    for (let round = 0; round < 2; round++) {
      await pickupToBag(p, "westgate");
      await checkoutToRecovery(p);
      await p.click("#alt-aerie");
      await p.click("#checkout-submit");
      await expectState(p, "S8");
      if (round === 0) await p.click("#start-over");
      else await p.click(".banner-reset");
      await expectState(p, "S1");
      const saved = await p.evaluate(() => JSON.parse(sessionStorage.getItem("aeProto.v1")));
      assert.strictEqual(saved.bag, null);
      assert.strictEqual(saved.recoveryUsed, false);
      assert.strictEqual(saved.recovery.blocked, null);
      assert.strictEqual(saved.checkout.name, "");
      assert.strictEqual(await p.$(".bag-link"), null);
      assert.strictEqual(await p.$("#header-bag-count"), null, "bag badge hidden when empty");
      assert.strictEqual(await p.$(".result-card"), null, "reset lands on the S1 homepage");
    }
    // After reset the planned failure happens again
    await pickupToBag(p, "westgate");
    await checkoutToRecovery(p);
    // Banner reset from mid-flow (S7) works too
    await p.click(".banner-reset");
    await expectState(p, "S1");
  });

  await test(12, "Guards, Back/Forward, refresh keeps non-payment state only", page, async (p) => {
    await p.goto(BASE + "#/s7"); await p.waitForTimeout(150);
    assert.strictEqual(await route(p), "#/s1");
    await p.goto(BASE + "#/s8"); await p.waitForTimeout(150);
    assert.strictEqual(await route(p), "#/s1");
    await p.goto(BASE + "#/s6"); await p.waitForTimeout(150);
    assert.strictEqual(await route(p), "#/s5");
    await p.goto(BASE + "#/s3"); await p.waitForTimeout(150);
    assert.strictEqual(await route(p), "#/s1");
    await p.goto(BASE + "#/bogus"); await p.waitForTimeout(150);
    assert.strictEqual(await route(p), "#/s1");
    // Back/Forward through a full flow never breaks state
    await pickupToBag(p, "westgate");
    for (let i = 0; i < 4; i++) { await p.goBack(); await p.waitForTimeout(100); }
    for (let i = 0; i < 4; i++) { await p.goForward(); await p.waitForTimeout(100); }
    await expectState(p, "S5");
    assert.strictEqual(await text(p, "[data-testid=order-total]"), "$72.56");
    // Back from S7 keeps the shopper in recovery; never strands
    await checkoutToRecovery(p);
    await p.goBack(); await p.waitForTimeout(150);
    assert.ok(["#/s7", "#/s5"].includes(await route(p)));
    if ((await route(p)) === "#/s7") { await p.click("#alt-aerie"); }
    else { await bagChangeStore(p, "aerie"); await p.click("#checkout-button"); }
    await expectState(p, "S6");
    // Refresh: non-payment state survives; payment comes back empty; storage has no card data
    await fillPayment(p);
    await p.reload();
    await expectState(p, "S6");
    assert.strictEqual(await p.inputValue("#f-name"), "Alex Sample");
    for (const f of ["cardNumber", "exp", "cvv"]) assert.strictEqual(await p.inputValue("#f-" + f), "", f + " empty after refresh");
    const raw = await p.evaluate(() => JSON.stringify(sessionStorage) + JSON.stringify(localStorage) + document.cookie);
    assert.ok(!/4111|12\/30|"cvv"|cardNumber|"exp"/.test(raw), "no payment data in storage");
    // After an order, Back can't re-place it
    await fillPayment(p);
    await p.click("#checkout-submit");
    await expectState(p, "S8");
    await p.goBack(); await p.waitForTimeout(150);
    assert.strictEqual(await route(p), "#/s8");
  });

  await test(13, "Quality: keyboard-only run to S8, autocomplete off, no remote assets", page, async (p) => {
    const remote = [];
    const onReq = (r) => { const u = r.url(); if (!u.startsWith(BASE.split("#")[0].replace(/index\.html$/, "")) && !u.startsWith("data:") && !u.startsWith("about:")) remote.push(u); };
    p.on("request", onReq);
    await p.reload();
    const k = p.keyboard;
    await tabTo(p, "search-input"); await k.type("baggy wide-leg"); await k.press("Enter");
    await tabTo(p, "card-c3"); await k.press("Enter");
    await expectState(p, "S2");
    await tabTo(p, "size-000");
    for (let i = 0; i < 7; i++) await k.press("ArrowRight");
    assert.ok(await p.isChecked("#size-10"), "size 10 via keyboard");
    await tabTo(p, "len-short");
    await k.press("ArrowRight"); await k.press("ArrowRight");
    assert.ok(await p.isChecked("#len-long"), "Long via keyboard");
    await tabTo(p, "method-pickup"); await k.press("Space");
    await tabTo(p, "primary-action"); await k.press("Enter");
    await expectState(p, "S3");
    await tabTo(p, "zip-input"); await k.type("85392"); await k.press("Enter");
    await tabTo(p, "store-westgate"); await k.press("Enter");
    await tabTo(p, "add-to-bag"); await k.press("Enter");
    await expectState(p, "S4");
    await tabTo(p, "view-bag"); await k.press("Enter");
    await expectState(p, "S5");
    await tabTo(p, "checkout-button"); await k.press("Enter");
    await expectState(p, "S6");
    for (const f of ["cardNumber", "exp", "cvv"]) assert.strictEqual(await p.getAttribute("#f-" + f, "autocomplete"), "off");
    await tabTo(p, "f-name"); await k.type("Alex Sample");
    await k.press("Tab"); await k.type("alex@example.com");
    await k.press("Tab"); await k.type("555-0100");
    await k.press("Tab"); await k.type("4111 1111 1111 1111");
    await k.press("Tab"); await k.type("12/30");
    await k.press("Tab"); await k.type("123");
    await tabTo(p, "checkout-submit"); await k.press("Enter");
    await expectState(p, "S7");
    await tabTo(p, "alt-aerie"); await k.press("Enter");
    await expectState(p, "S6");
    await tabTo(p, "checkout-submit"); await k.press("Enter");
    await expectState(p, "S8");
    assert.strictEqual(await p.evaluate(() => document.activeElement.tagName), "H1", "focus moves to h1");
    await tabTo(p, "start-over"); await k.press("Enter");
    await expectState(p, "S1");
    p.off("request", onReq);
    assert.deepStrictEqual(remote, [], "no remote requests");
  });


  await test(14, "S1 homepage → results, category nav, filters, sort; overlays keep the academic notice", page, async (p) => {
    // Landing: realistic homepage, no results grid yet
    assert.strictEqual(await p.$(".result-card"), null, "no results on landing");
    assert.strictEqual((await text(p, "h1")).trim(), "The Baggy Edit");
    assert.ok((await text(p, ".demo-banner")).includes("Not affiliated with or endorsed by American Eagle Outfitters"));
    // Category navigation
    await p.click("#nav-jeans");
    await expectState(p, "S1");
    assert.strictEqual(await p.$$eval(".result-card", (e) => e.length), 5);
    await p.click('label:has(#fit-filter-curvy)');
    assert.deepStrictEqual(await p.$$eval(".result-card", (e) => e.map((x) => x.id)), ["card-c5"]);
    await p.click("#clear-filters");
    await p.click('label:has(#color-filter-medium-bright-indigo)');
    assert.deepStrictEqual(await p.$$eval(".result-card", (e) => e.map((x) => x.id)), ["card-c3"]);
    await p.click("#clear-filters");
    await p.click('label:has(#sort-price-asc)');
    assert.deepStrictEqual(await p.$$eval(".result-card", (e) => e.map((x) => x.id)), ["card-c1", "card-c2", "card-c3", "card-c4", "card-c5"]);
    await p.click('label:has(#sort-price-desc)');
    assert.strictEqual(await p.$eval(".result-card", (e) => e.id), "card-c5");
    // Out-of-scope category explains itself (no dead control)
    await p.click("#nav-men");
    assert.ok((await mainText(p)).includes("only includes a small selection of women"));
    await p.click("#shop-jeans");
    assert.strictEqual(await p.$$eval(".result-card", (e) => e.length), 5);
    // Logo returns to the homepage
    await p.click("#logo-home");
    assert.strictEqual(await p.$(".result-card"), null);
    // Header search from the bag keeps the bag
    await pickupToBag(p, "westgate");
    await search(p, "0437");
    await expectState(p, "S1");
    assert.strictEqual(await p.$$eval(".result-card", (e) => e.length), 3);
    assert.strictEqual((await text(p, "#header-bag-count")).trim(), "1");
    // S3 overlay: Escape = Back, selections preserved; notice stays visible above overlays
    await p.click("#card-c3");
    await selectOptions(p, {});
    await p.click("#primary-action");
    await expectState(p, "S3");
    const bannerOnTop = () => p.evaluate(() => { const b = document.querySelector(".demo-banner"); const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 40, r.top + r.height / 2); return b.contains(el); });
    assert.ok(await bannerOnTop(), "notice visible above the store overlay");
    assert.ok(await p.evaluate(() => document.getElementById("site-header").inert), "header inert behind modal");
    await p.keyboard.press("Escape");
    await expectState(p, "S2");
    assert.ok(await p.isChecked("#size-10") && await p.isChecked("#len-long") && await p.isChecked("#method-pickup"));
    await p.click("#primary-action");
    await p.click("#store-aerie");
    await p.click("#add-to-bag");
    await expectState(p, "S4");
    assert.ok(await bannerOnTop(), "notice visible above the bag drawer");
    await p.click(".banner-reset");
    await expectState(p, "S1");
  });


  await test(15, "Bag badge counts distinct items (not quantity) and hides when empty", page, async (p) => {
    assert.strictEqual(await p.$("#header-bag-count"), null, "no badge with an empty bag");
    await pickupToBag(p, "westgate", { qty: 3 });
    assert.strictEqual((await text(p, "#header-bag-count")).trim(), "1", "qty 3 of one item shows 1");
    assert.strictEqual(await p.getAttribute("#header-bag", "aria-label"), "Shopping bag, 1 item");
    await p.click("#qty-down");
    assert.strictEqual((await text(p, "#header-bag-count")).trim(), "1");
    await p.click("#remove-item");
    assert.strictEqual(await p.$("#header-bag-count"), null, "badge hidden after Remove");
    assert.strictEqual(await p.getAttribute("#header-bag", "aria-label"), "Shopping bag, 0 items");
  });

  // Console errors across the whole run
  if (!ONLY) {
    const ok = consoleErrors.length === 0;
    results.push({ num: "13b", name: "No console errors during the full run", ok, err: consoleErrors.join("\n") });
    console.log(`  ${ok ? "PASS" : "FAIL"} 13b. No console errors during the full run` + (ok ? "" : "\n       " + consoleErrors.join("\n       ")));
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed against ${BASE}`);
  process.exit(failed.length ? 1 : 0);
})();

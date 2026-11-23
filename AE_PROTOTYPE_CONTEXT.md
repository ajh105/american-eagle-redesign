# CSE 463 Final Project: American Eagle Prototype Specification (v2, final)

**This file supersedes the earlier `AE_PROTOTYPE_CONTEXT.md` in every respect.** If the two disagree, this one wins. It is the authoritative implementation spec for the Milestone 1 prototype. Do not expand scope beyond it; if something here conflicts with the Final Project Handout, flag the conflict instead of silently changing scope.

## 0. How to read this file

Every statement about behavior carries one of three tags. Never blur them in the UI, documentation, or code comments.

| Tag | Meaning |
|---|---|
| **[OBSERVED]** | Seen on the original ae.com on Nov 20, 2026 (desktop Chrome, 100% zoom, signed out, ZIP 85392). Evidence lives in screenshots 01–27. |
| **[SIMULATED]** | Invented for the prototype: data, dates, stores, tax rate, the recovery event. Never claimed as real. |
| **[DESIGN]** | A decision about how the redesigned prototype behaves. Not an observation of the original site. |

Dates in this file are 2026. **Simulated "today" is Monday, Nov 30, 2026.** The real project dates are separate: Milestone 1 is due Nov 22, 2026 and Milestone 2 is due Dec 9, 2026 (these are course deadlines, not part of the scenario).

## 1. Scope

- Project: a human-centered redesign of American Eagle's online jeans shopping and store-pickup workflow (https://www.ae.com/). Desktop-first, one focused workflow.
- Milestone 1 delivers a PDF slide report plus this interactive prototype. Milestone 2 (testing with at least three participants) comes later; **this build is the pre-test version** and must stay identifiable and unmodified once tagged (see §13).
- Intended users: online clothing shoppers who prefer nearby store pickup, with varying familiarity with online shopping, sizing, and pickup procedures.
- Eight states, S1–S8, exactly as in §5. Do not add primary states. Dialogs and inline validation live inside a state.
- Out of scope: backend, database, accounts, real payment, rewards, promo codes, external inventory APIs, real order processing, full retail catalog, mobile-first design, analytics.

### Final scenario (shown to participants verbatim) [SIMULATED]

> It's Monday, November 30. You're shopping for one pair of AE Super High-Waisted Baggy Wide-Leg Jeans in Medium Bright Indigo, size 10 Long, for an event on Saturday, December 5. You live near ZIP code 85392, want to keep the total under $75, and would rather pick the jeans up at a nearby American Eagle store than have them shipped to your home. Find the correct jeans, arrange store pickup at a convenient location, and complete the simulated purchase. Before confirming your order, check that the size, color, pickup location, estimated pickup date, and total price are correct.

## 2. What was observed on the original site [OBSERVED]

Background for design intent. The prototype is not a replica; do not reproduce the original UI.

1. **Search and results.** Search sits at top right and was less discoverable. Typing the exact product name gave no autocomplete in this instance; general terms did. Enter returned 25 results, with similar washes and a Curvy style shown together. (Background only, not one of the five findings.)
2. **Product page.** AE Super High-Waisted Baggy Wide-Leg Jean, Medium Bright Indigo, style 0437-6331. Sale price $66.45, original $69.95. A single long dropdown combined sizes 000–20 with lengths (X-Short, Short, Regular, Long, X-Long). Some combinations were struck through (for example, 18 Short). 10 Long was available. Before a size was chosen the pickup area asked for a size; afterward it said "Add your location for in-store availability." The Add to Bag button sat above the pickup availability section.
3. **Store lookup.** ZIP 85392 returned Tanger Outlet Westgate – American Eagle Outlet (4.8 mi) and an Aerie location (4.7 mi), both "ready" Tuesday, Dec 1. The window was titled "Find a Store" yet each result had a "Select Store" button. After selecting the Outlet, the product page showed "Store pickup by Tuesday, Dec. 1" with the store name below Add to Bag. No pickup choice had been made. (The Store Pickup filter on the results page was off during this inspection; do not claim it failed. Do not infer real inventory from the date.)
4. **Added to bag.** The side panel confirmed product, color, 10 Long, quantity 1, $66.45 and said "FREE standard shipping." It did not show the store or date.
5. **Bag.** Item options plus Move to Favorites / Edit / Remove. No visible fulfillment or store control (the Edit control was not exhaustively inspected). Shipping promo, Real Rewards, promo code, order summary, financing line, and returns banner came before the checkout button. Summary: $69.95 merchandise, −$3.50 savings, free shipping, $6.11 tax, **$72.56 total**. (A reported shipping charge from an earlier experience was not reproduced.) Items in the bag are not reserved.
6. **Checkout.** On arrival it showed **Ship To Me** selected. Choosing Free Store Pickup by hand restored the earlier store and Dec 1 date, showed Pickup Person fields, replaced Shipping with "Store Pickup: Free" plus the store name in the summary, and offered Find Another Store. So the store was remembered, but pickup had never been selected. This is not data loss or a broken backend.
7. **Validation (a strength).** Place Order with empty required fields highlighted them and scrolled to the first. Tested for observation only; no payment was submitted and no order was placed.
8. Formal usability tests have **not** occurred. All user consequences in the report are predictions.

## 3. Findings and redesign priorities (final)

| # | Finding | Codex principle | Priority |
|---|---|---|---|
| F1 | Store pickup appears selected but is not committed | Closure for Confidence | **High** |
| F2 | Long combined size/length dropdown | Load Thresholds | Medium |
| F3 | Looked-up store and date disappear at bag review | Memory Scaffolds | Medium |
| F4 | Limited fulfillment correction in the shopping bag | Recovery Defaults | Medium |
| F5 | Checkout button sits below promotional content | Attentional Corridors | **Low** (changed from Medium) |

F1 is what the earlier action accomplished. F3 is whether context is visible for review. F4 is whether the shopper can correct it. The chain: F1 causes the misunderstanding, F3 is where it should be noticed, F4 is where it should be fixed.

| Priority | Addresses | Requirements the prototype must meet |
|---|---|---|
| P1 | F2 | Separate Size and Length fields; Length options depend on Size; unavailable options are shown disabled with a reason, never silently removed; selection stays visible beside the primary button. |
| P2 | F1, F3 | Explicit Store pickup / Ship to me choice before Add to bag, with no preselected method; the store action is worded **"Use this store for pickup"**; method, store, and date appear on S4, S5, and S6. |
| P3 | F4, F5 | Bag corrections (item options, quantity, method, store) that **start in the bag and return directly to it**, without restarting the shopping workflow; order summary and Checkout button together at the top of the bag, above any secondary content. Plus the scenario-driven recovery clause (S7), which is simulated and not derived from a finding. |

## 4. Simulated data model [SIMULATED unless tagged otherwise]

### Dates

- Today: Mon, Nov 30, 2026. Show it once in the demo banner. Event: Sat, Dec 5 (scenario text only; the app does not need it).
- Shipping estimate: **Tue, Dec 8** (after the event, so shipping fails the scenario's need).

### Stores (ZIP 85392). Fixed; the UI says the data is simulated.

| ID | Name | Distance | Pickup date | Basis |
|---|---|---|---|---|
| `westgate` | Tanger Outlet Westgate – American Eagle Outlet | 4.8 mi | Tue, Dec 1 | name, distance, date observed |
| `aerie` | Aerie – Westgate | 4.7 mi | Wed, Dec 2 | location observed; name and Dec 2 date simulated |
| `arrowhead` | Arrowhead Towne Center – American Eagle | 9.3 mi | Thu, Dec 3 | fully simulated |

List order is as above. Any ZIP is accepted only if it is 5 digits; every valid ZIP returns these same three stores (state the "sample stores" note once, quietly). Invalid ZIP shows an inline error and no results. Pickup is always free.

### Catalog (small; all prices in cents)

| Card (result order) | Product | Color | Sale / Orig |
|---|---|---|---|
| 1 | AE Super High-Waisted Straight Jean | Black Charcoal | $59.95 / $64.95 |
| 2 | AE Super High-Waisted Baggy Wide-Leg Jean | Dark Indigo Wash | $66.45 / $69.95 |
| **3 (target)** | AE Super High-Waisted Baggy Wide-Leg Jean, style 0437-6331 | **Medium Bright Indigo** | **$66.45 / $69.95** (observed) |
| 4 | AE Super High-Waisted Baggy Wide-Leg Jean | Salty Air | $66.45 / $69.95 |
| 5 | AE Curvy Super High-Waisted Baggy Wide-Leg Jean | Dark Wash | $71.95 / $79.95 |

- The target is the center card [OBSERVED: it was the center result]. Cards 2–4 are the same product in three washes; each product page also shows those three swatches so the shopper can switch color on S2.
- Only the target configuration (card 3, Medium Bright Indigo, 10 Long) completes the scenario. Other items are fully functional so the choice is real.
- Images are local assets. Draw a simple SVG jeans silhouette tinted to each wash color, or use locally stored images. Never hotlink.

### Search behavior [DESIGN]

Case-insensitive; hyphens and spaces are equivalent; every typed word must appear in the product name, color, or style number. Examples: "baggy wide-leg" returns cards 2–5; "baggy" returns cards 2–5 (card 1's real name has no "baggy"); "jean" returns all five; "0437" returns cards 2–4 (the style number belongs to the wide-leg product, not the Curvy or Straight styles). No match shows "No jeans match '…'. Try 'baggy'." An empty query shows all five. Enter or the Search button runs the search. Landing on S1 shows all five.

### Size and length availability [SIMULATED, except as noted]

- Sizes: 000, 00, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 (range observed).
- Lengths: X-Short, Short, Regular, Long, X-Long.
- Available: X-Short for 000–8; Short for all sizes **except 18** [18 Short unavailable: OBSERVED]; Regular for all; Long for 0–20 [10 Long available: OBSERVED]; X-Long for 8–18.
- Consequence: size 10 has Short, Regular, Long, X-Long; X-Short is shown disabled as "X-Short (not available in size 10)".
- Behavior: Length is disabled until a Size is chosen. Changing Size clears Length if the old Length is unavailable for the new Size, with a polite inline note ("Length cleared: X-Short isn't available in size 10").

### Pricing [DESIGN; documented model]

All math in integer cents.

- `merch = orig × qty`; `savings = (orig − sale) × qty`; `subtotal = sale × qty`.
- **Tax rate 9.2% [SIMULATED].** `tax = round_half_up(subtotal × 0.092)`, computed once per order.
- Shipping and pickup: Free. `total = subtotal + tax`.
- **Check: qty 1 target = $66.45 + $6.11 = $72.56**, matching the observed total ($66.45 × 0.092 = $6.1134 → $6.11).
- Quantity 1–5 allowed. qty 2 = $132.90 + $12.23 = $145.13 (over the $75 budget).
- Show lines: Merchandise, Savings, Shipping (or Store Pickup) Free, Tax (simulated 9.2%), Total. Show the tax label as "Estimated tax (simulated)".
- Order number [SIMULATED]: constant `AE-SIM-463001`. Reset does not change it.

## 5. State contract (S1–S8)

Use these IDs and names everywhere (UI test hooks `data-state="S1"`, screenshots, docs). Route hashes: `#/s1` … `#/s8`.

| ID | State | Required behavior |
|---|---|---|
| **S1** | Product search | Search box (prominent, with a visible Search button), results grid of the five catalog cards; clicking a card opens S2 with that color. If the bag has an item, show a small "Bag (1)" link. |
| **S2** | Product details | Image, name, price (sale plus struck-through original), color swatches with the selected color named, **separate Size and Length** (see §4), quantity 1–5, **method radio: Store pickup / Ship to me, none preselected**. Primary button label depends on method: pickup → **Choose a store** (goes to S3), ship → **Add to bag** (goes to S4). Show a selection summary beside the button (for example "Medium Bright Indigo · 10 Long · qty 1"). Button validation: if size, length, or method is missing, show inline errors and focus the first. If the bag already has an item, show "Your bag has an item. Adding this will replace it." (Edit mode: method hidden, button reads **Update item** and returns to S5 with the same line item.) |
| **S3** | Store selection | Empty ZIP field; the shopper types 85392 and presses Find stores. Shows the three stores with distance and "Ready for pickup Tue, Dec 1" style dates. Each row has a button **Use this store for pickup**; chosen row shows "Selected for pickup". Selecting does not add anything by itself. Footer: **Add to bag** (enabled once a store is selected) and **Back** (to S2, preserving all selections). In "change store" mode (opened from S5) the footer reads **Update store** and **Cancel**: Update store applies the new store and date and returns to S5; **Cancel returns to S5 without modifying any of the bag's previous valid selections** (this includes the "Switch to pickup" case, where cancelling leaves the method as ship). A store blocked by recovery shows disabled "Unavailable for <variant>". |
| **S4** | Added to bag | Clear confirmation. Shows product, color, size, length, qty, price, **method, store, and pickup date** (or shipping estimate for shipping). Buttons: **View bag** (to S5) and **Keep shopping** (to S1). No promotional content. |
| **S5** | Shopping bag | Single line item with image, color, size, length, qty stepper, price. Links: **Edit item** (to S2 edit mode), **Remove**. Every correction starts here and returns directly here; the shopper never restarts the workflow. **Fulfillment block:** a Ship to me / Store pickup segmented control, the store and date when pickup is chosen, and **Change store** (opens S3 in change mode). **Order summary and Checkout button together at the top**, with nothing promotional above them. If pickup is selected without a store, Checkout is disabled with the reason beside it ("Choose a store to continue"). Empty bag shows a message and a link to S1. |
| **S6** | Checkout | **Order summary shows the product name, color, size and length, quantity, fulfillment method, store, pickup date (or shipping estimate), and total**, plus the price lines. Fictional fields (see §8). **Back to bag** link. Primary button reads **Review order** when the order is pickup and recovery has not yet happened; otherwise **Place simulated order**. Inline validation. |
| **S7** | Availability recovery | **Simulated.** Heading and message name whichever store was selected at the first valid pickup review and the exact selection, state that nothing was lost, show the saved item and entered details, and offer the two other stores with pickup dates as choices. **Westgate is the documented example** ("Tanger Outlet Westgate – American Eagle Outlet can no longer fulfill 10 Long in Medium Bright Indigo"), but the message always names the actual selected store. Choosing a replacement returns to S6. A **Return to bag** link goes to S5: **pickup stays the intended method, the unavailable store and its date are cleared**, and Checkout stays disabled until a store is chosen (see §9). |
| **S8** | Order confirmation | Unmistakable completion: heading "Order placed (simulated)", order number, item with color, size, length, qty, method, store and pickup date (or shipping estimate), total, and a "No real order or payment" note. Button **Start over** (to S1, full reset). |

### Transition table

| From | Trigger | Guard | To | Path type |
|---|---|---|---|---|
| S1 | Open a result | none | S2 | normal |
| S2 | Choose a store | method = pickup, size, length valid | S3 | normal |
| S2 | Add to bag | method = ship, size, length valid | S4 | normal |
| S2 | Update item | edit mode, valid | S5 | correction |
| S3 | Add to bag | store selected, normal mode | S4 | normal |
| S3 | Back | none | S2 | correction |
| S3 | Update store | store selected, change mode | S5 | correction |
| S3 | Cancel | change mode | S5 (bag unchanged) | correction |
| S4 | View bag | none | S5 | normal |
| S4 | Keep shopping | none | S1 | correction |
| S5 | Edit item | none | S2 (edit) | correction |
| S5 | Change store | method = pickup | S3 (change) | correction |
| S5 | Switch to pickup | no store yet | S3 (change) | correction |
| S5 | Checkout | bag non-empty; if pickup then store set | S6 | normal |
| S6 | Back to bag | none | S5 | correction |
| S6 | Review order | pickup, valid fields, `recoveryUsed = false` | S7 | **recovery** |
| S6 | Place simulated order | valid fields and (ship, or pickup with `recoveryUsed = true`) | S8 | normal |
| S7 | Choose replacement | store ≠ blocked store | S6 | **recovery** |
| S7 | Return to bag | none | S5 (pickup kept, store and date cleared) | correction |
| S8 | Start over | none | S1 (reset) | normal |

Normal pickup path: S1 → S2 → S3 → S4 → S5 → S6 → S7 → S6 → S8. A shipping order skips S3 and S7: S1 → S2 → S4 → S5 → S6 → S8. Direct URL guards: S6 with an empty bag redirects to S5; S7 only when `recovery.active`; S8 only when an order exists; otherwise redirect to the nearest valid state (S1).

## 6. Recovery event [SIMULATED, not observed]

Deterministic. No randomness.

- **Trigger:** the first time the shopper activates **Review order** at S6 with a pickup order and all required fields valid, and `recoveryUsed === false`.
- **Effect:** `recoveryUsed = true`; `blocked = { storeId: <current pickup store>, variantKey: <color|size|length> }`; clear the active pickup store and date; set `recovery.active = true`; go to S7. The order is not placed.
- **It affects whichever store is selected at that first valid pickup review**, even if the shopper changed stores earlier. The two other stores are the alternatives, each with its date. Westgate is only the documented example.
- **Preserve** item, options, quantity, method, typed checkout fields, payment selection, and bag.
- **Record** the failed store and its exact variantKey in `recovery.blocked`. **This record is kept for the whole session** (until Reset), even if the shopper temporarily changes color, size, or length, and even if the item is removed. A store counts as unavailable only while the current selection's variantKey equals the recorded one: when the shopper changes variants the store can be chosen again, and when they return to the exact failed variant it is blocked again (if it is currently selected, clear it and require a new store, with a message). In S3 a blocked store is shown disabled.
- **Leaving S7** (by choosing a replacement or by Return to bag) sets `recovery.active = false`; `recoveryUsed` stays true.
- **Return to bag from S7:** pickup stays the intended method; the unavailable store and its date are cleared; Checkout waits until a store is chosen via Change store (S3, change mode).
- **After choosing a replacement:** set store and date everywhere, go to S6, show a banner "Pickup store changed to <store> (Dec 2). Review your order, then place it." Button now reads **Place simulated order**. Nothing is placed automatically.
- **Once per session.** After recovery, the planned failure never fires again in this session, even for a different store.
- **Reset** (S8 Start over or the banner Reset link) clears all state, including `recoveryUsed`, so the failure happens again.
- **Realism note** for docs only: the original site says bag items are not reserved, so unavailability at checkout is plausible. The event itself is simulated and must never be presented as real.

## 7. State model

Use one central object with pure update functions and a `render()` that redraws from state. Persist to `sessionStorage` key `aeProto.v1` after every change, **excluding `payment`**; restore on load. Wrap storage access in try/catch and fall back to memory.

```js
state = {
  route: "S1",
  search: { query: "" },
  zip: "",
  draft: {                       // the S2 selection in progress
    productId, colorId, size, length, qty: 1, method: null   // "pickup" | "ship" | null
  },
  bag: null | {                  // single line item [DESIGN]
    productId, colorId, size, length, qty,
    method: "pickup" | "ship",
    storeId: null | "westgate" | "aerie" | "arrowhead"
  },
  editing: false,                // S2 in edit mode
  storeMode: "add" | "change",   // how S3 was opened
  checkout: { name, email, phone, address1, city, state, zip },   // persisted (fictional values)
  payment: { cardNumber, exp, cvv },                              // MEMORY ONLY: never persisted
  recoveryUsed: false,
  recovery: { active: false, blocked: null | { storeId, variantKey }, message: null },
  order: null | { number, snapshot }
}
```

Rules:

- Keep Shopping then adding another item **replaces** the bag item (single line item) after the S2 notice. [DESIGN]
- **Edits update the existing item; they never create a duplicate.**
- Changing size, length, or color revalidates: `recovery.blocked` is **never deleted** (only Reset clears it); if the current store is blocked for the new variantKey, clear it and require a new store with a message.
- Switching method to **ship** at S5: keep the item, clear `storeId`, show the shipping estimate (Tue, Dec 8). Switching to **pickup** with no store opens S3 (change mode); cancelling leaves the method as ship.
- Changing store at S5 or S7 updates store and date in S4 (if revisited), S5, S6, and S8.
- Checkout fields persist across S6 → S5 → S6 and across S6 → S7 → S6.
- Removing the item clears `bag` and `draft`, keeps `recoveryUsed` and `recovery.blocked`.
- Cancelling store-change mode from S5 restores S5 exactly as it was; do not write to `bag` until Update store.
- S3 change mode: keep a copy of the previous valid `bag` selection so Cancel can leave it untouched.

## 8. Checkout fields and validation [DESIGN]

Fictional data only. Show "Use fictional details. Don't enter real personal or payment information." above the fields. **Never retain real payment information:** card number, expiry, and CVV live in memory only. They are never written to `sessionStorage`, `localStorage`, cookies, or logs, are never sent anywhere, are cleared on Reset and on a page refresh, and are never shown on S8 (at most "Simulated card"). Set `autocomplete="off"` on the payment fields. Name, email, and phone may be persisted for the session, but only fictional values are expected. Provide a small **Use sample details** link that fills fictional values (name "Alex Sample", email "alex@example.com", phone "555-0100", card "4111 1111 1111 1111", exp "12/30", CVV "123"; for shipping, address "100 Sample St", Phoenix AZ 85001). This is a demo aid, not a state.

- **Pickup order:** Pickup person full name, email, phone. **Ship order:** name, email, address line 1, city, state, ZIP.
- **Payment (both):** "Simulated card" number (12–19 digits, spaces allowed), expiry `MM/YY`, CVV 3–4 digits. No real validation beyond format.
- Validate on the primary button. On errors: an error summary at the top (`role="alert"`), inline message under each bad field, `aria-invalid="true"`, then **scroll to and focus the first invalid field** (mirrors the observed strength). Errors clear as the field is corrected. Never reach S7 or S8 with an invalid field.

## 9. Information preservation (matches slide 26)

| Moment | Preserved | Cleared | Updated |
|---|---|---|---|
| S3 → S2 (Back) | color, size, length, qty | nothing | nothing |
| S4 → S1 (Keep shopping) | bag item | draft selections | bag count |
| S5 → S2 → S5 (edit item) | method, store, date, qty | nothing | same item; store revalidated for new size/length |
| S5 → S3 → S5 (change store) | item, options, qty | old store and date | new store and date everywhere |
| S5 → S3 → S5 (Cancel) | **everything, unchanged** | nothing | nothing |
| S5 (switch to ship) | item, options | store and date | method, shipping estimate Dec 8 |
| S6 → S5 → S6 | typed details, payment | nothing | whatever was edited, plus totals |
| S6 → S7 (recovery) | item, options, qty, method, typed details, payment | failed store and its date | error names the failed store |
| S7 → S6 (replacement) | all of the above | nothing | store and date everywhere |
| S7 → S5 (Return to bag) | item, options, qty, **pickup as the method** | the unavailable store and its date | Checkout waits until a store is chosen |
| S8 → S1 (Start over) | nothing | whole session | everything resets, recovery can recur |

## 10. Technical constraints

- Static HTML, CSS, and JavaScript. No backend, no build step required. **Use classic `<script>` files (no ES modules) so `index.html` opens by double-click**; also work from any static host.
- Suggested layout: `index.html`, `css/styles.css`, `js/data.js` (catalog, stores, size matrix), `js/pricing.js`, `js/state.js`, `js/router.js`, `js/views.js` (S1–S8 render functions), `js/main.js`, `assets/`.
- Hash routing (`#/s1`…`#/s8`), with a guard function run on every `hashchange` and on load. The browser Back button must never strand the shopper or break state.
- Keep state in the central model; views read it, never keep private copies.
- Avoid dead controls. Every visible button or link must do something meaningful.
- Visual style: American Eagle–inspired, clean: navy and white with neutral grays, a blue primary action, uncluttered hierarchy. Screenshots are references, not UI to copy. Desktop-first (≥1280 px comfortable), responsive where practical.
- **Persistent notice bar** (slim, top): "Academic redesign prototype · Not affiliated with or endorsed by American Eagle Outfitters · Orders and payments are simulated · Simulated date: Mon, Nov 30, 2026" with a **Reset demo** link. The version (`v1.0-pretest`) is kept in the git tag and README, not shown in the interface (final polish).
- Accessibility: logical focus order; move focus to the page `h1` on every state change; visible focus ring; every input labeled; selected states not conveyed by color alone (check mark or text); text contrast ≥ 4.5:1; targets ≥ 40 px; recovery message in a `role="alert"` region; no keyboard traps; a skip-to-content link.
- Do not label individual stores or dates "(simulated)" in the UI; the banner already says the whole site is simulated. The report and documentation state which values are simulated.

## 11. Acceptance tests (run all before handing back)

1. **Happy path.** Search "baggy wide-leg" → open card 3 → size 10, length Long, qty 1, Store pickup → Choose a store → ZIP 85392 → Westgate → Add to bag → S4 shows Westgate and Tue, Dec 1 → View bag → S5 shows the same plus $72.56 → Checkout → valid fictional details → **Review order → S7**, naming Westgate → choose Aerie → S6 shows Aerie, Wed, Dec 2 → **Place simulated order → S8** with Aerie, Dec 2, $72.56, order `AE-SIM-463001`.
2. **Math.** qty 1 total = **$72.56**; qty 2 = **$145.13**; qty 3 = **$217.69**; savings $3.50 per pair; tax uses 9.2%.
3. **Size and length.** Size 10: X-Short is disabled with a reason; Short, Regular, Long, X-Long selectable. Size 18: Short disabled. Choosing size 4 after Length Long keeps Long; choosing 000 after Long clears Length with a note.
4. **Method required.** Add or Choose a store with no method gives an inline error and focus.
5. **No duplicates.** Edit size at S5 → S2 → Update item: still one line item, store revalidated. Change qty and method: one line item, correct totals.
6. **Change store.** S5 → Change store → S3 (change mode) → pick another → S5 shows the new store and date; S6 and S8 follow. **Cancel** from S3 change mode returns to S5 with the previous store, date, and every other selection unchanged; cancelling "Switch to pickup" leaves the method as ship.
7. **Switch to ship.** S5 shipping: store cleared, estimate Tue, Dec 8 shown; S6 button reads **Place simulated order** and a valid form places the order directly (S8 shows the shipping estimate).
8. **Validation.** Empty fields on S6 → summary, inline errors, focus and scroll to the first invalid field; no S7 or S8.
9. **Recovery.** The first valid pickup review always opens S7 and names **whichever store is selected then** (test with Westgate, with Aerie, and after changing stores in the bag); order blocked; two alternatives with dates; the failed store is never selectable for that exact variant; preserved fields still filled on return to S6; recovery does not fire a second time in the same session. **Variant memory:** after recovery, change the size or length (the failed store becomes selectable), then change back to 10 Long (it is blocked again).
10. **Return to bag from S7.** S5 shows pickup as the method with the unavailable store and date cleared, and Checkout disabled until a store is chosen; choosing one via Change store and returning works without restarting.
11. **Reset.** S8 Start over and the banner Reset both clear everything; repeating the happy path triggers recovery again. Do this twice.
12. **Guards.** Typing `#/s7` or `#/s8` directly without the right state redirects. Browser Back and Forward never break state. Refresh keeps non-payment state (sessionStorage); payment fields come back empty and `sessionStorage` holds no card number, expiry, or CVV.
13. **Quality.** No console errors. No remote asset needed for core function. Works from a double-clicked `index.html` and from a static host. Keyboard-only run-through reaches S8.

## 12. Deliverables for the report (after implementation)

- Public working URL (for example GitHub Pages or Vercel). A source or design-file link alone does not satisfy the handout.
- One readable screenshot per state S1–S8, captured from the running prototype, named `S1-…` through `S8-…`.
- Opening and reset instructions, and a short limitations note: all data, dates, stores, tax rate, and the recovery event are simulated; no real orders, payments, or inventory.
- Update slide 25 only if the wireflow changes; update the coverage table only if state behavior changes.

## 13. Versioning

Commit and tag the finished build **`v1.0-pretest`** (or keep a duplicate deployment). Milestone 2 changes go on a new branch or version. Never overwrite the pre-test build.

## 14. Decision log (what changed from the first spec)

- Scenario now specifies simulated date Nov 30, event Dec 5, budget $75, one pair, ZIP 85392.
- F5 priority changed Medium → **Low**. F1–F4 unchanged. A new slide 5B holds the F1 evidence panel.
- S7 renamed **Availability recovery** and gets an explicit **Return to bag** edge (new).
- S2 now has separate Size and Length fields and no preselected method, with two exits (pickup → S3, ship → S4).
- S3 shows three stores (Dec 1, 2, 3) with Back and Add to bag; in change mode it returns to S5.
- S4 gains Keep shopping → S1. S5 gains edges to S3 and S2 and an Update item return.
- S6 has the two-label primary button and guarded exits to S7 and S8. S8 gains Start over → S1.
- Tax fixed at 9.2% so one pair still totals $72.56. Shipping estimate Tue, Dec 8.
- Bag holds a single line item; adding another item replaces it.
- Wireflow redrawn (`american_eagle_wireflow_v2`) with no crossings or label collisions.

### Final UI polish (approved)

- Development labels removed from the interface: no "Screen S#" or version text in the footer. The version lives in the
  `v1.0-pretest` git tag and the README. State IDs remain as `data-state` test hooks and route hashes only.
- One concise notice bar (academic prototype, not affiliated, orders and payments simulated, simulated date, Reset demo);
  the footer keeps only the product-image credit and the simulated-data note.
- Terminology standardized: Shopping Bag, Store Pickup, Ship to Me, Checkout, "Ready for pickup by <date>"; headings in Title
  Case, buttons and links in sentence case (matching the spec's labels).

### Realism pass (approved)

- With the instructor's approval the prototype uses AE's product photos (stored locally, credited, `noindex`).
- Non-target cards 1, 2, 4, 5 use AE's real product and wash names so labels match their photos (user-approved). Their prices
  stay simulated. The target (card 3), all scenario values, stores, dates, totals and recovery logic are unchanged.
- The header bag badge counts distinct line items (not quantity) and is hidden when the bag is empty.

### Clarifications added Nov 22 (approved)

- Recovery affects whichever store is selected at the first valid pickup review, even after earlier store changes.
- Return to bag from S7 keeps pickup as the method and clears the unavailable store and date.
- Cancelling a store change started in the bag returns to the bag without modifying its previous valid selections (new S3 → S5 Cancel edge).
- The failed store and exact variant are recorded for the session, even when variants change temporarily.
- Fictional checkout and payment data only; card details are never retained.
- Bag corrections start in the bag and return directly to it without restarting the workflow.
- S6 summary lists product, size, color, method, store, date, and total.
- Westgate's unavailability in S7 is presented as an example of the simulated recovery.

## 15. Screenshot evidence index [OBSERVED]

The numbered files are screenshots of the **original** American Eagle site, not prototype states. Capture date: Nov 20, 2026.

| Ref | Original capture | Use |
|---|---|---|
| `01-homepage.png` | `image(20261120-203305).png` | background |
| `02-exact-search-no-suggestions.png` | `image(20261120-203848).png` | background |
| `03-search-results-top.png` | `image(20261120-204338).png` | background |
| `04-search-result-product-cards.png` | `image(20261120-204401).png` | background |
| `05-product-details-top.png` | `image(20261120-204704).png` | product page layout |
| `06-product-purchase-controls-before-size.png` | `image(20261120-204752).png` | F1 context |
| `07-product-details-scroll.png` | `image(20261120-204901).png` | background |
| `08-size-fit-guidance.png` | `image(20261120-204910).png` | background |
| `09-product-recommendations.png` | `image(20261120-204954).png` | background |
| `10-size-dropdown-start.png` | `image(20261120-205125).png` | F2 |
| `11-size-dropdown-middle.png` | `image(20261120-205246).png` | F2 |
| `12-size-dropdown-end.png` | `image(20261120-205437).png` | F2 (18 Short struck through) |
| `13-size-selected-location-needed.png` | `image(20261120-205845).png` | F1 |
| `14-store-lookup-zip.png` | `image(20261120-210024).png` | background |
| `15-store-lookup-results.png` | `image(20261120-210039).png` | F1 ("Find a Store" vs "Select Store") |
| `16-store-selected-product-page.png` | `image(20261120-210201).png` | F1 |
| `17-added-to-bag-confirmation.png` | `image(20261120-210816).png` | F3 |
| `18-added-to-bag-full-view.png` | `image(20261120-210856).png` | F3 (hero) |
| `19-shopping-bag-top.png` | `image(20261120-211014).png` | F5 |
| `20-shopping-bag-item-and-summary.png` | `image(20261120-211200).png` | F3, F4, F5 |
| `21-shopping-bag-checkout-button.png` | `image(20261120-211347).png` | F5 |
| `22-checkout-default-shipping.png` | `image(20261120-211628).png` | F1, F4 (on arrival) |
| `23-checkout-shipping-address.png` | `image(20261120-211742).png` | background |
| `24-checkout-shipping-payment.png` | `image(20261120-211834).png` | background |
| `25-checkout-pickup-selected.png` | `image(20261120-212516).png` | F1, F4 (after manually selecting pickup) |
| `26-checkout-pickup-person.png` | `image(20261120-212715).png` | pickup person fields |
| `27-checkout-pickup-order-summary.png` | `image(20261120-212742).png` | F3 |

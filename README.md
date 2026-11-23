# AE Jeans Pickup Redesign — Interactive Prototype (v1.0-pretest)

CSE 463 Final Project, Milestone 1. A human-centered redesign of American Eagle's online
jeans shopping and **store-pickup** workflow, built as a static HTML/CSS/JavaScript prototype.
This is a class prototype. It is not affiliated with or endorsed by American Eagle Outfitters.

- **Working prototype:** the Vercel production URL for this repository (see "Hosting" below)
- **Visual direction:** [`docs/VISUAL_DIRECTION.md`](docs/VISUAL_DIRECTION.md) (measured ae.com styles and what stays redesigned)
- **Specification:** [`AE_PROTOTYPE_CONTEXT.md`](AE_PROTOTYPE_CONTEXT.md) (authoritative)
- **Pre-test version:** git tag `v1.0-pretest`. Milestone 2 revisions go on a new branch or version; the tag is never moved.

## Opening the prototype

- **Online:** open the Vercel URL in a desktop browser (≥1280 px wide is most comfortable; phones work too).
- **Offline:** download or clone the repository and double-click `index.html`. No server or build step is needed.

The prototype starts on the **S1 homepage**; searching (or choosing Women / Jeans) shows the S1 results page.
The navy notice bar at the top of every screen says it is an academic, simulated prototype not affiliated with American Eagle Outfitters.

## Resetting

- Click **Reset demo** in the top banner at any time, or **Start over** on the order confirmation (S8).
- Either one clears the whole session, including the recovery event, so the planned availability problem happens again.
- Closing the browser tab also clears the session (state is kept in `sessionStorage` only).

## States (S1–S8)

| ID | State | Route |
|---|---|---|
| S1 | Product search: homepage, then results with filters and sort (one state, two views) | `#/s1` |
| S2 | Product details (separate Size and Length, explicit pickup/ship choice) | `#/s2` |
| S3 | Store selection: "Find a Store" style overlay ("Use this store for pickup"; add and change modes) | `#/s3` |
| S4 | Added to bag: right-side drawer (shows method, store, pickup date) | `#/s4` |
| S5 | Shopping bag (summary + Checkout at top; edit item, quantity, method, store) | `#/s5` |
| S6 | Checkout (fictional details, inline validation) | `#/s6` |
| S7 | Availability recovery (simulated) | `#/s7` |
| S8 | Order confirmation (simulated) | `#/s8` |

Normal pickup path: S1 → S2 → S3 → S4 → S5 → S6 → S7 → S6 → S8. Shipping path: S1 → S2 → S4 → S5 → S6 → S8.
Screenshots of every state are in [`docs/screenshots/`](docs/screenshots/).

## Simulated functions and limitations

- **Everything is simulated:** product data, inventory, sizes and lengths, store list, distances, pickup dates,
  shipping estimate (Tue, Dec 8), the 9.2% tax rate, the order number (`AE-SIM-463001`), and "today" (Mon, Nov 30, 2026).
  Values observed on ae.com (the target product, its $66.45 / $69.95 price, the Westgate store at 4.8 mi with a Dec 1 date,
  10 Long available, 18 Short unavailable) are used as a basis but are not live data.
- **Recovery event (simulated, deterministic):** the first time a valid **pickup** order is submitted with **Review order**,
  whichever store is selected at that moment is reported as unable to fulfill the exact item (product, color, size, length).
  The shopper chooses one of the two other stores or returns to the bag. It happens once per session and recurs after a reset.
  It is not a real inventory check.
- **No real orders, payments, accounts, or inventory.** Use fictional details only; **Use sample details** on checkout fills them.
  Card number, expiry and CVV are kept in memory only: they are never saved to storage, sent anywhere, or shown after the order,
  and they clear on refresh and reset.
- Small catalog (five search results, three products), one line item in the bag (adding another replaces it).
  Header categories other than Women and Jeans explain that the prototype only includes women's jeans.
- **Images and branding:** product photos are American Eagle's own (© American Eagle Outfitters), stored locally and used only
  for this non-commercial academic critique (see `assets/products/README.md`). The four non-target items use AE's real names and washes.
  The wordmark is typeset text, not AE's logo artwork. The font is Avenir Next where installed, otherwise self-hosted Nunito Sans (SIL OFL).
- Desktop-first; usable at phone width but not optimized for it. Formal usability testing has not yet occurred.

## Development

Plain classic scripts (no build, no modules) so `index.html` works from `file://` and any static host.

```
index.html          app shell, banner, footer (version tag)
css/styles.css      styles
js/data.js          catalog, stores, size/length matrix, search
js/pricing.js       integer-cent pricing (1 × $66.45 → $72.56)
js/state.js         central state, pure actions, validation, sessionStorage (payment excluded)
js/router.js        hash routes #/s1–#/s8 and guards
js/views.js         site header and S1–S8 render functions
assets/products/    local copies of the AE product photos used by the prototype
assets/fonts/       self-hosted Nunito Sans (OFL)
tools/              fetch-ae-images.js (re-downloads the product photos)
docs/               visual direction notes and S1–S8 screenshots
js/main.js          dispatch, rendering, focus management, events
tests/              unit checks, acceptance tests (spec §11), screenshot capture
```

Run the checks (Node + Playwright):

```bash
node tests/unit.js
python3 -m http.server 8463
node tests/acceptance.js http://localhost:8463/
node tests/acceptance.js "file://$PWD/index.html"
node tests/acceptance.js https://<your-vercel-url>/
```

## Hosting (Vercel)

The site is plain static files served from the repository root (`index.html`, relative asset paths, hash routing),
so Vercel needs no framework, build command or output directory ("Other" preset). Each pushed branch gets a
preview deployment; production follows `main`. `.nojekyll` is harmless on Vercel and kept for GitHub Pages compatibility.

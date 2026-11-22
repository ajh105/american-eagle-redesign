# AE Jeans Pickup Redesign — Interactive Prototype (v1.0-pretest)

CSE 463 Final Project, Milestone 1. A human-centered redesign of American Eagle's online
jeans shopping and **store-pickup** workflow, built as a static HTML/CSS/JavaScript prototype.
This is a class prototype. It is not affiliated with or endorsed by American Eagle Outfitters.

- **Working prototype:** `https://ajh105.github.io/american-eagle-redesign/` (GitHub Pages; see "Hosting" below)
- **Specification:** [`AE_PROTOTYPE_CONTEXT.md`](AE_PROTOTYPE_CONTEXT.md) (authoritative)
- **Pre-test version:** git tag `v1.0-pretest`. Milestone 2 revisions go on a new branch or version; the tag is never moved.

## Opening the prototype

- **Online:** open the GitHub Pages URL above in a desktop browser (≥1280 px wide is most comfortable).
- **Offline:** download or clone the repository and double-click `index.html`. No server or build step is needed.

The prototype starts at **S1 Product search**. A slim banner at the top of every screen says it is simulated.

## Resetting

- Click **Reset demo** in the top banner at any time, or **Start over** on the order confirmation (S8).
- Either one clears the whole session, including the recovery event, so the planned availability problem happens again.
- Closing the browser tab also clears the session (state is kept in `sessionStorage` only).

## States (S1–S8)

| ID | State | Route |
|---|---|---|
| S1 | Product search | `#/s1` |
| S2 | Product details (separate Size and Length, explicit pickup/ship choice) | `#/s2` |
| S3 | Store selection ("Use this store for pickup"; add and change modes) | `#/s3` |
| S4 | Added to bag (shows method, store, pickup date) | `#/s4` |
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
js/views.js         S1–S8 render functions
js/main.js          dispatch, rendering, focus management, events
tests/              unit checks, acceptance tests (spec §11), screenshot capture
```

Run the checks (Node + Playwright):

```bash
node tests/unit.js
python3 -m http.server 8463
node tests/acceptance.js http://localhost:8463/
node tests/acceptance.js "file://$PWD/index.html"
node tests/acceptance.js https://ajh105.github.io/american-eagle-redesign/
```

## Hosting (GitHub Pages)

The site is served from the repository root (`index.html`, relative asset paths, hash routing), so it works under the
project path `/american-eagle-redesign/` without configuration. `.nojekyll` disables Jekyll processing.
Enable it in **Settings → Pages → Build and deployment → Deploy from a branch**, choosing the branch that holds this
build and the `/ (root)` folder.

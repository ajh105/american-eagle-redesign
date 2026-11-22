# Visual Direction: High-Fidelity Refinement

Branch: `claude/ae-visual-refinement`. This builds on the functional pre-test build and does not replace it.

## 1. How the references were gathered

On Nov 22, 2026, the live site (www.ae.com, desktop Chromium, 1440 × 900, signed out, fresh session) was opened and
measured with computed CSS styles and DOM boxes. The pages inspected were the homepage and header, search results for
"baggy wide-leg", the product page for style 0437-6331 (Medium Bright Indigo, color code 857), the size dropdown, the
"Find a Store" overlay (ZIP 85392), the "Added to bag!" drawer, the shopping bag, and the guest checkout page.
No personal data was entered and nothing was submitted. The original screenshots 01–27 (Nov 20) were used to check
states that the live session did not show (for example, the checkout with Free Store Pickup selected).

Measured values are marked **[measured]**. Values chosen for the prototype are marked **[chosen]**.

## 2. Design tokens

### Typography

| Use | Original | Prototype |
|---|---|---|
| Family | "Avenir Next" Regular / Medium / Demi **[measured]** (licensed) | `"Avenir Next", "Nunito Sans", "Helvetica Neue", Arial, sans-serif` **[chosen]**. Avenir Next is used where installed (macOS, iOS); otherwise self-hosted Nunito Sans (OFL). |
| Letter spacing | 0.3px on nearly everything **[measured]** | 0.3px |
| Body | 16px / 22.86px, `#24272A` **[measured]** | same |
| Page title (Bag, Checkout) | 30px / 34px Demi **[measured]** | same |
| Section title (Order Summary, modal title) | 18px / 23–28px Demi **[measured]** | same |
| Product title (PDP) | 18px / 23.4px Demi **[measured]** | same |
| Nav links | 13px / 13px Medium, `#24272A`, padding 4px 20.5px 13px **[measured]** | same |
| Product tile name | 12px / 16.8px Regular, `#666` **[measured]** | same |
| Tile price | 13px; sale Demi **[measured]** | same |
| Secondary detail (Color:, Size:, Qty:) | 11–12px Regular, `#666` **[measured]** | 12px (small text raised slightly for test readability) |
| Buttons | 14px Demi **[measured]** | same |

### Color

| Token | Value | Source |
|---|---|---|
| Ink (text, primary buttons) | `#24272A` | measured |
| Secondary text | `#666666` | measured |
| Promo bar | `#182C52` | sampled |
| Brand bar | `#F6F6F6` | sampled |
| Logo red | `#EF0B1A` | sampled |
| Sale price red | `#E51B23` | sampled |
| Deal and error red | `#BF0A10` | measured |
| Savings green | `#328648` | sampled |
| Flag blue (fit label) | `#407499` | measured |
| Badge background | `#D6E4EE` | measured |
| Place Order blue | `#385ADC` | measured |
| Borders | `#CCCCCC` (cards, summary), `#D6D6D6` (inputs, outline buttons), `#E7E7E7` (search pill), `#F6F6F6` (dividers) | measured or sampled |
| Photo backdrops | `#E5E4D9` (flat-lay), `#CFC2A6` (on-model) | sampled |

### Shape and components [measured unless noted]

- **Primary button:** `#24272A` fill, white text, 50px tall, fully rounded (radius 25px).
- **Secondary button:** white fill, 2px `#D6D6D6` inset ring, 40px tall, radius 20px.
- **Place Order button:** `#385ADC` blue pill, 50px tall. The prototype uses it for Checkout, Review order and Place simulated order **[chosen]**.
- **Inputs:** 50px tall, radius 5px, 1px `#D6D6D6` inset ring, padding 15px 24px, floating 10px label on the top border.
- **Store cards:** 1px `#CCCCCC` border, radius 10px. The modal is 553px wide with radius 8px.
- **Added to bag drawer:** right side, 350px wide, full height, dimmed page behind.
- **Delivery toggle (checkout):** two 50px tiles, radius 8px on the outer corners; the selected tile has a 2px `#24272A` ring.
- **Badges:** "Save 40%" style, 10px Demi on `#D6E4EE`, radius 2px.

### Layout [measured at 1440px]

- **Page margins:** about 57–62px.
- **Search results:** 283px filter rail, then a 3-column grid with 8px gaps; image tiles about 326 × 417 (about 4:5).
- **Product page:** gallery 860px wide (two 428 × 548 tiles, then one full-width tile); purchase column 324px starting 55px to the right. The prototype widens this column to 380px **[chosen]** to fit separate Size and Length controls.
- **Bag and checkout:** left column 663px, right column 553px, about 110px gap.

## 3. What stays like the original

- Header structure: dark promo bar, brand bar with the AE tab and bag icon, centered red wordmark, pill search box, centered category nav.
- White pages, Avenir-style type, 0.3px tracking, gray secondary text, restrained color.
- Large photo tiles with small gray names and prices; a filter rail on the results page.
- Product page with a large two-up gallery on the left and a narrow purchase column on the right.
- Dark pill Add to Bag button; a "Find a Store" style centered overlay; a right-side "Added to bag!" drawer.
- Bag with items on the left and order summary on the right. Checkout with a minimal header, a delivery toggle, floating-label fields, and a summary column.

## 4. What stays redesigned (the five findings)

| Finding | Original | Prototype |
|---|---|---|
| F1 | Store selected but pickup not committed | Explicit Store Pickup / Ship to Me choice before Add to Bag; button "Use this store for pickup" |
| F2 | One long combined size+length dropdown | Separate Size and Length controls; unavailable lengths stay visible, struck through, with a reason |
| F3 | Store and date missing from drawer and bag | Method, store and date shown in the drawer (S4), the bag (S5) and checkout (S6) |
| F4 | No fulfillment correction in the bag | Ship / Pickup toggle and Change Store in the bag, returning directly to it |
| F5 | Checkout below Rewards, promo code and banners | Order Summary and Checkout at the top of the bag's right column; no promotions above it |

## 5. Assets

- **Product photography (realism pass):** with the instructor's approval, the prototype now uses AE's own product photos for
  the five catalog items, stored locally under `assets/products/` (fetched by `tools/fetch-ae-images.js`; see
  `assets/products/README.md`). Images © American Eagle Outfitters, used only for this non-commercial academic critique;
  the footer credits them and pages are `noindex`. The earlier generated renders were removed.
- **Catalog labels:** to match their photos, the four non-target cards use AE's real product and wash names
  (Super High-Waisted Straight · Black Charcoal; Wide-Leg · Dark Indigo Wash and Salty Air; Curvy · Dark Wash, as seen on the
  Nov 20 results page). Their prices stay simulated. The target item, its price, the stores, dates and totals are unchanged.
- **Gallery order [measured]:** model back + flat front, full-width model front, flat back + model side, then detail.
- **Logo:** the red wordmark is still typeset text, not AE's logo artwork.
- **Fonts:** Nunito Sans (SIL OFL 1.1), self-hosted in `assets/fonts/`; Avenir Next is used where installed.

## 6. Academic notice

The promo bar, which on the original site carries sale messages, carries the academic notice on every screen:
"Academic redesign prototype · Not affiliated with or endorsed by American Eagle Outfitters · Orders, payment and inventory
are simulated", plus the simulated date and **Reset demo**. Pages are marked `noindex` so search engines do not list the prototype.

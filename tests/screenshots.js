/* Captures one readable screenshot per state (S1–S8) for the report (§12).
 * Usage: node tests/screenshots.js <base-url> <out-dir> [width]
 */
"use strict";
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = (process.argv[2] || "http://localhost:8463/").replace(/#.*$/, "");
const OUT = process.argv[3] || "docs/screenshots";
const WIDTH = parseInt(process.argv[4] || "1280", 10);
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 });
  const shot = async (name) => {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    // Overlay states (S3 modal, S4 drawer) are captured at viewport size so the overlay is framed correctly.
    const overlay = await page.evaluate(() => document.body.classList.contains("overlay-open"));
    await page.screenshot({ path: path.join(OUT, name + ".jpg"), type: "jpeg", quality: 88, fullPage: !overlay });
    console.log("saved " + name);
  };
  await page.goto(BASE + "#/s1");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();

  await shot("S1a-homepage");
  await page.fill("#search-input", "baggy wide-leg");
  await page.click("#search-button");
  await shot("S1-product-search");

  await page.click("#card-c3");
  await page.click('label[for="size-10"]');
  await page.click('label[for="len-long"]');
  await page.click('label[for="method-pickup"]');
  await shot("S2-product-details");

  await page.click("#primary-action");
  await page.fill("#zip-input", "85392");
  await page.click("#find-stores");
  await page.click("#store-westgate");
  await shot("S3-store-selection");

  await page.click("#add-to-bag");
  await shot("S4-added-to-bag");

  await page.click("#view-bag");
  await shot("S5-shopping-bag");

  await page.click("#checkout-button");
  await page.click("#fill-sample");
  await shot("S6-checkout");

  await page.click("#checkout-submit");
  await shot("S7-availability-recovery");

  await page.click("#alt-aerie");
  await shot("S6b-checkout-after-recovery");

  await page.click("#checkout-submit");
  await shot("S8-order-confirmation");

  // Supporting states
  await page.click("#start-over");
  await page.fill("#search-input", "baggy wide-leg");
  await page.click("#search-button");
  await page.click("#card-c3");
  await page.click('label[for="size-10"]');
  await page.click("#primary-action");
  await shot("S2b-product-details-validation");
  await page.click('label[for="len-long"]');
  await page.click('label[for="method-pickup"]');
  await page.click("#primary-action");
  await page.fill("#zip-input", "85392");
  await page.click("#find-stores");
  await page.click("#store-westgate");
  await page.click("#add-to-bag");
  await page.click("#view-bag");
  await page.click("#checkout-button");
  await page.click("#checkout-submit");
  await shot("S6c-checkout-validation");
  await page.click("#fill-sample");
  await page.click("#checkout-submit");
  await page.click("#return-to-bag");
  await shot("S5b-bag-after-return-from-recovery");
  await page.click("#change-store");
  await shot("S3b-change-store-mode");

  await browser.close();
})();

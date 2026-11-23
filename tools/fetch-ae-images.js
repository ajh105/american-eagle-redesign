/* Downloads the American Eagle product images used by this academic prototype and
 * stores them locally (assets/products/) so the prototype does not hotlink.
 *
 * Images © American Eagle Outfitters. Used only for a non-commercial CSE 463
 * academic redesign critique; not for redistribution. Only the five items in the
 * prototype's catalog are fetched.
 *
 * Usage: node tools/fetch-ae-images.js   (needs network access to s7d2.scene7.com; uses curl)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT = path.join(__dirname, "..", "assets", "products");
fs.mkdirSync(OUT, { recursive: true });

// AE image codes (style_color_wash) for the prototype's five items [OBSERVED on ae.com, Nov 22, 2026].
const CODES = [
  "0437_6331_857", // AE Super High-Waisted Baggy Wide-Leg Jean, Medium Bright Indigo (scenario target)
  "0437_5870_913", // same style, Dark Indigo Wash
  "0437_5343_452", // same style, Salty Air (light wash; matches the Nov 20 results page)
  "4436_6432_896", // AE Curvy Super High-Waisted Baggy Wide-Leg Jean, Dark Wash
  "0435_5884_056"  // AE Super High-Waisted Straight Jean, Black Charcoal
];
// of/ob = on-model front/back, f/b = flat-lay front/back, os = on-model side, d2 = detail.
const VIEWS = ["of", "ob", "f", "b", "os", "d2"];

const results = [];
for (const code of CODES) {
  for (const v of VIEWS.concat(["s"])) {
    const file = path.join(OUT, `${code}_${v}.jpg`);
    const q = v === "s" ? "wid=96&hei=96&fmt=jpg&qlt=85" : "wid=900&fmt=jpg&qlt=82";
    try {
      execFileSync("curl", ["-sSf", "-o", file, `https://s7d2.scene7.com/is/image/aeo/${code}_${v}?${q}`]);
      // AE serves a small "Sorry! This image seems to be missing" placeholder (~28 KB) instead of a 404.
      if (v !== "s" && fs.statSync(file).size < 35000) throw new Error("placeholder");
      results.push(`${code}_${v} ok (${Math.round(fs.statSync(file).size / 1024)} KB)`);
    } catch (e) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      results.push(`${code}_${v} MISSING`);
    }
  }
}
console.log(results.join("\n"));

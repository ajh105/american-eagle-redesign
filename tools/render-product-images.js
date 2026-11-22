/* Generates the prototype's product "photography": original flat-lay renders of each
 * jean and wash, saved as JPEGs under assets/products/. These are NOT American Eagle
 * photos. Replace any file with a properly licensed photo of the same name to swap it in.
 *
 * Usage: node tools/render-product-images.js
 * Views: front, back, detail (waistband close-up), pocket (back pocket close-up), plus hero.jpg.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "products");
fs.mkdirSync(OUT, { recursive: true });

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8"), ctx);
const AE = ctx.window.AE;

// Wash palettes [chosen to match the original product photos' washes]
const WASH = {
  "dark-indigo": { base: "#28385a", hi: "#4c6390", lo: "#18223b", whisker: "#6d82ad" },
  "medium-bright-indigo": { base: "#5a7fb4", hi: "#9dbbe0", lo: "#36578a", whisker: "#c3d6ee" },
  "light-vintage": { base: "#9fbad8", hi: "#d6e5f3", lo: "#7493b9", whisker: "#eef4fa" }
};
const THREAD = "#b98a45";

function silhouette(shape) {
  // Outer hem x and inner hem x per leg; wide vs straight.
  const g = shape === "wide"
    ? { oh: 168, ih: 384, hip: 270, thigh: 250 }
    : { oh: 228, ih: 390, hip: 276, thigh: 268 };
  const L = (x) => x, R = (x) => 800 - x;
  return `M 290 150 Q 400 162 510 150 L ${R(g.hip)} 300
    C ${R(g.hip) + 14} 420, ${R(g.oh) - 22} 700, ${R(g.oh)} 962
    L ${R(g.ih)} 968 C ${R(g.ih) + 2} 760, 406 560, 400 432
    C 394 560, ${L(g.ih) - 2} 760, ${L(g.ih)} 968
    L ${L(g.oh)} 962 C ${L(g.oh) + 22} 700, ${L(g.hip) - 14} 420, ${L(g.hip)} 300 Z`;
}

function defs(w) {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ebe9e1"/><stop offset="1" stop-color="#dcd9cd"/></linearGradient>
    <radialGradient id="light" cx="0.5" cy="0.35" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="fade" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${w.hi}" stop-opacity="0.85"/><stop offset="1" stop-color="${w.hi}" stop-opacity="0"/></radialGradient>
    <linearGradient id="edgeL" x1="0" x2="1"><stop offset="0" stop-color="${w.lo}" stop-opacity="0.8"/><stop offset="0.35" stop-color="${w.lo}" stop-opacity="0"/><stop offset="0.65" stop-color="${w.lo}" stop-opacity="0"/><stop offset="1" stop-color="${w.lo}" stop-opacity="0.55"/></linearGradient>
    <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2c78c"/><stop offset="0.5" stop-color="#a8823f"/><stop offset="1" stop-color="#6e5222"/></linearGradient>
    <pattern id="twill" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-62)">
      <rect width="3.2" height="3.2" fill="none"/><rect width="1.2" height="3.2" fill="#000" opacity="0.11"/><rect x="1.8" width="0.6" height="3.2" fill="#fff" opacity="0.07"/>
    </pattern>
    <filter id="noise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="3" seed="7"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.4 1.05"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.6 0.25" numOctaves="2" seed="3"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 -0.12"/>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="paper" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="11"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.07 0"/>
    </filter>
  </defs>`;
}

function jeans(productId, colorId, side) {
  const p = AE.PRODUCTS[productId];
  const w = WASH[colorId];
  const sil = silhouette(p.shape);
  const front = side === "front";
  const stitch = `fill="none" stroke="${THREAD}" stroke-width="1.5" stroke-dasharray="4.5 3.5" stroke-linecap="round" opacity="0.8"`;
  const seam = `fill="none" stroke="${w.lo}" stroke-width="2" opacity="0.55"`;
  const legX = p.shape === "wide" ? [262, 538] : [300, 500];

  const fading = front
    ? `<ellipse cx="${legX[0] + 20}" cy="430" rx="70" ry="150" fill="url(#fade)"/>
       <ellipse cx="${legX[1] - 20}" cy="430" rx="70" ry="150" fill="url(#fade)"/>
       <ellipse cx="${legX[0] + 5}" cy="660" rx="58" ry="80" fill="url(#fade)" opacity="0.6"/>
       <ellipse cx="${legX[1] - 5}" cy="660" rx="58" ry="80" fill="url(#fade)" opacity="0.6"/>`
    : `<ellipse cx="${legX[0] + 25}" cy="330" rx="85" ry="95" fill="url(#fade)"/>
       <ellipse cx="${legX[1] - 25}" cy="330" rx="85" ry="95" fill="url(#fade)"/>
       <ellipse cx="${legX[0] + 5}" cy="650" rx="55" ry="70" fill="url(#fade)" opacity="0.5"/>
       <ellipse cx="${legX[1] - 5}" cy="650" rx="55" ry="70" fill="url(#fade)" opacity="0.5"/>`;

  const whiskers = front
    ? [0, 1, 2, 3].map((i) => `<path d="M ${362 - i * 6} ${410 + i * 16} q -45 ${10 + i * 6} -92 ${4 + i * 10}" stroke="${w.whisker}" stroke-width="${5 - i}" fill="none" opacity="0.55" filter="url(#soft)"/>
        <path d="M ${438 + i * 6} ${410 + i * 16} q 45 ${10 + i * 6} 92 ${4 + i * 10}" stroke="${w.whisker}" stroke-width="${5 - i}" fill="none" opacity="0.55" filter="url(#soft)"/>`).join("")
    : [0, 1, 2].map((i) => `<path d="M ${330 - i * 4} ${470 + i * 14} q 40 12 70 ${2 + i * 3}" stroke="${w.whisker}" stroke-width="3" fill="none" opacity="0.45" filter="url(#soft)"/>
        <path d="M ${470 + i * 4} ${470 + i * 14} q -40 12 -70 ${2 + i * 3}" stroke="${w.whisker}" stroke-width="3" fill="none" opacity="0.45" filter="url(#soft)"/>`).join("");

  const folds = [[legX[0] - 10, 610], [legX[1] + 10, 600], [legX[0] - 30, 820], [legX[1] + 30, 830]].map(([x, y], i) =>
    `<path d="M ${x - 55} ${y} q 55 ${i % 2 ? -14 : 12} 110 ${i % 2 ? 6 : -4}" stroke="${w.lo}" stroke-width="5" fill="none" opacity="0.35" filter="url(#soft)"/>
     <path d="M ${x - 50} ${y + 7} q 50 ${i % 2 ? -12 : 10} 100 ${i % 2 ? 5 : -3}" stroke="${w.hi}" stroke-width="3" fill="none" opacity="0.35" filter="url(#soft)"/>`).join("");

  const waistband = `<path d="M 290 150 Q 400 162 510 150 L 512 192 Q 400 205 288 192 Z" fill="${w.base}"/>
    <path d="M 290 150 Q 400 162 510 150 L 512 192 Q 400 205 288 192 Z" fill="url(#twill)"/>
    <path d="M 291 158 Q 400 170 509 158" ${stitch}/><path d="M 289 186 Q 400 199 511 186" ${stitch}/>
    <path d="M 288 192 Q 400 205 512 192" fill="none" stroke="${w.lo}" stroke-width="2" opacity="0.7"/>`;
  const loops = [306, 358, 442, 494].map((x) => `<rect x="${x - 7}" y="146" width="14" height="52" rx="2" fill="${w.base}" stroke="${w.lo}" stroke-opacity="0.5"/>
    <rect x="${x - 7}" y="146" width="14" height="52" rx="2" fill="url(#twill)"/>
    <path d="M ${x - 7} 153 h 14 M ${x - 7} 191 h 14" ${stitch} stroke-dasharray="3 3"/>`).join("");

  let body;
  if (front) {
    body = `${waistband}${loops}
      <circle cx="400" cy="172" r="13" fill="url(#brass)" stroke="#5a431b" stroke-width="1.2"/><circle cx="400" cy="172" r="7" fill="none" stroke="#f3e2b8" stroke-opacity="0.6"/>
      <path d="M 428 200 L 428 318 Q 428 352 402 366" ${stitch}/><path d="M 437 200 L 437 320 Q 437 360 404 376" ${stitch}/>
      <path d="M 400 200 L 400 380" ${seam}/>
      <path d="M 352 196 Q 316 236 280 292" fill="none" stroke="${w.lo}" stroke-width="3" opacity="0.55"/><path d="M 360 197 Q 322 240 284 300" ${stitch}/>
      <path d="M 448 196 Q 484 236 520 292" fill="none" stroke="${w.lo}" stroke-width="3" opacity="0.55"/><path d="M 440 197 Q 478 240 516 300" ${stitch}/>
      <path d="M 352 196 Q 316 236 280 292" fill="none" stroke="${w.hi}" stroke-width="2" opacity="0.35" transform="translate(4 2)" filter="url(#soft)"/>
      <path d="M 452 206 L 490 204 L 494 238 L 458 242 Z" fill="none" stroke="${w.lo}" stroke-width="2" opacity="0.5"/><path d="M 454 212 L 491 210" ${stitch}/>
      <circle cx="355" cy="200" r="3.2" fill="url(#brass)"/><circle cx="445" cy="200" r="3.2" fill="url(#brass)"/><circle cx="282" cy="290" r="3.2" fill="url(#brass)"/><circle cx="518" cy="290" r="3.2" fill="url(#brass)"/>`;
  } else {
    body = `${waistband}${loops}
      <rect x="430" y="158" width="58" height="28" rx="2" fill="#a8774b" stroke="#6f4a2b"/><rect x="434" y="162" width="50" height="20" fill="none" stroke="#e0b98f" stroke-opacity="0.5" stroke-dasharray="2 2"/>
      <path d="M 288 222 Q 400 262 512 222" fill="none" stroke="${w.lo}" stroke-width="2.5" opacity="0.55"/><path d="M 288 230 Q 400 270 512 230" ${stitch}/><path d="M 288 237 Q 400 277 512 237" ${stitch}/>
      <path d="M 400 260 L 400 432" ${seam}/><path d="M 408 262 L 406 430" ${stitch}/>
      ${[[296, 384], [416, 504]].map(([a, b]) => `<path d="M ${a} 268 L ${b} 262 L ${b - 4} 372 L ${(a + b) / 2} 392 L ${a + 4} 376 Z" fill="${w.base}" stroke="${w.lo}" stroke-width="2" stroke-opacity="0.6"/>
        <path d="M ${a} 268 L ${b} 262 L ${b - 4} 372 L ${(a + b) / 2} 392 L ${a + 4} 376 Z" fill="url(#twill)"/>
        <path d="M ${a + 4} 276 L ${b - 4} 270" ${stitch}/>
        <path d="M ${a + 10} 316 Q ${(a + b) / 2} 296 ${b - 10} 314 M ${a + 10} 326 Q ${(a + b) / 2} 306 ${b - 10} 324" ${stitch} stroke-dasharray="4 3"/>`).join("")}`;
  }

  const hems = p.shape === "wide" ? [[168, 384], [416, 632]] : [[228, 390], [410, 572]];
  const hemLines = hems.map(([a, b]) => `<path d="M ${a + 2} 944 L ${b - 1} 950" ${stitch}/><path d="M ${a + 2} 952 L ${b - 1} 958" fill="none" stroke="${w.lo}" stroke-width="1.5" opacity="0.5"/>`).join("");
  const sideSeams = `<path d="${p.shape === "wide" ? "M 272 300 C 258 420, 194 700, 176 958" : "M 278 300 C 266 420, 236 700, 234 958"}" ${stitch} opacity="0.55"/>
    <path d="${p.shape === "wide" ? "M 528 300 C 542 420, 606 700, 624 958" : "M 522 300 C 534 420, 564 700, 566 958"}" ${stitch} opacity="0.55"/>`;

  return `
    <path d="${sil}" transform="translate(10 18)" fill="#5b4d33" opacity="0.32" filter="url(#shadow)"/>
    <clipPath id="clip-${side}"><path d="${sil}"/></clipPath>
    <g clip-path="url(#clip-${side})">
      <rect width="800" height="1024" fill="${w.base}"/>
      ${fading}
      <rect width="800" height="1024" fill="url(#edgeL)" opacity="0.5"/>
      <rect y="760" width="800" height="264" fill="${w.lo}" opacity="0.18"/>
      <path d="M 400 432 L 400 1024" stroke="${w.lo}" stroke-width="18" opacity="0.18" filter="url(#soft)"/>
      <rect width="800" height="1024" fill="url(#twill)"/>
      <rect width="800" height="1024" filter="url(#grain)" opacity="0.9"/>
      <rect width="800" height="1024" filter="url(#noise)" opacity="0.22" style="mix-blend-mode:soft-light"/>
      ${whiskers}${folds}
    </g>
    <path d="${sil}" fill="none" stroke="${w.lo}" stroke-width="2.5" opacity="0.65"/>
    ${sideSeams}${body}${hemLines}`;
}

function svgFor(productId, colorId, view) {
  const w = WASH[colorId];
  const side = view === "front" || view === "detail" ? "front" : "back";
  const vb = { front: "0 0 800 1024", back: "0 0 800 1024", detail: "240 120 320 410", pocket: "270 200 280 358" }[view];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1024" viewBox="${vb}" preserveAspectRatio="xMidYMid slice">
    ${defs(w)}
    <rect x="0" y="0" width="800" height="1024" fill="url(#bg)"/>
    <rect x="0" y="0" width="800" height="1024" filter="url(#paper)"/>
    <rect x="0" y="0" width="800" height="1024" fill="url(#light)"/>
    ${jeans(productId, colorId, side)}
  </svg>`;
}

function heroSvg() {
  const one = (pid, cid, tx, ty, rot, s) => `<g transform="translate(${tx} ${ty}) rotate(${rot} 400 512) scale(${s})">${jeans(pid, cid, "front").replace(/clip-front/g, "clip-" + cid)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="640" viewBox="0 0 1600 640">
    ${defs(WASH["medium-bright-indigo"])}
    <rect width="1600" height="640" fill="url(#bg)"/>
    <rect width="1600" height="640" filter="url(#paper)"/>
    <rect width="1600" height="640" fill="url(#light)"/>
    ${one("wide-leg", "light-vintage", 1060, 14, 9, 0.56)}
    ${one("wide-leg", "dark-indigo", 700, 24, -9, 0.56)}
    ${one("wide-leg", "medium-bright-indigo", 880, 0, 0, 0.6)}
  </svg>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const jobs = [];
  for (const p of Object.values(AE.PRODUCTS)) {
    for (const c of p.colors) for (const v of ["front", "back", "detail", "pocket"]) jobs.push({ name: `${p.id}_${c}_${v}.jpg`, svg: svgFor(p.id, c, v), w: 800, h: 1024 });
  }
  jobs.push({ name: "hero.jpg", svg: heroSvg(), w: 1600, h: 640 });
  for (const j of jobs) {
    await page.setViewportSize({ width: j.w, height: j.h });
    await page.setContent(`<html><body style="margin:0;background:#fff">${j.svg}</body></html>`);
    await page.screenshot({ path: path.join(OUT, j.name), type: "jpeg", quality: 84, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    console.log("rendered " + j.name);
  }
  await browser.close();
})();

/* pricing.js: order math in integer cents [DESIGN; documented model].
 * merch = orig × qty; savings = (orig − sale) × qty; subtotal = sale × qty
 * tax = round_half_up(subtotal × 0.092)  [SIMULATED 9.2% rate]
 * shipping / pickup = free; total = subtotal + tax
 * Check: 1 × $66.45 → tax $6.11 → total $72.56 (matches the observed total).
 */
(function (AE) {
  "use strict";

  var TAX_PER_THOUSAND = 92; // 9.2% expressed as an integer to avoid float error

  /** Round half up for non-negative integer math: floor((n × 92 + 500) / 1000). */
  AE.taxFor = function (subtotalCents) {
    return Math.floor((subtotalCents * TAX_PER_THOUSAND + 500) / 1000);
  };

  /** Price lines for a line item {productId, colorId, qty}. Returns null if unknown. */
  AE.priceLines = function (item) {
    if (!item) return null;
    var price = AE.getPrice(item.productId, item.colorId);
    if (!price) return null;
    var qty = item.qty || 1;
    var merch = price.orig * qty;
    var savings = (price.orig - price.sale) * qty;
    var subtotal = price.sale * qty;
    var tax = AE.taxFor(subtotal);
    return { qty: qty, unitSale: price.sale, unitOrig: price.orig, merch: merch, savings: savings, subtotal: subtotal, shipping: 0, tax: tax, total: subtotal + tax };
  };

  AE.money = function (cents) {
    var neg = cents < 0;
    var abs = Math.abs(cents);
    var dollars = Math.floor(abs / 100);
    var rest = abs % 100;
    return (neg ? "−" : "") + "$" + dollars.toLocaleString("en-US") + "." + (rest < 10 ? "0" : "") + rest;
  };
})(window.AE = window.AE || {});

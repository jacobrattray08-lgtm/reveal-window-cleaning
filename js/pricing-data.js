/* ============================================================
   Reveal Window Cleaning — pricing & postcode zone data
   Kept as plain data so adding an area (e.g. York) later is a
   few lines here, not a rewrite of the calculator logic.
   ============================================================ */

// Postcode outward-code prefix -> zone. Longest prefix wins, so a
// district entry like YO51 is always checked before any shorter
// area entry that might otherwise swallow it.
const ZONE_PREFIXES = [
  { prefix: "YO51", zone: "B" },
  { prefix: "HX",   zone: "A" },
  { prefix: "LS",   zone: "C" },
  { prefix: "HG",   zone: "B" },
];

const ZONE_NAMES = {
  A: "Halifax",
  B: "Harrogate & Boroughbridge",
  C: "Leeds",
};

// Per-visit prices in pounds. "from" flags the 5+ bedroom row, which
// must always display as "from £X", never a fixed figure.
const PRICING = {
  A: {
    2: { w4: 15, w8: 18, w12: 20, oneoff: 25, from: false },
    3: { w4: 20, w8: 24, w12: 27, oneoff: 33, from: false },
    4: { w4: 28, w8: 34, w12: 38, oneoff: 47, from: false },
    5: { w4: 36, w8: 43, w12: 49, oneoff: 60, from: true },
  },
  B: {
    2: { w4: 18, w8: 22, w12: 24, oneoff: 30, from: false },
    3: { w4: 24, w8: 29, w12: 32, oneoff: 40, from: false },
    4: { w4: 32, w8: 38, w12: 43, oneoff: 53, from: false },
    5: { w4: 42, w8: 50, w12: 57, oneoff: 69, from: true },
  },
  C: {
    2: { w4: 16, w8: 19, w12: 21, oneoff: 26, from: false },
    3: { w4: 21, w8: 25, w12: 28, oneoff: 35, from: false },
    4: { w4: 29, w8: 35, w12: 40, oneoff: 48, from: false },
    5: { w4: 38, w8: 45, w12: 51, oneoff: 63, from: true },
  },
};

// Conservatory side-window add-on, as a percentage of the house price.
// Must always be shown to the customer as a money figure, never a percent.
const CONSERVATORY_UPLIFT = {
  small: { label: "Small — lean-to, roughly 2–3 panels wide", pct: 0.10 },
  medium: { label: "Medium — typical Victorian or Edwardian", pct: 0.175 },
  large: { label: "Large — wraparound or orangery", pct: 0.25 },
};

// Internal reference only — VELUX/roof-window add-on, quoted the same way
// as flat rooflights and roof lanterns: in person, on the day, never through
// the online calculator. This isn't a customer-facing figure and must not
// be shown, labelled, or referenced anywhere in the site's visible copy —
// it's here purely so staff price it consistently: house price × pct,
// rounded, added to whatever's agreed on the day.
const VELUX_UPLIFT_PCT = 0.10;

const FREQUENCIES = [
  { key: "w4", label: "Every 4 weeks", tag: " — most popular", note: "Our most requested cycle" },
  { key: "w8", label: "Every 8 weeks", tag: "", note: "" },
  { key: "w12", label: "Every 12 weeks", tag: "", note: "" },
  { key: "oneoff", label: "One-off clean", tag: "", note: "A single visit, no ongoing plan" },
];

const CONFIRM_CAVEAT =
  "Confirmed on your first visit. If your windows haven't been cleaned in a while the first clean may cost a little more — we'll always agree it with you before we start.";

/**
 * Normalise and parse a UK postcode into its outward code, then match
 * it to a zone. Returns { valid, outward, zone } — zone is null when
 * the postcode is valid but out of area.
 */
function parsePostcode(raw) {
  const cleaned = (raw || "").toUpperCase().replace(/\s+/g, "");
  const shapeOk = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(cleaned);
  if (!cleaned || !shapeOk) {
    return { valid: false, outward: null, zone: null };
  }
  // The inward code is always the final 3 characters (digit + 2 letters).
  const outward = cleaned.slice(0, cleaned.length - 3);

  const sorted = [...ZONE_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length);
  const match = sorted.find((z) => outward.startsWith(z.prefix));
  return { valid: true, outward, zone: match ? match.zone : null };
}

function money(n) {
  return "£" + n.toFixed(n % 1 === 0 ? 0 : 2);
}

function conservatoryAmount(housePrice, sizeKey) {
  const pct = CONSERVATORY_UPLIFT[sizeKey].pct;
  return Math.round(housePrice * pct);
}

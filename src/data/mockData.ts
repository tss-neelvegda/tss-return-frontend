import { format, subDays } from "date-fns";

// Deterministic PRNG so charts render consistently
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const r = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

// ---------------- Daily summary ----------------
export interface DailyRow {
  date: string;
  total: number;
  full: number;
  partial: number;
  feedback: number;
  fdbkPct: number;
  noFdbk: number;
  mixed: number;
  notConn: number;
  exch: number;
  cancel: number;
}

const today = new Date("2026-06-07T00:00:00Z");
export const dailyRows: DailyRow[] = Array.from({ length: 30 }).map((_, i) => {
  const total = r(1200, 1450);
  const full = Math.floor(total * (0.3 + rand() * 0.1));
  const partial = Math.floor(total * (0.03 + rand() * 0.03));
  const feedback = full + partial;
  const fdbkPct = +((feedback / total) * 100).toFixed(1);
  const noFdbk = rand() > 0.85 ? r(1, 3) : 0;
  const mixed = r(20, 60);
  const notConn = total - feedback - mixed - noFdbk;
  return {
    date: format(subDays(today, i), "dd-MMM-yy"),
    total,
    full,
    partial,
    feedback,
    fdbkPct,
    noFdbk,
    mixed,
    notConn,
    exch: r(2, 12),
    cancel: r(1, 8),
  };
});

// ---------------- Call funnel & outcomes ----------------
export const callFunnel = {
  callsInitiated: 188096,
  notConnected: 104022,
  notConnectedPct: 55.3,
  mixed: 9469,
  mixedPct: 5.0,
  connected: 73618,
  connectedPct: 39.1,
  notConnectedOrMixed: 114478,
  notConnectedOrMixedPct: 60.9,
  mixedBreakdown: {
    systemFailed: 0,
    callback: 6316,
    outOfScope: 1296,
    analyzerIssue: 1857,
  },
};

export const connectedBreakdown = {
  connected: 73618,
  full: 63447,
  fullPct: 86.2,
  partial: 9889,
  partialPct: 13.4,
  refused: 282,
  refusedPct: 0.4,
};

export const outcomes = {
  returns: 90790,
  returnsPct: 97.3,
  exchange: 1929,
  exchangePct: 1.7,
  cancel: 576,
  cancelPct: 0.5,
  total: 93295,
};

// ---------------- Overview KPIs ----------------
export const overviewKPIs = [
  { label: "Total Calls", value: 188096, sub: "Total calls in period", color: "var(--accent-red)" },
  { label: "Initiated", value: 188096, sub: "100.0% of total", color: "var(--accent-red)" },
  { label: "Connected", value: 188096, sub: "100.0% of initiated · 188,096 calls", color: "var(--accent-pink)" },
  { label: "Return Records", value: 242386, sub: "product rows from 188,096 calls", color: "var(--accent-purple)" },
  { label: "Full", value: 63447, sub: "33.7% of calls", color: "var(--accent-teal)" },
  { label: "Partial", value: 9889, sub: "5.3% of calls · Feedback: 73,336 calls (39.0%)", color: "var(--accent-red)" },
  { label: "No Feedback", value: 282, sub: "0.1% of calls", color: "var(--accent-amber)" },
  { label: "Not Connected", value: 104022, sub: "55.3% of calls", color: "var(--accent-gray)" },
];

// ---------------- Charts data ----------------
export const outcomesDonut = [
  { name: "Full", value: 33.9, color: "var(--accent-teal)" },
  { name: "Partial", value: 5.3, color: "#ef9a9a" },
  { name: "No Feedback", value: 0.1, color: "var(--accent-amber)" },
  { name: "Mixed", value: 5.1, color: "var(--accent-purple)" },
  { name: "Not Connected", value: 55.6, color: "var(--accent-gray)" },
];

export const topCategories = [
  { name: "Size & Fit Issues", count: 95895 },
  { name: "Changed My Mind", count: 42624 },
  { name: "Quality issues", count: 24684 },
  { name: "SIZE_FIT", count: 5530 },
  { name: "DESIGN_STYLE", count: 1039 },
  { name: "CUSTOMER_PREFERENCE", count: 933 },
  { name: "MATERIAL_FABRIC", count: 912 },
  { name: "Wrong Product Delivered", count: 537 },
  { name: "Damaged or Defective Product", count: 458 },
  { name: "COLOR_APPEARANCE", count: 438 },
];

export const topProducts = [
  { name: "No product name passed from TSS", count: 13500 },
  { name: "No Products Available - Failed Calls", count: 1200 },
  { name: "Cotton Linen: Soft Pink", count: 495 },
  { name: "Solids: Rusty Red - Variant (M)", count: 399 },
  { name: "Cotton Linen: Lobster Bisque", count: 396 },
  { name: "Solids: Pearl White - Variant (M)", count: 388 },
  { name: "Cotton Linen: Russet Brown", count: 363 },
  { name: "Cotton Linen: Sky Blue", count: 362 },
  { name: "Cotton Linen: Red", count: 350 },
  { name: "Solids: Off White", count: 339 },
];

// returns over time ~170 days
export const returnsOverTime = (() => {
  const start = new Date("2025-12-18T00:00:00Z");
  const days = 170;
  const out: { date: string; value: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const month = d.getUTCMonth();
    let base = 1000;
    if (month === 11 || month === 0) base = r(800, 1200);
    else if (month === 1 || month === 2) base = r(1500, 2200);
    else if (month === 3) base = r(1600, 2200);
    else base = r(1200, 1600);
    // April spike
    if (month === 3 && d.getUTCDate() === 25) base = 2436;
    // occasional dip
    if (rand() < 0.05) base = r(200, 500);
    out.push({ date: format(d, "yyyy-MM-dd"), value: base });
  }
  return out;
})();

export const callFunnelWaterfall = [
  { name: "Calls", value: 188096, color: "#555555" },
  { name: "Full", value: 63447, color: "var(--accent-teal)" },
  { name: "Partial", value: 9889, color: "#ef9a9a" },
  { name: "No Feedback", value: 282, color: "var(--accent-amber)" },
  { name: "Mixed", value: 9469, color: "var(--accent-purple)" },
  { name: "Not Connected", value: 104022, color: "var(--accent-gray)" },
];

export const dailyTriggeredVsConnected = returnsOverTime.map((d) => ({
  date: d.date,
  total: d.value + r(0, 400),
  full: Math.floor(d.value * 0.35),
  partial: Math.floor(d.value * 0.08),
}));

// ---------------- Insights ----------------
export const insights = [
  {
    category: "APPAREL",
    total: 200381,
    icon: "shirt",
    cards: [
      { label: "TOP RETURN REASON", value: "Size & Fit Issues", sub: "81,595 returns", footer: "40.7% of apparel" },
      { label: "TOP RETURN SIZE", value: "Size M", sub: "44,408 returns", footer: "22.2% of apparel" },
      { label: "TOP RETURN PRODUCT", value: "No product name passed from TSS", sub: "1,497 returns", footer: "0.7% of apparel" },
      { label: "PEAK RETURN DAY", value: "25-Apr-26 (Sat)", sub: "2,436 returns", footer: "85% above daily avg of 1,318" },
    ],
  },
  {
    category: "BOTTOMWEAR",
    total: 20688,
    icon: "package",
    cards: [
      { label: "TOP RETURN REASON", value: "Size & Fit Issues", sub: "9,847 returns", footer: "47.6% of bottomwear" },
      { label: "TOP RETURN SIZE", value: "Size 32", sub: "5,284 returns", footer: "25.5% of bottomwear" },
      { label: "TOP RETURN PRODUCT", value: "Cotton Linen Pants: Ecru", sub: "282 returns", footer: "1.4% of bottomwear" },
      { label: "PEAK RETURN DAY", value: "25-Apr-26 (Sat)", sub: "262 returns", footer: "82% above avg of 144" },
    ],
  },
  {
    category: "FOOTWEAR",
    total: 11085,
    icon: "footprints",
    cards: [
      { label: "TOP RETURN REASON", value: "Size & Fit Issues", sub: "4,162 returns", footer: "37.5% of footwear" },
      { label: "TOP RETURN SIZE", value: "UK 9", sub: "2,786 returns", footer: "25.1% of footwear" },
      { label: "TOP RETURN PRODUCT", value: "Hydros: The Dark Knight", sub: "208 returns", footer: "1.9% of footwear" },
      { label: "PEAK RETURN DAY", value: "18-Apr-26 (Sat)", sub: "156 returns", footer: "103% above avg of 77" },
    ],
  },
];

// ---------------- Size Groups ----------------
export const sizeGroups = {
  APPAREL: {
    total: 200381,
    sizes: [
      ["XXS", 3647], ["XS", 13627], ["S", 28838], ["M", 44408],
      ["L", 39010], ["XL", 24889], ["XXL", 16191], ["XXXL", 7881],
      ["(no size)", 20261], ["0", 631], ["7-8Y", 299], ["2-3Y", 172],
      ["5-6Y", 153], ["3-4Y", 153], ["8-9Y", 50], ["9-10Y", 41], ["6-7Y", 31],
      ["11-12Y", 20], ["4-5Y", 18], ["11", 18], ["12", 7], ["9-12M", 6],
      ["18-24M", 5], ["6-9M", 4], ["10-11Y", 3], ["3-6M", 3], ["13-14Y", 3],
      ["13", 3], ["10", 3], ["12-14Y", 2], ["12-18M", 2], ["0-3M", 1],
      ["Size Not Available", 1],
    ] as [string, number][],
  },
  BOTTOMWEAR: {
    total: 20688,
    sizes: [
      ["24", 11], ["26", 522], ["28", 1915], ["30", 3636], ["32", 5284],
      ["34", 4438], ["36", 2956], ["38", 1446], ["40", 480],
    ] as [string, number][],
  },
  FOOTWEAR: {
    total: 11085,
    sizes: [
      ["UK 3", 84], ["UK 4", 240], ["UK 5", 339], ["UK 6", 1185],
      ["UK 7", 1558], ["UK 8", 2368], ["UK 9", 2786], ["UK 10", 1504],
      ["UK 11", 880], ["UK 12", 141],
    ] as [string, number][],
  },
  ACCESSORIES: {
    total: 1019,
    sizes: [["FREESIZE", 1019]] as [string, number][],
  },
};

// ---------------- Heatmap rows ----------------
export const heatmapRows = [
  { product: "No product name passed from TSS" },
  { product: "Cotton Linen: Soft Pink", S: 22, M: 60, L: 133, XL: 152, XXL: 85, XXXL: 23, "0": 20 },
  { product: "No Products Available - Failed Calls" },
  { product: "Solids: Rusty Red - Variant (M)", M: 345 },
  { product: "Cotton Linen: Lobster Bisque", S: 54, M: 55, L: 82, XL: 120, XXL: 51, XXXL: 23, "0": 11 },
  { product: "Solids: Pearl White - Variant (M)", M: 359 },
  { product: "Cotton Linen: Russet Brown", S: 17, M: 52, L: 102, XL: 91, XXL: 61, XXXL: 20, "0": 20 },
  { product: "Cotton Linen: Sky Blue", S: 5, M: 43, L: 115, XL: 106, XXL: 56, XXXL: 17, "0": 20 },
  { product: "Cotton Linen: Red", S: 10, M: 50, L: 96, XL: 99, XXL: 57, XXXL: 16, "0": 17 },
  { product: "Solids: Off White", S: 13, M: 37, L: 103, XL: 78, XXL: 52, XXXL: 31, "0": 24 },
  { product: "Cotton Linen: Pearl White", S: 7, M: 65, L: 105, XL: 78, XXL: 42, XXXL: 13, "0": 15 },
  { product: "Superman: Vintage", S: 2, M: 12, L: 16, XL: 32, XXL: 26, XXXL: 19, "0": 6 },
  { product: "Harry Potter: The Silent Vow", S: 8, M: 11, L: 22, XL: 33, XXL: 15, XXXL: 13, "0": 9 },
  { product: "Solids: Olive Green", S: 2, M: 16, L: 29, XL: 38, XXL: 13, XXXL: 8, "0": 6 },
  { product: "Plaid: Black And Red", S: 8, M: 15, L: 24, XL: 23, XXL: 20, XXXL: 12, "0": 10 },
  { product: "TSS Originals: Blue Soul", S: 3, M: 14, L: 28, XL: 25, XXL: 21, XXXL: 12, "0": 9 },
  { product: "Solids: Rusty Red", S: 3, M: 5, L: 10, XL: 37, XXL: 30, XXXL: 6, "0": 8 },
  { product: "Solids: Lobster Bisque", M: 16, L: 35, XL: 37, XXL: 12, XXXL: 7, "0": 4 },
  { product: "Cotton Linen Stripes: Jade Haze", S: 4, M: 7, L: 25, XL: 29, XXL: 19, XXXL: 12, "0": 11 },
  { product: "Zipper Mock Neck: Off White", S: 2, M: 20, L: 25, XL: 35, XXL: 13, XXXL: 11, "0": 1 },
] as Record<string, number | string>[];

export const heatmapSizeCols = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "0"];

// ---------------- Donuts for Product x Size ----------------
export const apparelReasons = [
  { name: "Size & Fit Issues", value: 56, color: "var(--accent-red)" },
  { name: "Changed My Mind", value: 25, color: "var(--accent-teal)" },
  { name: "Quality issues", value: 15, color: "var(--accent-blue)" },
  { name: "SIZE_FIT", value: 3, color: "var(--accent-amber)" },
  { name: "DESIGN_STYLE", value: 1, color: "var(--accent-pink)" },
  { name: "MATERIAL_FABRIC", value: 1, color: "var(--accent-purple)" },
];

export const apparelCategories = [
  { name: "Men Shirts", value: 31, color: "var(--accent-purple)" },
  { name: "Oversized T-Shirts", value: 21, color: "var(--accent-red)" },
  { name: "Women T-Shirts", value: 17, color: "var(--accent-blue)" },
  { name: "Women Oversized T-Shirts", value: 11, color: "var(--accent-teal)" },
  { name: "Women Shirts", value: 7, color: "var(--accent-pink)" },
  { name: "Men Oversized Polo", value: 7, color: "var(--accent-amber)" },
  { name: "Men Polos", value: 5, color: "var(--accent-blue)" },
];

// ---------------- Root cause ----------------
export const rootCause = {
  productCategory: [
    { name: "Men Shirts", count: 35774 },
    { name: "(No Category)", count: 32404 },
    { name: "Oversized T-Shirts", count: 24571 },
    { name: "Women T-Shirts", count: 20002 },
    { name: "Women Oversized T-Shirts", count: 12871 },
    { name: "Women Shirts", count: 8721 },
    { name: "Men Footwear", count: 8644 },
    { name: "Men Pants", count: 8196 },
    { name: "Men Oversized Polo", count: 7943 },
    { name: "Men Polos", count: 6351 },
    { name: "Men Jeans", count: 6177 },
  ],
  returnReason: [
    { name: "Size & Fit Issues", count: 95895 },
    { name: "Changed My Mind", count: 42624 },
    { name: "Quality issues", count: 24684 },
    { name: "SIZE_FIT", count: 5530 },
    { name: "DESIGN_STYLE", count: 1039 },
    { name: "CUSTOMER_PREFERENCE", count: 933 },
    { name: "MATERIAL_FABRIC", count: 912 },
    { name: "Wrong Product Delivered", count: 537 },
    { name: "Damaged or Defective Product", count: 458 },
    { name: "COLOR_APPEARANCE", count: 438 },
    { name: "QUALITY_DEFECTS", count: 401 },
  ],
  issueArea: [
    { name: "Too Large / Loose", count: 22066 },
    { name: "Too Small / Tight", count: 19483 },
    { name: "Not Connected", count: 16501 },
    { name: "Fit Issues", count: 9250 },
    { name: "Personal Choice", count: 9040 },
    { name: "Aesthetic Preference", count: 6925 },
    { name: "No Answer Disconnected Call", count: 6041 },
    { name: "Fabric Quality", count: 5523 },
    { name: "Voicemail Detected Call", count: 3220 },
    { name: "Material Quality", count: 3127 },
    { name: "Colour Issues", count: 2312 },
  ],
  specificIssue: [
    { name: "Not Connected", count: 16501 },
    { name: "Overall Too Baggy", count: 8454 },
    { name: "Design Not Appealing", count: 7338 },
    { name: "Uncomfortable Fit Overall", count: 6432 },
    { name: "No Answer Disconnected Call", count: 6041 },
    { name: "Chest Tight", count: 4845 },
    { name: "Doesnt Suit Personal Style", count: 3927 },
    { name: "Changed Mind No Specific Reason", count: 3847 },
    { name: "Voicemail Detected Call", count: 3220 },
    { name: "Fabric Feels Cheap", count: 3115 },
    { name: "Overall Too Tight", count: 3090 },
  ],
};

// ---------------- All records ----------------
const productNames = [
  "Harry Potter: Wizard's Map - Variant ( M )",
  "Souled: Cream Soda - Variant ( UK 6 )",
  "Solids: Soft Pink - Variant ( XL )",
  "Solids: Rusty Red - Variant ( L )",
  "Oversized T-shirt: Orange Juice - Variant ( XL )",
  "Solids: Lobster Bisque - Variant ( XXXL )",
  "Denim: Charcoal (Slim Fit) - Variant ( 34 )",
  "Textured Shirt: Canyon - Variant ( M )",
  "Straight-Fit Denim: Celestial - Variant ( 30 )",
  "Statement Shirt: Angel Eyes - Variant ( XXS )",
  "Bootcut Denim: Urban Ash - Variant ( 32 )",
  "Baggy-Fit Denim: Dark Stone - Variant ( 32 )",
  "Korean Pants: Rich Black - Variant ( XL, Black )",
  "Stranger Things: Hawkins High - Variant ( XL )",
  "Harry Potter: Hogwarts - Variant ( M )",
  "Cotton Linen Pants: Ecru - Variant ( 34 )",
  "Supima: Onyx - Variant ( L )",
  "Solids: Pearl White - Variant ( M )",
  "Cotton Linen: Sky Blue - Variant ( L )",
  "TSS Originals: Trident - Variant ( S )",
];
const reasons = ["Size & Fit Issues", "Changed My Mind", "Quality issues", "Wrong Product Delivered"];
const subs = ["Too Large / Loose", "Too Small / Tight", "Personal Choice", "Fabric Quality", "Aesthetic Preference", "Color Preference", "Fit Issues"];
const details = ["Overall Too Baggy", "Chest Tight", "Waist Tight", "Design Not Appealing", "Fabric Feels Cheap", "Uncomfortable Fit Overall", "Toe Area Tight", "Color Doesnt Suit Personality", "Changed Mind No Specific Reason", "Length Too Short", "Waist Loose", "Too Thick Heavy"];

export interface RecordRow {
  product: string;
  reason: string;
  sub: string;
  detail: string;
  dec: number | null;
  jan: number | null;
  feb: number | null;
  mar: number | null;
  apr: number | null;
  total: number;
}

export const allRecords: RecordRow[] = Array.from({ length: 60 }).map(() => {
  const reason = rand() < 0.5 ? reasons[0] : reasons[r(0, reasons.length - 1)];
  const months = ["dec", "jan", "feb", "mar", "apr"] as const;
  const vals: Record<string, number | null> = {};
  let total = 0;
  for (const m of months) {
    if (rand() < 0.35) {
      const v = r(1, 4);
      vals[m] = v;
      total += v;
    } else {
      vals[m] = null;
    }
  }
  if (total < 2) {
    vals.mar = 2;
    vals.apr = 2;
    total = 4;
  }
  return {
    product: productNames[r(0, productNames.length - 1)],
    reason,
    sub: subs[r(0, subs.length - 1)],
    detail: details[r(0, details.length - 1)],
    dec: vals.dec as number | null,
    jan: vals.jan as number | null,
    feb: vals.feb as number | null,
    mar: vals.mar as number | null,
    apr: vals.apr as number | null,
    total,
  };
});
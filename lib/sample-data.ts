import { addDays, todayIso } from "./dates";
import type { Ledger, PaymentMethod, Product, Sale, StockAdjustment } from "./types";

interface CatalogItem {
  sku: string;
  name: string;
  category: string;
  costMinor: number;
  priceMinor: number;
  opening: number;
  lowStockAt: number;
  reserve: number;
}

const CATALOG: CatalogItem[] = [
  { sku: "DM-400", name: "Dawn Evaporated Milk 400g", category: "Dairy", costMinor: 45000, priceMinor: 65000, opening: 80, lowStockAt: 10, reserve: 18 },
  { sku: "RS-500", name: "River Spaghetti 500g", category: "Grains", costMinor: 28000, priceMinor: 45000, opening: 90, lowStockAt: 12, reserve: 20 },
  { sku: "PG-2L", name: "PalmGold Vegetable Oil 2L", category: "Cooking oil", costMinor: 320000, priceMinor: 410000, opening: 24, lowStockAt: 4, reserve: 6 },
  { sku: "QN-70", name: "QuickNoodles Chicken 70g", category: "Noodles", costMinor: 12000, priceMinor: 20000, opening: 180, lowStockAt: 24, reserve: 30 },
  { sku: "CW-1K", name: "CaneWhite Sugar 1kg", category: "Staples", costMinor: 90000, priceMinor: 125000, opening: 36, lowStockAt: 6, reserve: 8 },
  { sku: "CM-400", name: "CocoaMalt Drink 400g", category: "Beverages", costMinor: 180000, priceMinor: 240000, opening: 14, lowStockAt: 4, reserve: 3 },
  { sku: "BB-6", name: "BlueBar Soap (pack of 6)", category: "Household", costMinor: 60000, priceMinor: 90000, opening: 16, lowStockAt: 4, reserve: 5 },
  { sku: "PD-20", name: "PureDrop Sachet Water (bag of 20)", category: "Beverages", costMinor: 25000, priceMinor: 40000, opening: 70, lowStockAt: 10, reserve: 12 },
  { sku: "RH-400", name: "RedHarvest Tomato Mix 400g", category: "Provisions", costMinor: 55000, priceMinor: 80000, opening: 40, lowStockAt: 6, reserve: 8 },
  { sku: "HG-900", name: "HomeGlow Detergent 900g", category: "Household", costMinor: 70000, priceMinor: 110000, opening: 18, lowStockAt: 5, reserve: 4 },
];

interface DraftSale {
  daysAgo: number;
  sku: string;
  qty: number;
  method: PaymentMethod;
  priceMinor?: number;
  reference?: string;
}

interface DraftAdjustment {
  daysAgo: number;
  sku: string;
  delta: number;
  reason: string;
}

const SPECIALS: DraftSale[] = [
  { daysAgo: 3, sku: "PG-2L", qty: 1, method: "pos", priceMinor: 280000, reference: "POS-1044" },
  { daysAgo: 12, sku: "DM-400", qty: 2, method: "transfer", reference: "TRF-2218" },
  { daysAgo: 9, sku: "CW-1K", qty: 1, method: "transfer", reference: "TRF-2218" },
  { daysAgo: 2, sku: "QN-70", qty: 15, method: "cash", reference: "MKT-BULK-09" },
];

const ADJUSTMENTS: DraftAdjustment[] = [
  { daysAgo: 6, sku: "BB-6", delta: -2, reason: "Damaged packs removed after a leak" },
];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function routineSales(): DraftSale[] {
  const rng = mulberry32(20261023);
  const methods: PaymentMethod[] = ["cash", "transfer", "pos", "cash", "transfer", "credit"];
  const drafts: DraftSale[] = [];
  for (let daysAgo = 42; daysAgo >= 0; daysAgo -= 1) {
    if (rng() < 0.18) continue;
    const count = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i += 1) {
      const item = CATALOG[Math.floor(rng() * CATALOG.length)];
      const bulky = item.sku === "PG-2L" || item.sku === "CM-400" || item.sku === "HG-900";
      const qty = bulky ? 1 : 1 + Math.floor(rng() * 3);
      drafts.push({
        daysAgo,
        sku: item.sku,
        qty,
        method: methods[Math.floor(rng() * methods.length)],
      });
    }
  }
  return drafts;
}

export function buildDemoLedger(now = new Date()): Ledger {
  const today = todayIso(now);
  const products: Product[] = CATALOG.map((item) => {
    const createdAt = `${addDays(today, -50)}T08:00:00.000Z`;
    return {
      id: `demo-prod-${item.sku}`,
      name: item.name,
      sku: item.sku,
      category: item.category,
      costMinor: item.costMinor,
      priceMinor: item.priceMinor,
      stockQty: item.opening,
      lowStockAt: item.lowStockAt,
      createdAt,
      updatedAt: createdAt,
    };
  });
  const bySku = new Map(products.map((product) => [product.sku, product]));
  const sales: Sale[] = [];
  const adjustments: StockAdjustment[] = [];

  const openingStamp = `${addDays(today, -50)}T08:00:00.000Z`;
  for (const product of products) {
    adjustments.push({
      id: `demo-open-${product.sku}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      delta: product.stockQty,
      reason: "Opening stock",
      date: addDays(today, -50),
      createdAt: openingStamp,
    });
  }

  const applySale = (draft: DraftSale, index: number, respectReserve: boolean) => {
    const product = bySku.get(draft.sku);
    if (!product) return;
    const catalog = CATALOG.find((item) => item.sku === draft.sku);
    const floor = respectReserve ? (catalog?.reserve ?? 0) : 0;
    if (product.stockQty - draft.qty < floor) return;
    product.stockQty -= draft.qty;
    const date = addDays(today, -draft.daysAgo);
    sales.push({
      id: `demo-sale-${String(index).padStart(3, "0")}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: draft.qty,
      unitPriceMinor: draft.priceMinor ?? product.priceMinor,
      unitCostMinor: product.costMinor,
      paymentMethod: draft.method,
      date,
      reference: draft.reference ?? "",
      createdAt: `${date}T10:15:00.000Z`,
      voided: false,
    });
  };

  SPECIALS.forEach((draft, index) => applySale(draft, index + 1, false));
  routineSales().forEach((draft, index) => applySale(draft, index + 100, true));

  ADJUSTMENTS.forEach((draft, index) => {
    const product = bySku.get(draft.sku);
    if (!product) return;
    if (product.stockQty + draft.delta < 0) return;
    product.stockQty += draft.delta;
    const date = addDays(today, -draft.daysAgo);
    adjustments.push({
      id: `demo-adj-${index + 1}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      delta: draft.delta,
      reason: draft.reason,
      date,
      createdAt: `${date}T16:00:00.000Z`,
    });
  });

  sales.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));

  return {
    version: 1,
    mode: "demo",
    profile: {
      name: "Kemi's Corner Shop",
      owner: "Kemi Adeyemi",
      sector: "Retail — provisions and household goods",
      location: "Minna, Niger State",
      currency: "NGN",
    },
    products,
    sales,
    adjustments,
    insight: null,
  };
}

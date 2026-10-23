import { addDays, formatShortDate, isoDate, monthKey, monthLabel, todayIso, weekStart } from "./dates";
import type { Ledger, PaymentMethod, Product, Sale } from "./types";
import { PAYMENT_METHODS } from "./types";

export interface Point {
  key: string;
  label: string;
  revenueMinor: number;
  profitMinor: number;
  count: number;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  amountMinor: number;
  count: number;
}

export interface ProductPerformance {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  revenueMinor: number;
  profitMinor: number;
}

export interface CompletenessItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface Summary {
  revenueMinor: number;
  cogsMinor: number;
  grossProfitMinor: number;
  marginBps: number;
  transactionCount: number;
  inventoryValueMinor: number;
  averageSaleMinor: number;
  periodStart: string | null;
  periodEnd: string | null;
  trailingDays: Point[];
  monthly: Point[];
  weekly: Point[];
  payments: PaymentBreakdown[];
  topProducts: ProductPerformance[];
  recent: Sale[];
  lowStock: Product[];
  completeness: CompletenessItem[];
  referencedSales: number;
}

export function activeSales(ledger: Ledger): Sale[] {
  return ledger.sales.filter((sale) => !sale.voided);
}

export function lineRevenue(sale: Sale): number {
  return sale.quantity * sale.unitPriceMinor;
}

export function lineCogs(sale: Sale): number {
  return sale.quantity * sale.unitCostMinor;
}

export function lineProfit(sale: Sale): number {
  return lineRevenue(sale) - lineCogs(sale);
}

function sumPoints(sales: Sale[], keyOf: (date: string) => string, labelOf: (key: string) => string): Map<string, Point> {
  const map = new Map<string, Point>();
  for (const sale of sales) {
    const key = keyOf(sale.date);
    const current = map.get(key) ?? {
      key,
      label: labelOf(key),
      revenueMinor: 0,
      profitMinor: 0,
      count: 0,
    };
    current.revenueMinor += lineRevenue(sale);
    current.profitMinor += lineProfit(sale);
    current.count += 1;
    map.set(key, current);
  }
  return map;
}

function fillRange(start: string, end: string, step: (iso: string) => string, keyOf: (iso: string) => string, labelOf: (key: string) => string, existing: Map<string, Point>): Point[] {
  const points: Point[] = [];
  const seen = new Set<string>();
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const key = keyOf(cursor);
    if (!seen.has(key)) {
      seen.add(key);
      points.push(
        existing.get(key) ?? {
          key,
          label: labelOf(key),
          revenueMinor: 0,
          profitMinor: 0,
          count: 0,
        },
      );
    }
    cursor = step(cursor);
    guard += 1;
  }
  return points;
}

export function fingerprint(ledger: Ledger, summary: Summary): string {
  return [
    ledger.mode,
    ledger.profile.name,
    ledger.profile.currency,
    summary.revenueMinor,
    summary.cogsMinor,
    summary.transactionCount,
    summary.inventoryValueMinor,
    ledger.products.length,
    ledger.adjustments.length,
    ledger.sales.filter((sale) => sale.voided).length,
  ].join(":");
}

function completeness(ledger: Ledger, sales: Sale[], periodStart: string | null, periodEnd: string | null): CompletenessItem[] {
  const referenced = sales.filter((sale) => sale.reference.trim().length > 0).length;
  const methods = new Set(sales.map((sale) => sale.paymentMethod));
  const spanOk = Boolean(periodStart && periodEnd && addDays(periodStart, 13) <= periodEnd);
  const productsOk = ledger.products.length > 0 && ledger.products.every((product) => product.name.trim() && product.sku.trim() && product.costMinor >= 0 && product.priceMinor >= 0 && product.stockQty >= 0);
  const referenceOk = sales.length < 5 || referenced / sales.length >= 0.5;

  return [
    {
      id: "name",
      label: "Business name",
      ok: ledger.profile.name.trim().length > 1,
      detail: ledger.profile.name.trim() ? "Business name is recorded." : "Add the business name before sharing a report.",
    },
    {
      id: "owner",
      label: "Owner",
      ok: ledger.profile.owner.trim().length > 1,
      detail: ledger.profile.owner.trim() ? "Owner name is recorded." : "Add the owner's name.",
    },
    {
      id: "sector",
      label: "Sector",
      ok: ledger.profile.sector.trim().length > 1,
      detail: ledger.profile.sector.trim() ? "Sector is recorded." : "Add the business sector.",
    },
    {
      id: "location",
      label: "Location",
      ok: ledger.profile.location.trim().length > 1,
      detail: ledger.profile.location.trim() ? "Location is recorded." : "Add the business location.",
    },
    {
      id: "products",
      label: "Product catalog",
      ok: productsOk,
      detail: productsOk ? `${ledger.products.length} product${ledger.products.length === 1 ? "" : "s"} with cost, price, and stock.` : "Add products with a purchase cost, selling price, and stock count.",
    },
    {
      id: "sales",
      label: "Sales history",
      ok: sales.length > 0,
      detail: sales.length > 0 ? `${sales.length} recorded sale${sales.length === 1 ? "" : "s"}.` : "No sales have been recorded.",
    },
    {
      id: "span",
      label: "Period length",
      ok: spanOk,
      detail: spanOk ? "Sales cover at least 14 days." : "Fewer than 14 days of sales are recorded, so trend lines are limited.",
    },
    {
      id: "payments",
      label: "Payment methods",
      ok: methods.size >= 2,
      detail: methods.size >= 2 ? `${methods.size} payment methods are in use.` : "Only one payment method is recorded. A mix is more useful to a reviewer.",
    },
    {
      id: "references",
      label: "Sale references",
      ok: referenceOk,
      detail: referenceOk
        ? `${referenced} of ${sales.length} sales include a reference.`
        : `${referenced} of ${sales.length} sales include a reference. Aim for at least half, using the transfer or POS reference.`,
    },
  ];
}

export function summarize(ledger: Ledger, now = new Date()): Summary {
  const sales = activeSales(ledger);
  let revenueMinor = 0;
  let cogsMinor = 0;
  for (const sale of sales) {
    revenueMinor += lineRevenue(sale);
    cogsMinor += lineCogs(sale);
  }
  const grossProfitMinor = revenueMinor - cogsMinor;
  const marginBps = revenueMinor > 0 ? Math.round((grossProfitMinor * 10000) / revenueMinor) : 0;
  const inventoryValueMinor = ledger.products.reduce((sum, product) => sum + product.stockQty * product.costMinor, 0);
  const dates = sales.map((sale) => sale.date).sort();
  const periodStart = dates[0] ?? null;
  const periodEnd = dates[dates.length - 1] ?? null;

  const today = todayIso(now);
  const dayMap = sumPoints(sales, (date) => date, formatShortDate);
  const trailingDays = fillRange(addDays(today, -13), today, (iso) => addDays(iso, 1), (iso) => iso, formatShortDate, dayMap);

  const monthMap = sumPoints(sales, monthKey, monthLabel);
  const monthly = periodStart && periodEnd ? fillRange(periodStart, periodEnd, (iso) => addDays(iso, 1), monthKey, monthLabel, monthMap) : [];

  const weekMap = sumPoints(sales, weekStart, (key) => `Week of ${formatShortDate(key)}`);
  const weekly = periodStart && periodEnd ? fillRange(periodStart, periodEnd, (iso) => addDays(iso, 1), weekStart, (key) => `Week of ${formatShortDate(key)}`, weekMap) : [];

  const payments = PAYMENT_METHODS.map((method) => {
    const rows = sales.filter((sale) => sale.paymentMethod === method);
    return {
      method,
      amountMinor: rows.reduce((sum, sale) => sum + lineRevenue(sale), 0),
      count: rows.length,
    };
  }).filter((row) => row.count > 0);

  const byProduct = new Map<string, ProductPerformance>();
  for (const sale of sales) {
    const current = byProduct.get(sale.productId) ?? {
      productId: sale.productId,
      name: sale.productName,
      sku: sale.sku,
      quantity: 0,
      revenueMinor: 0,
      profitMinor: 0,
    };
    current.quantity += sale.quantity;
    current.revenueMinor += lineRevenue(sale);
    current.profitMinor += lineProfit(sale);
    byProduct.set(sale.productId, current);
  }
  const topProducts = [...byProduct.values()].sort((a, b) => b.revenueMinor - a.revenueMinor);

  const recent = [...sales].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date))).slice(0, 8);
  const lowStock = ledger.products.filter((product) => product.stockQty <= product.lowStockAt).sort((a, b) => a.stockQty - b.stockQty);

  return {
    revenueMinor,
    cogsMinor,
    grossProfitMinor,
    marginBps,
    transactionCount: sales.length,
    inventoryValueMinor,
    averageSaleMinor: sales.length > 0 ? Math.round(revenueMinor / sales.length) : 0,
    periodStart,
    periodEnd,
    trailingDays,
    monthly,
    weekly,
    payments,
    topProducts,
    recent,
    lowStock,
    completeness: completeness(ledger, sales, periodStart, periodEnd),
    referencedSales: sales.filter((sale) => sale.reference.trim().length > 0).length,
  };
}

export function emptyDaySeries(now = new Date()): Point[] {
  const today = isoDate(now);
  return fillRange(addDays(today, -13), today, (iso) => addDays(iso, 1), (iso) => iso, formatShortDate, new Map());
}

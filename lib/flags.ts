import { formatDisplayDate } from "./dates";
import { formatMoney } from "./money";
import { activeSales, lineRevenue, type Summary } from "./metrics";
import type { Ledger } from "./types";

export interface ReviewFlag {
  id: string;
  severity: "review" | "info";
  title: string;
  detail: string;
  modelDetail: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function reviewFlags(ledger: Ledger, summary: Summary): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const sales = activeSales(ledger);
  const currency = ledger.profile.currency;

  for (const sale of sales) {
    if (sale.unitPriceMinor < sale.unitCostMinor) {
      flags.push({
        id: `below-cost-${sale.id}`,
        severity: "review",
        title: "Selling price is below purchase cost",
        detail: `${formatDisplayDate(sale.date)}: ${sale.productName} sold at ${formatMoney(sale.unitPriceMinor, currency)} against a recorded cost of ${formatMoney(sale.unitCostMinor, currency)}. Check the price and the cost. This is a record to review, not a finding of fraud.`,
        modelDetail: `${sale.productName} was sold below its recorded purchase cost (${formatMoney(sale.unitPriceMinor, currency)} versus ${formatMoney(sale.unitCostMinor, currency)}). Ask a person to confirm the price and cost.`,
      });
    }
    const product = ledger.products.find((item) => item.id === sale.productId);
    if (product && product.priceMinor > 0) {
      const gap = Math.abs(sale.unitPriceMinor - product.priceMinor) / product.priceMinor;
      if (gap >= 0.25 && sale.unitPriceMinor >= sale.unitCostMinor) {
        flags.push({
          id: `price-gap-${sale.id}`,
          severity: "info",
          title: "Sale price differs from the catalog price",
          detail: `${formatDisplayDate(sale.date)}: ${sale.productName} sold at ${formatMoney(sale.unitPriceMinor, currency)}. The current catalog price is ${formatMoney(product.priceMinor, currency)}.`,
          modelDetail: `${sale.productName} was sold at ${formatMoney(sale.unitPriceMinor, currency)} while the current catalog price is ${formatMoney(product.priceMinor, currency)}.`,
        });
      }
    }
  }

  const byRef = new Map<string, number>();
  for (const sale of sales) {
    const ref = sale.reference.trim().toLowerCase();
    if (!ref) continue;
    byRef.set(ref, (byRef.get(ref) ?? 0) + 1);
  }
  for (const [ref, count] of byRef) {
    if (count < 2) continue;
    const display = sales.find((sale) => sale.reference.trim().toLowerCase() === ref)?.reference.trim() ?? ref;
    flags.push({
      id: `dup-ref-${ref}`,
      severity: "review",
      title: "Payment reference used more than once",
      detail: `Reference ${display} appears on ${count} sales. Confirm each entry should stand. Reuse can be a legitimate repeat or a duplicated row.`,
      modelDetail: `One payment reference is used on ${count} sales. A person should confirm they are separate sales.`,
    });
  }

  const revenues = sales.map(lineRevenue).filter((amount) => amount > 0);
  const typical = median(revenues);
  if (sales.length >= 5 && typical > 0) {
    const outliers = sales
      .filter((sale) => lineRevenue(sale) > typical * 3)
      .sort((a, b) => lineRevenue(b) - lineRevenue(a))
      .slice(0, 3);
    for (const sale of outliers) {
      flags.push({
        id: `large-${sale.id}`,
        severity: "info",
        title: "Sale is large compared with the typical sale",
        detail: `${formatDisplayDate(sale.date)}: ${sale.quantity} × ${sale.productName} for ${formatMoney(lineRevenue(sale), currency)}. The median sale is ${formatMoney(typical, currency)}. Large sales can be wholesale orders. Confirm the quantity.`,
        modelDetail: `A sale of ${sale.quantity} × ${sale.productName} is ${formatMoney(lineRevenue(sale), currency)}, more than three times the median sale of ${formatMoney(typical, currency)}.`,
      });
    }
  }

  for (const product of summary.lowStock) {
    if (product.stockQty === 0) {
      flags.push({
        id: `out-${product.id}`,
        severity: "info",
        title: "Product is out of stock",
        detail: `${product.name} has no units left.`,
        modelDetail: `${product.name} has no units left.`,
      });
    }
  }

  return flags.slice(0, 8);
}

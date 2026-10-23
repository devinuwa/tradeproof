import assert from "node:assert/strict";
import test from "node:test";
import { reviewFlags } from "./flags";
import { createProduct, emptyLedger, recordSale, voidSale } from "./ledger-ops";
import { lineCogs, lineRevenue, summarize } from "./metrics";
import { buildDemoLedger } from "./sample-data";

test("a sale reduces stock once and gross profit is revenue minus cost", () => {
  let ledger = emptyLedger("live");
  ledger = { ...ledger, profile: { ...ledger.profile, name: "Test Shop", owner: "Ada", sector: "Retail", location: "Minna", currency: "NGN" } };
  const created = createProduct(ledger, {
    name: "Soap",
    sku: "SOAP-1",
    category: "Household",
    costMinor: 5000,
    priceMinor: 8000,
    initialQty: 10,
    lowStockAt: 2,
  });
  assert.ok(!("error" in created));
  if ("error" in created) return;
  assert.equal(created.ledger.products[0].stockQty, 10);
  assert.equal(created.ledger.adjustments.length, 1);

  const sold = recordSale(created.ledger, {
    productId: created.ledger.products[0].id,
    quantity: 2,
    unitPriceMinor: 8000,
    paymentMethod: "cash",
    date: "2026-10-20",
    reference: "",
  });
  assert.ok(!("error" in sold));
  if ("error" in sold) return;
  assert.equal(sold.ledger.products[0].stockQty, 8);
  const summary = summarize(sold.ledger, new Date("2026-10-23T12:00:00"));
  assert.equal(summary.revenueMinor, 16000);
  assert.equal(summary.cogsMinor, 10000);
  assert.equal(summary.grossProfitMinor, summary.revenueMinor - summary.cogsMinor);
  assert.equal(summary.transactionCount, 1);
  assert.equal(summary.inventoryValueMinor, 8 * 5000);
});

test("overselling and a second void are rejected", () => {
  let ledger = emptyLedger("live");
  const created = createProduct(ledger, {
    name: "Oil",
    sku: "OIL-1",
    category: "Cooking",
    costMinor: 1000,
    priceMinor: 1500,
    initialQty: 1,
    lowStockAt: 0,
  });
  assert.ok(!("error" in created));
  if ("error" in created) return;
  const blocked = recordSale(created.ledger, {
    productId: created.ledger.products[0].id,
    quantity: 2,
    unitPriceMinor: 1500,
    paymentMethod: "pos",
    date: "2026-10-20",
    reference: "",
  });
  assert.ok("error" in blocked);

  const sold = recordSale(created.ledger, {
    productId: created.ledger.products[0].id,
    quantity: 1,
    unitPriceMinor: 1500,
    paymentMethod: "pos",
    date: "2026-10-20",
    reference: "POS-1",
  });
  assert.ok(!("error" in sold));
  if ("error" in sold) return;
  const voided = voidSale(sold.ledger, sold.ledger.sales[0].id, new Date("2026-10-23T12:00:00"));
  assert.ok(!("error" in voided));
  if ("error" in voided) return;
  assert.equal(voided.ledger.products[0].stockQty, 1);
  assert.equal(summarize(voided.ledger).transactionCount, 0);
  const again = voidSale(voided.ledger, voided.ledger.sales[0].id);
  assert.ok("error" in again);
});

test("adjustments do not change revenue and the demo shop stays in stock", () => {
  const demo = buildDemoLedger(new Date("2026-10-23T12:00:00"));
  assert.ok(demo.products.every((product) => product.stockQty >= 0));
  assert.ok(demo.sales.length > 5);
  const before = summarize(demo);
  const flagged = reviewFlags(demo, before);
  assert.ok(flagged.some((flag) => flag.title.includes("below purchase cost")));
  for (const sale of demo.sales.filter((item) => !item.voided)) {
    assert.equal(lineRevenue(sale) - lineCogs(sale), sale.quantity * sale.unitPriceMinor - sale.quantity * sale.unitCostMinor);
  }
  assert.equal(before.grossProfitMinor, before.revenueMinor - before.cogsMinor);
});

"use client";

import { useEffect, useMemo, useState } from "react";
import { useLedger } from "@/components/ledger-provider";
import { Button, Card, EmptyState, Field, inputClass } from "@/components/ui";
import { formatDisplayDate, todayIso } from "@/lib/dates";
import { formatMoney, minorToMajorInput, parseMajorToMinor } from "@/lib/money";
import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";

export default function SalesPage() {
  const { ledger, sell, voidRecordedSale } = useLedger();
  const [productId, setProductId] = useState(ledger.products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState(ledger.products[0] ? minorToMajorInput(ledger.products[0].priceMinor) : "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [date, setDate] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showVoided, setShowVoided] = useState(false);
  const currency = ledger.profile.currency;
  const product = ledger.products.find((item) => item.id === productId) ?? null;

  useEffect(() => {
    if (ledger.products.some((item) => item.id === productId)) return;
    const first = ledger.products[0];
    setProductId(first?.id ?? "");
    setPrice(first ? minorToMajorInput(first.priceMinor) : "");
  }, [ledger.products, productId]);

  const rows = useMemo(() => {
    return [...ledger.sales]
      .filter((sale) => showVoided || !sale.voided)
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  }, [ledger.sales, showVoided]);

  const previewPrice = parseMajorToMinor(price);
  const previewQty = Number(quantity);
  const previewOk = product && previewPrice !== null && Number.isInteger(previewQty) && previewQty > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales ledger</h1>
        <p className="mt-1 text-sm text-[#93a4bd]">Each sale reduces stock once and stores the selling price and purchase cost used for profit.</p>
      </div>

      {ledger.products.length === 0 ? (
        <EmptyState title="Add a product first" body="Sales need a product so stock and cost of goods can be calculated." />
      ) : (
        <Card>
          <h2 className="text-base font-semibold">Record a sale</h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const unitPriceMinor = parseMajorToMinor(price);
              if (unitPriceMinor === null) {
                setError("Enter a selling price with up to two decimal places.");
                return;
              }
              const message = sell({
                productId,
                quantity: Number(quantity),
                unitPriceMinor,
                paymentMethod: method,
                date,
                reference,
              });
              setError(message);
              if (!message) {
                setQuantity("1");
                setReference("");
              }
            }}
          >
            <Field label="Product">
              <select
                className={inputClass}
                value={productId}
                onChange={(event) => {
                  const next = ledger.products.find((item) => item.id === event.target.value);
                  setProductId(event.target.value);
                  if (next) setPrice(minorToMajorInput(next.priceMinor));
                }}
              >
                {ledger.products.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.stockQty} in stock</option>
                ))}
              </select>
            </Field>
            <Field label="Quantity">
              <input className={inputClass} inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </Field>
            <Field label="Selling price" hint={product ? `Catalog price ${formatMoney(product.priceMinor, currency)}. Cost on this sale will be ${formatMoney(product.costMinor, currency)}.` : undefined}>
              <input className={inputClass} inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} required />
            </Field>
            <Field label="Payment method">
              <select className={inputClass} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{PAYMENT_LABELS[item]}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input className={inputClass} type="date" max={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} required />
            </Field>
            <Field label="Reference" hint="Optional. Transfer or POS reference.">
              <input className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} maxLength={40} />
            </Field>
            {previewOk && product ? (
              <p className="text-sm text-[#c5d2e4] md:col-span-2">
                Revenue {formatMoney(previewQty * previewPrice, currency)} · Cost {formatMoney(previewQty * product.costMinor, currency)} · Gross profit {formatMoney(previewQty * previewPrice - previewQty * product.costMinor, currency)}
              </p>
            ) : null}
            {error ? <p className="text-sm text-rose-300 md:col-span-2" role="alert">{error}</p> : null}
            <div>
              <Button type="submit">Save sale</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Transaction history</h2>
          <label className="flex items-center gap-2 text-xs text-[#c5d2e4]">
            <input type="checkbox" checked={showVoided} onChange={(event) => setShowVoided(event.target.checked)} />
            Show voided
          </label>
        </div>
        {rows.length === 0 ? <p className="mt-3 text-sm text-[#93a4bd]">No sales to show.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#93a4bd]">
                <tr>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 font-medium">Price</th>
                  <th className="py-2 font-medium">Revenue</th>
                  <th className="py-2 font-medium">Profit</th>
                  <th className="py-2 font-medium">Payment</th>
                  <th className="py-2 font-medium">Reference</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((sale) => {
                  const revenue = sale.quantity * sale.unitPriceMinor;
                  const profit = revenue - sale.quantity * sale.unitCostMinor;
                  return (
                    <tr key={sale.id} className={`border-t border-white/10 ${sale.voided ? "text-[#64748b] line-through" : ""}`}>
                      <td className="py-2">{formatDisplayDate(sale.date)}</td>
                      <td className="py-2">{sale.productName}</td>
                      <td className="py-2">{sale.quantity}</td>
                      <td className="py-2">{formatMoney(sale.unitPriceMinor, currency)}</td>
                      <td className="py-2">{formatMoney(revenue, currency)}</td>
                      <td className="py-2">{formatMoney(profit, currency)}</td>
                      <td className="py-2 no-underline">{PAYMENT_LABELS[sale.paymentMethod]}</td>
                      <td className="py-2">{sale.reference || "—"}</td>
                      <td className="py-2">
                        {sale.voided ? "Voided" : (
                          <Button variant="ghost" onClick={() => {
                            if (window.confirm("Void this sale and return the units to stock?")) {
                              const message = voidRecordedSale(sale.id);
                              if (message) window.alert(message);
                            }
                          }}>Void</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

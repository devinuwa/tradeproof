"use client";

import { useState } from "react";
import { useLedger } from "@/components/ledger-provider";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { formatDisplayDate } from "@/lib/dates";
import { todayIso } from "@/lib/dates";
import { formatMoney, minorToMajorInput, parseMajorToMinor } from "@/lib/money";
import type { Product } from "@/lib/types";

interface ProductForm {
  name: string;
  sku: string;
  category: string;
  cost: string;
  price: string;
  initialQty: string;
  lowStockAt: string;
}

const blank: ProductForm = { name: "", sku: "", category: "", cost: "", price: "", initialQty: "0", lowStockAt: "5" };

export default function ProductsPage() {
  const { ledger, saveNewProduct, saveProductEdit, removeProduct, adjust } = useLedger();
  const [form, setForm] = useState<ProductForm>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [adjustDate, setAdjustDate] = useState(todayIso());
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const currency = ledger.profile.currency;

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      cost: minorToMajorInput(product.costMinor),
      price: minorToMajorInput(product.priceMinor),
      initialQty: "0",
      lowStockAt: String(product.lowStockAt),
    });
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-[#93a4bd]">Purchase cost, selling price, and the units currently on hand. Stock changes through sales and adjustments, not by rewriting history.</p>
      </div>

      <Card>
        <h2 className="text-base font-semibold">{editingId ? "Edit product" : "Add product"}</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const costMinor = parseMajorToMinor(form.cost);
            const priceMinor = parseMajorToMinor(form.price);
            const lowStockAt = Number(form.lowStockAt);
            if (costMinor === null || priceMinor === null) {
              setError("Enter prices with up to two decimal places, without a currency symbol.");
              return;
            }
            if (!Number.isInteger(lowStockAt)) {
              setError("Low-stock level must be a whole number.");
              return;
            }
            const message = editingId
              ? saveProductEdit(editingId, { name: form.name, sku: form.sku, category: form.category, costMinor, priceMinor, lowStockAt })
              : saveNewProduct({
                  name: form.name,
                  sku: form.sku,
                  category: form.category,
                  costMinor,
                  priceMinor,
                  initialQty: Number(form.initialQty),
                  lowStockAt,
                });
            setError(message);
            if (!message) {
              setForm(blank);
              setEditingId(null);
            }
          }}
        >
          <Field label="Product name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <Field label="SKU"><input className={inputClass} value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required /></Field>
          <Field label="Category"><input className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></Field>
          <Field label="Purchase cost" hint={`In ${currency}`}><input className={inputClass} inputMode="decimal" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} required /></Field>
          <Field label="Selling price" hint={`In ${currency}`}><input className={inputClass} inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></Field>
          <Field label="Low-stock level"><input className={inputClass} inputMode="numeric" value={form.lowStockAt} onChange={(event) => setForm({ ...form, lowStockAt: event.target.value })} required /></Field>
          {editingId ? null : (
            <Field label="Opening stock" hint="Saved once as an opening adjustment."><input className={inputClass} inputMode="numeric" value={form.initialQty} onChange={(event) => setForm({ ...form, initialQty: event.target.value })} required /></Field>
          )}
          {error ? <p className="text-sm text-rose-300 md:col-span-2" role="alert">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">{editingId ? "Save changes" : "Add product"}</Button>
            {editingId ? (
              <Button variant="ghost" onClick={() => { setEditingId(null); setForm(blank); setError(null); }}>Cancel</Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="text-base font-semibold">Catalog</h2>
        {ledger.products.length === 0 ? <p className="mt-3 text-sm text-[#93a4bd]">No products yet.</p> : (
          <table className="mt-3 w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#93a4bd]">
              <tr>
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">SKU</th>
                <th className="py-2 font-medium">Cost</th>
                <th className="py-2 font-medium">Price</th>
                <th className="py-2 font-medium">Stock</th>
                <th className="py-2 font-medium">Stock value</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ledger.products.map((product) => {
                const low = product.stockQty <= product.lowStockAt;
                return (
                  <tr key={product.id} className="border-t border-white/10">
                    <td className="py-2">
                      <div>{product.name}</div>
                      <div className="text-xs text-[#93a4bd]">{product.category}</div>
                    </td>
                    <td className="py-2 font-mono text-xs">{product.sku}</td>
                    <td className="py-2">{formatMoney(product.costMinor, currency)}</td>
                    <td className="py-2">{formatMoney(product.priceMinor, currency)}</td>
                    <td className={`py-2 ${low ? "text-amber-200" : ""}`}>{product.stockQty}{low ? " · low" : ""}</td>
                    <td className="py-2">{formatMoney(product.stockQty * product.costMinor, currency)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button variant="ghost" onClick={() => startEdit(product)}>Edit</Button>
                        <Button variant="ghost" onClick={() => { setAdjusting(product); setDelta(""); setReason(""); setAdjustDate(todayIso()); setAdjustError(null); }}>Adjust</Button>
                        <Button variant="danger" onClick={() => {
                          if (window.confirm(`Remove ${product.name} from the catalog? Past sales stay in the ledger.`)) removeProduct(product.id);
                        }}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Inventory adjustments</h2>
        {ledger.adjustments.length === 0 ? <p className="mt-3 text-sm text-[#93a4bd]">No adjustments yet.</p> : (
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {ledger.adjustments.slice(0, 12).map((adjustment) => (
              <li key={adjustment.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p>{adjustment.productName}</p>
                  <p className="text-xs text-[#93a4bd]">{formatDisplayDate(adjustment.date)} · {adjustment.reason}</p>
                </div>
                <p className={adjustment.delta < 0 ? "text-rose-200" : "text-emerald-200"}>{adjustment.delta > 0 ? `+${adjustment.delta}` : adjustment.delta}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {adjusting ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="adjust-title">
          <form
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#132033] p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = Number(delta);
              const message = adjust({ productId: adjusting.id, delta: parsed, reason, date: adjustDate });
              setAdjustError(message);
              if (!message) setAdjusting(null);
            }}
          >
            <h2 id="adjust-title" className="text-lg font-semibold">Adjust {adjusting.name}</h2>
            <p className="mt-1 text-sm text-[#93a4bd]">Current stock: {adjusting.stockQty}. Use a negative number to remove units.</p>
            <div className="mt-4 grid gap-3">
              <Field label="Quantity change"><input className={inputClass} value={delta} onChange={(event) => setDelta(event.target.value)} inputMode="numeric" required /></Field>
              <Field label="Reason"><input className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} required /></Field>
              <Field label="Date"><input className={inputClass} type="date" max={todayIso()} value={adjustDate} onChange={(event) => setAdjustDate(event.target.value)} required /></Field>
              {adjustError ? <p className="text-sm text-rose-300" role="alert">{adjustError}</p> : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAdjusting(null)}>Cancel</Button>
              <Button type="submit">Save adjustment</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SalesChart } from "@/components/sales-chart";
import { useLedger } from "@/components/ledger-provider";
import { Card } from "@/components/ui";
import { formatDisplayDate } from "@/lib/dates";
import { formatMoney, formatPercentFromBps } from "@/lib/money";
import type { BusinessProfile } from "@/lib/types";
import { PAYMENT_LABELS } from "@/lib/types";

export default function DashboardPage() {
  const { ledger, summary, saveProfile } = useLedger();
  const [profile, setProfile] = useState<BusinessProfile>(ledger.profile);
  const [editing, setEditing] = useState(ledger.profile.name.trim().length === 0);
  const [error, setError] = useState<string | null>(null);
  const [chart, setChart] = useState<"daily" | "monthly">("daily");

  useEffect(() => {
    setProfile(ledger.profile);
  }, [ledger]);

  const currency = ledger.profile.currency;
  const cards = [
    { label: "Revenue", value: formatMoney(summary.revenueMinor, currency), detail: `Cost of goods ${formatMoney(summary.cogsMinor, currency)}` },
    { label: "Gross profit", value: formatMoney(summary.grossProfitMinor, currency), detail: `Margin ${formatPercentFromBps(summary.marginBps)}` },
    { label: "Transactions", value: String(summary.transactionCount), detail: "Voided sales are excluded" },
    { label: "Inventory value", value: formatMoney(summary.inventoryValueMinor, currency), detail: "Units on hand × purchase cost" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Business ledger</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Your daily sales. Your business evidence.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#93a4bd]">
            Track products, record each sale, and read revenue and gross profit from those records. Download a loan-readiness report that says exactly what was entered.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales" className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#042f24]">Record a sale</Link>
          <Link href="/report" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold">Open report</Link>
        </div>
      </div>

      {ledger.mode === "demo" ? (
        <Card>
          <h2 className="text-sm font-semibold">Demo path</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-6 text-[#c5d2e4]">
            <li>You are on the dashboard for the fictional shop.</li>
            <li>Open Products and Sales to inspect stock and recorded sales.</li>
            <li>Add a sale and watch stock, revenue, and profit change.</li>
            <li>Open Analyst to generate a labeled commentary.</li>
            <li>Open Report and download the PDF.</li>
          </ol>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs uppercase tracking-wide text-[#93a4bd]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs text-[#93a4bd]">{card.detail}</p>
          </Card>
        ))}
      </section>
      <p className="text-xs text-[#93a4bd]">Gross profit = revenue − cost of goods sold, using the price and cost stored on each sale.</p>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <SalesChart points={chart === "daily" ? summary.trailingDays : summary.monthly} currency={currency} mode={chart} onMode={setChart} />
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Business profile</h2>
            <button type="button" className="text-xs font-semibold text-emerald-300" onClick={() => setEditing((value) => !value)}>
              {editing ? "Close" : "Edit"}
            </button>
          </div>
          {editing ? (
            <form
              className="mt-3 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const message = saveProfile(profile);
                setError(message);
                if (!message) setEditing(false);
              }}
            >
              {(["name", "owner", "sector", "location"] as const).map((key) => (
                <label key={key} className="text-xs text-[#93a4bd]">
                  <span className="mb-1 block capitalize">{key === "name" ? "Business name" : key}</span>
                  <input className="w-full rounded-lg border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-white" value={profile[key]} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} />
                </label>
              ))}
              <label className="text-xs text-[#93a4bd]">
                <span className="mb-1 block">Currency</span>
                <select className="w-full rounded-lg border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-white" value={profile.currency} onChange={(event) => setProfile({ ...profile, currency: event.target.value as BusinessProfile["currency"] })}>
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <p className="text-xs text-[#93a4bd]">Changing currency does not convert amounts. Numbers stay as entered and only the symbol changes.</p>
              {error ? <p className="text-xs text-rose-300" role="alert">{error}</p> : null}
              <button type="submit" className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#042f24]">Save profile</button>
            </form>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-[#93a4bd]">Owner</dt><dd>{ledger.profile.owner || "Not set"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#93a4bd]">Sector</dt><dd className="text-right">{ledger.profile.sector || "Not set"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#93a4bd]">Location</dt><dd className="text-right">{ledger.profile.location || "Not set"}</dd></div>
            </dl>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent sales</h2>
            <Link href="/sales" className="text-xs font-semibold text-emerald-300">View ledger</Link>
          </div>
          {summary.recent.length === 0 ? (
            <p className="mt-4 text-sm text-[#93a4bd]">No sales yet. Record one to see revenue and profit.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10">
              {summary.recent.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p>{sale.productName}</p>
                    <p className="text-xs text-[#93a4bd]">{formatDisplayDate(sale.date)} · {sale.quantity} · {PAYMENT_LABELS[sale.paymentMethod]}</p>
                  </div>
                  <p className="font-medium">{formatMoney(sale.quantity * sale.unitPriceMinor, currency)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-base font-semibold">Low stock</h2>
          {summary.lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-[#93a4bd]">No product is at or below its low-stock level.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {summary.lowStock.map((product) => (
                <li key={product.id} className="flex items-center justify-between rounded-lg bg-amber-300/10 px-3 py-2 text-sm">
                  <span>{product.name}</span>
                  <span className="text-amber-100">{product.stockQty} left</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useLedger } from "@/components/ledger-provider";
import { Button, Card } from "@/components/ui";
import { formatDisplayDate, formatGeneratedAt } from "@/lib/dates";
import { formatMoney, formatPercentFromBps } from "@/lib/money";
import { downloadLoanReport } from "@/lib/pdf-report";
import { PAYMENT_LABELS } from "@/lib/types";

export default function ReportPage() {
  const { ledger, summary, dataFingerprint } = useLedger();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = ledger.profile.currency;
  const insight = ledger.insight;
  const fresh = Boolean(insight && insight.fingerprint === dataFingerprint);
  const period = summary.periodStart && summary.periodEnd ? `${formatDisplayDate(summary.periodStart)} – ${formatDisplayDate(summary.periodEnd)}` : "No sales recorded";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loan-readiness report</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#93a4bd]">
            A PDF of the records in this browser. It is supporting paperwork for a conversation, not a bank statement or an approval.
          </p>
        </div>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await downloadLoanReport(ledger, summary, insight, fresh);
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "The PDF could not be created.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Preparing PDF…" : "Download PDF"}
        </Button>
      </div>
      {error ? <p className="text-sm text-rose-300" role="alert">{error}</p> : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-300">TradeProof</p>
            <h2 className="mt-1 text-xl font-semibold">{ledger.profile.name || "Unnamed business"}</h2>
            <p className="text-sm text-[#93a4bd]">{ledger.profile.owner || "Owner not recorded"} · {ledger.profile.location || "Location not recorded"}</p>
          </div>
          <p className="text-xs text-[#93a4bd]">Preview · generated {formatGeneratedAt()}</p>
        </div>
        <p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50">
          This report is generated from records entered by the business. It is not independently verified, an official bank statement, a credit score, or a loan approval.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div><dt className="text-[#93a4bd]">Period</dt><dd>{period}</dd></div>
          <div><dt className="text-[#93a4bd]">Dataset</dt><dd>{ledger.mode === "demo" ? "Fictional demo shop" : "Business-entered records"}</dd></div>
          <div><dt className="text-[#93a4bd]">Revenue</dt><dd>{formatMoney(summary.revenueMinor, currency)}</dd></div>
          <div><dt className="text-[#93a4bd]">Cost of goods sold</dt><dd>{formatMoney(summary.cogsMinor, currency)}</dd></div>
          <div><dt className="text-[#93a4bd]">Gross profit</dt><dd>{formatMoney(summary.grossProfitMinor, currency)} · {formatPercentFromBps(summary.marginBps)}</dd></div>
          <div><dt className="text-[#93a4bd]">Inventory value</dt><dd>{formatMoney(summary.inventoryValueMinor, currency)}</dd></div>
        </dl>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold">Payment methods</h2>
          {summary.payments.length === 0 ? <p className="mt-2 text-sm text-[#93a4bd]">No sales yet.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {summary.payments.map((payment) => (
                <li key={payment.method} className="flex justify-between gap-3">
                  <span>{PAYMENT_LABELS[payment.method]} · {payment.count}</span>
                  <span>{formatMoney(payment.amountMinor, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-base font-semibold">Recordkeeping</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.completeness.map((item) => (
              <li key={item.id} className="flex gap-2">
                <span className={item.ok ? "text-emerald-300" : "text-amber-200"}>{item.ok ? "Recorded" : "Missing"}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Analyst narrative in the PDF</h2>
        {!insight ? <p className="mt-2 text-sm text-[#93a4bd]">None yet. The PDF will say so, and the figures still download. Generate one on the Analyst page to include it.</p> : null}
        {insight && !fresh ? <p className="mt-2 text-sm text-amber-100">The saved commentary is out of date, so the PDF will leave it out.</p> : null}
        {insight && fresh ? (
          <p className="mt-2 text-sm leading-6 text-[#d5deeb]">
            {insight.source === "gemma-4" ? `The PDF will include Gemma 4 commentary${insight.model ? ` (${insight.model})` : ""}, labeled as model output.` : "The PDF will include demo insights and will say they are not live Gemma 4 output."}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

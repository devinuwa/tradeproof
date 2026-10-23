"use client";

import { useState } from "react";
import { useLedger } from "@/components/ledger-provider";
import { Button, Card } from "@/components/ui";
import { buildSnapshot, demoInsights, type AnalysisInsight } from "@/lib/analysis";
import { formatMoney, formatPercentFromBps } from "@/lib/money";

interface AnalystResponse {
  ok: boolean;
  source?: "gemma-4" | "demo";
  model?: string | null;
  notice?: string | null;
  insight?: AnalysisInsight;
  error?: string;
}

export default function AnalystPage() {
  const { ledger, summary, flags, dataFingerprint, rememberInsight } = useLedger();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = ledger.profile.currency;
  const insight = ledger.insight;
  const fresh = insight?.fingerprint === dataFingerprint;
  const snapshot = buildSnapshot(ledger, summary, flags);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const data = (await response.json()) as AnalystResponse;
      if (!data.ok || !data.insight || !data.source) {
        setError(data.error || "The analysis could not be completed.");
        return;
      }
      rememberInsight({
        source: data.source,
        model: data.model ?? null,
        dataset: snapshot.dataset,
        generatedAt: new Date().toISOString(),
        fingerprint: dataFingerprint,
        ...data.insight,
      });
    } catch {
      setError("The analysis request did not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function useDemoCopy() {
    const insightText = demoInsights(snapshot);
    rememberInsight({
      source: "demo",
      model: null,
      dataset: snapshot.dataset,
      generatedAt: new Date().toISOString(),
      fingerprint: dataFingerprint,
      ...insightText,
    });
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business analyst</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#93a4bd]">
            Gemma 4 reads the totals below and writes a commentary. It does not calculate money and it does not verify income.
          </p>
        </div>
        <Button onClick={run} disabled={loading}>{loading ? "Analyzing…" : "Generate analysis"}</Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Revenue", formatMoney(summary.revenueMinor, currency)],
          ["Cost of goods", formatMoney(summary.cogsMinor, currency)],
          ["Gross profit", formatMoney(summary.grossProfitMinor, currency)],
          ["Margin", formatPercentFromBps(summary.marginBps)],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs uppercase tracking-wide text-[#93a4bd]">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>

      {error ? (
        <Card>
          <p className="text-sm text-rose-200" role="alert">{error}</p>
          <div className="mt-3">
            <Button variant="secondary" onClick={useDemoCopy}>Show demo insights instead</Button>
          </div>
          <p className="mt-2 text-xs text-[#93a4bd]">Demo insights are written by the application. They are not live Gemma 4 output.</p>
        </Card>
      ) : null}

      {loading ? <p className="text-sm text-[#93a4bd]">Sending aggregated totals to the analyst…</p> : null}

      {insight ? (
        <Card>
          <p className={`text-xs font-semibold uppercase tracking-wide ${insight.source === "gemma-4" ? "text-emerald-300" : "text-amber-200"}`}>
            {insight.source === "gemma-4"
              ? `Gemma 4${insight.model ? ` · ${insight.model}` : ""} · AI-generated commentary`
              : "Demo insights · not live Gemma 4 output"}
          </p>
          {!fresh ? <p className="mt-2 text-sm text-amber-100">The ledger changed after this commentary was written. Generate it again before using it in a report.</p> : null}
          {insight.dataset === "fictional-demo" ? <p className="mt-2 text-sm text-[#93a4bd]">These notes describe the fictional demo shop.</p> : null}
          <h2 className="mt-4 text-base font-semibold">Summary</h2>
          <p className="mt-2 text-sm leading-6 text-[#d5deeb]">{insight.summary}</p>
          <h2 className="mt-4 text-base font-semibold">Trends</h2>
          <p className="mt-2 text-sm leading-6 text-[#d5deeb]">{insight.trends || "No trend note was returned."}</p>
          <h2 className="mt-4 text-base font-semibold">Recommendations</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#d5deeb]">
            {insight.recommendations.length === 0 ? <li>No recommendations were returned.</li> : insight.recommendations.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <h2 className="mt-4 text-base font-semibold">Recordkeeping</h2>
          <p className="mt-2 text-sm leading-6 text-[#d5deeb]">{insight.recordkeeping || "No recordkeeping note was returned."}</p>
          <h2 className="mt-4 text-base font-semibold">For a person to review</h2>
          <p className="mt-2 text-sm leading-6 text-[#d5deeb]">{insight.reviewNotes || "No review notes were returned."}</p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm leading-6 text-[#93a4bd]">Generate an analysis to summarize these records. If no API key is set, the app shows clearly labeled demo insights instead of pretending Gemma replied.</p>
        </Card>
      )}

      <Card>
        <h2 className="text-base font-semibold">Checks already done in the ledger</h2>
        {flags.length === 0 ? <p className="mt-2 text-sm text-[#93a4bd]">No inconsistent entries were flagged.</p> : (
          <ul className="mt-3 space-y-3">
            {flags.map((flag) => (
              <li key={flag.id}>
                <p className="text-sm font-medium">{flag.title}</p>
                <p className="text-sm leading-6 text-[#93a4bd]">{flag.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

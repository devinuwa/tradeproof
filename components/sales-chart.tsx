"use client";

import type { Point } from "@/lib/metrics";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/types";

export function SalesChart({
  points,
  currency,
  mode,
  onMode,
}: {
  points: Point[];
  currency: CurrencyCode;
  mode: "daily" | "monthly";
  onMode: (mode: "daily" | "monthly") => void;
}) {
  const max = Math.max(...points.map((point) => point.revenueMinor), 1);
  const total = points.reduce((sum, point) => sum + point.revenueMinor, 0);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Sales</h2>
          <p className="text-xs text-[#93a4bd]">{mode === "daily" ? "Last 14 days" : "By month"} · {formatMoney(total, currency)} in view</p>
        </div>
        <div className="flex rounded-lg border border-white/10 p-0.5 text-xs" role="group" aria-label="Chart range">
          {(["daily", "monthly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => onMode(option)}
              className={`rounded-md px-2.5 py-1 capitalize ${mode === option ? "bg-emerald-400 text-[#042f24]" : "text-[#c5d2e4]"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-[#93a4bd]">No sales in this range yet.</p>
      ) : (
        <div className="flex h-48 items-end gap-1" role="img" aria-label={`Sales chart totaling ${formatMoney(total, currency)}`}>
          {points.map((point) => (
            <div key={point.key} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <div
                className="rounded-t bg-emerald-400/80"
                style={{ height: `${Math.max(4, (point.revenueMinor / max) * 100)}%` }}
                title={`${point.label}: ${formatMoney(point.revenueMinor, currency)}`}
              />
              <span className="mt-1 truncate text-center text-[10px] text-[#93a4bd]">{point.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}
      <table className="sr-only">
        <caption>Sales figures</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{formatMoney(point.revenueMinor, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

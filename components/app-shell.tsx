"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLedger } from "@/components/ledger-provider";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/sales", label: "Sales" },
  { href: "/analyst", label: "Analyst" },
  { href: "/report", label: "Report" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ledger, persistError, loadDemo, useOwnRecords } = useLedger();
  const [confirmDemo, setConfirmDemo] = useState(false);
  const demo = ledger.mode === "demo";

  return (
    <div className="min-h-full bg-[#0b1220] text-[#e7eef8]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-[#0b1220]">
        Skip to content
      </a>
      <div className="md:grid md:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#0e1726] md:flex md:min-h-screen md:flex-col md:px-4 md:py-6">
          <div className="px-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400 text-sm font-bold text-[#042f24]">T</span>
              <div>
                <p className="text-sm font-semibold tracking-tight">TradeProof</p>
                <p className="text-xs text-[#93a4bd]">Your daily sales. Your business evidence.</p>
              </div>
            </div>
          </div>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm ${active ? "bg-emerald-400/15 font-medium text-emerald-300" : "text-[#c5d2e4] hover:bg-white/5"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-white/10 bg-[#132033] p-3 text-xs leading-5 text-[#93a4bd]">
            Figures are calculated from the ledger. The analyst commentary is labeled separately.
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b1220]/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{ledger.profile.name || "Untitled business"}</p>
              <p className="truncate text-xs text-[#93a4bd]">{demo ? "Fictional demo shop" : "Your records"} · {ledger.profile.currency}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {demo ? (
                <button type="button" onClick={useOwnRecords} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium hover:bg-white/5">
                  Use my records
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmDemo(true)} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-[#042f24]">
                  Load fictional demo
                </button>
              )}
            </div>
          </header>
          {demo ? (
            <div className="border-b border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 md:px-8">
              Fictional sample data for Kemi&apos;s Corner Shop. It is stored apart from your own records.
            </div>
          ) : null}
          {persistError ? <div className="bg-rose-500/15 px-4 py-2 text-sm text-rose-100 md:px-8">{persistError}</div> : null}
          <main id="main" className="px-4 py-6 pb-24 md:px-8 md:pb-10">
            {children}
          </main>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-white/10 bg-[#0e1726] md:hidden" aria-label="Primary">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`px-1 py-3 text-center text-[11px] ${active ? "font-semibold text-emerald-300" : "text-[#93a4bd]"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {confirmDemo ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="demo-title">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#132033] p-5">
            <h2 id="demo-title" className="text-lg font-semibold">Load the fictional demo shop?</h2>
            <p className="mt-2 text-sm leading-6 text-[#c5d2e4]">This replaces the sample shop with a fresh copy. Your own records stay where they are.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-3 py-2 text-sm text-[#c5d2e4]" onClick={() => setConfirmDemo(false)}>Cancel</button>
              <button
                type="button"
                className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#042f24]"
                onClick={() => {
                  loadDemo();
                  setConfirmDemo(false);
                }}
              >
                Load demo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

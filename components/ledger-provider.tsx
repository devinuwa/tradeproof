"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { reviewFlags } from "@/lib/flags";
import { adjustStock, createProduct, deleteProduct, editProduct, emptyLedger, normalizeProfile, recordSale, voidSale } from "@/lib/ledger-ops";
import { fingerprint, summarize } from "@/lib/metrics";
import { buildDemoLedger } from "@/lib/sample-data";
import { loadState, saveState } from "@/lib/storage";
import type { AdjustmentInput, BusinessProfile, Ledger, PersistedState, ProductEdit, ProductInput, SaleInput, StoredInsight } from "@/lib/types";

interface LedgerContextValue {
  ready: boolean;
  persistError: string | null;
  ledger: Ledger;
  summary: ReturnType<typeof summarize>;
  flags: ReturnType<typeof reviewFlags>;
  dataFingerprint: string;
  saveProfile: (profile: BusinessProfile) => string | null;
  saveNewProduct: (input: ProductInput) => string | null;
  saveProductEdit: (id: string, input: ProductEdit) => string | null;
  removeProduct: (id: string) => string | null;
  adjust: (input: AdjustmentInput) => string | null;
  sell: (input: SaleInput) => string | null;
  voidRecordedSale: (id: string) => string | null;
  loadDemo: () => void;
  useOwnRecords: () => void;
  clearOwnRecords: () => void;
  rememberInsight: (insight: StoredInsight) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const stateRef = useRef<PersistedState | null>(null);

  useEffect(() => {
    const loaded = loadState();
    stateRef.current = loaded;
    setState(loaded);
  }, []);

  useEffect(() => {
    if (!state) return;
    setPersistError(saveState(state));
  }, [state]);

  const value = useMemo<LedgerContextValue | null>(() => {
    if (!state) return null;
    const ledger = state.active === "demo" ? state.demo : state.live;
    const summary = summarize(ledger);
    const flags = reviewFlags(ledger, summary);

    const commit = (next: PersistedState) => {
      stateRef.current = next;
      setState(next);
    };

    const mutate = (apply: (current: Ledger) => { ledger: Ledger } | { error: string }): string | null => {
      const current = stateRef.current;
      if (!current) return "The ledger is still loading.";
      const active = current.active === "demo" ? current.demo : current.live;
      const result = apply(active);
      if ("error" in result) return result.error;
      const nextLedger = { ...result.ledger, mode: current.active };
      commit(current.active === "demo" ? { ...current, demo: nextLedger } : { ...current, live: nextLedger });
      return null;
    };

    return {
      ready: true,
      persistError,
      ledger,
      summary,
      flags,
      dataFingerprint: fingerprint(ledger, summary),
      saveProfile: (profile) => {
        const normalized = normalizeProfile(profile);
        if ("error" in normalized) return normalized.error;
        return mutate((current) => ({ ledger: { ...current, profile: normalized.profile } }));
      },
      saveNewProduct: (input) => mutate((current) => createProduct(current, input)),
      saveProductEdit: (id, input) => mutate((current) => editProduct(current, id, input)),
      removeProduct: (id) => mutate((current) => deleteProduct(current, id)),
      adjust: (input) => mutate((current) => adjustStock(current, input)),
      sell: (input) => mutate((current) => recordSale(current, input)),
      voidRecordedSale: (id) => mutate((current) => voidSale(current, id)),
      loadDemo: () => {
        const current = stateRef.current;
        if (!current) return;
        commit({ ...current, active: "demo", demo: buildDemoLedger() });
      },
      useOwnRecords: () => {
        const current = stateRef.current;
        if (!current) return;
        commit({ ...current, active: "live" });
      },
      clearOwnRecords: () => {
        const current = stateRef.current;
        if (!current) return;
        commit({ ...current, active: "live", live: emptyLedger("live") });
      },
      rememberInsight: (insight) => {
        mutate((current) => ({ ledger: { ...current, insight } }));
      },
    };
  }, [persistError, state]);

  if (!value) {
    return <div className="grid min-h-full place-items-center text-sm text-[#93a4bd]">Loading your ledger…</div>;
  }

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside LedgerProvider");
  return value;
}

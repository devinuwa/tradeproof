import { buildDemoLedger } from "./sample-data";
import { emptyLedger } from "./ledger-ops";
import type { PersistedState } from "./types";

export const STORAGE_KEY = "tradeproof.v1";

export function freshState(): PersistedState {
  return {
    version: 1,
    active: "demo",
    live: emptyLedger("live"),
    demo: buildDemoLedger(),
  };
}

function isLedger(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const ledger = value as { version?: number; products?: unknown; sales?: unknown; adjustments?: unknown; profile?: unknown };
  return ledger.version === 1 && Array.isArray(ledger.products) && Array.isArray(ledger.sales) && Array.isArray(ledger.adjustments) && Boolean(ledger.profile);
}

export function loadState(): PersistedState {
  if (typeof window === "undefined") return freshState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== 1 || (parsed.active !== "live" && parsed.active !== "demo")) return freshState();
    if (!isLedger(parsed.live) || !isLedger(parsed.demo)) return freshState();
    return parsed;
  } catch {
    return freshState();
  }
}

export function saveState(state: PersistedState): string | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch {
    return "This browser blocked local storage, so changes may disappear when you close the tab.";
  }
}

import type { CurrencyCode } from "./types";

export function formatMoney(minor: number, currency: CurrencyCode): string {
  const amount = minor / 100;
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMinorPlain(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole.toLocaleString("en-US")}.${frac}`;
}

/** Parse a major-unit amount such as "1250.50" into minor units. */
export function parseMajorToMinor(raw: string): number | null {
  const value = raw.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

export function minorToMajorInput(minor: number): string {
  const whole = Math.floor(minor / 100);
  const frac = String(minor % 100).padStart(2, "0");
  return frac === "00" ? String(whole) : `${whole}.${frac}`;
}

export function formatPercentFromBps(bps: number): string {
  const sign = bps < 0 ? "-" : "";
  const abs = Math.abs(bps);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}%`;
}

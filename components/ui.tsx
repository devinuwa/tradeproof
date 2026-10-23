"use client";

import type { ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const styles = {
    primary: "bg-emerald-400 text-[#042f24] hover:bg-emerald-300",
    secondary: "border border-white/15 bg-white/5 text-white hover:bg-white/10",
    danger: "bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
    ghost: "text-[#c5d2e4] hover:bg-white/5",
  }[variant];
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-[#d5deeb]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#93a4bd]">{hint}</span> : null}
      {error ? (
        <span className="mt-1 block text-xs text-rose-300" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#64748b] focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/30";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-[#132033] p-4 md:p-5 ${className}`}>{children}</section>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#93a4bd]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

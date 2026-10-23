import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { LedgerProvider } from "@/components/ledger-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeProof",
  description: "An open-source AI-powered business ledger for small shops. Track products, record sales, and download a transparent loan-readiness report.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0b1220] font-sans text-[#e7eef8]">
        <LedgerProvider>
          <AppShell>{children}</AppShell>
        </LedgerProvider>
      </body>
    </html>
  );
}

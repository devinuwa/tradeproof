export type CurrencyCode = "NGN" | "USD";

export type PaymentMethod = "cash" | "transfer" | "pos" | "credit";

export type LedgerMode = "live" | "demo";

export interface BusinessProfile {
  name: string;
  owner: string;
  sector: string;
  location: string;
  currency: CurrencyCode;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  costMinor: number;
  priceMinor: number;
  stockQty: number;
  lowStockAt: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  delta: number;
  reason: string;
  date: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceMinor: number;
  unitCostMinor: number;
  paymentMethod: PaymentMethod;
  date: string;
  reference: string;
  createdAt: string;
  voided: boolean;
}

export interface StoredInsight {
  source: "gemma-4" | "demo";
  model: string | null;
  dataset: "fictional-demo" | "business-entered";
  generatedAt: string;
  fingerprint: string;
  summary: string;
  trends: string;
  recommendations: string[];
  recordkeeping: string;
  reviewNotes: string;
}

export interface Ledger {
  version: 1;
  mode: LedgerMode;
  profile: BusinessProfile;
  products: Product[];
  sales: Sale[];
  adjustments: StockAdjustment[];
  insight: StoredInsight | null;
}

export interface PersistedState {
  version: 1;
  active: LedgerMode;
  live: Ledger;
  demo: Ledger;
}

export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  costMinor: number;
  priceMinor: number;
  initialQty: number;
  lowStockAt: number;
}

export interface ProductEdit {
  name: string;
  sku: string;
  category: string;
  costMinor: number;
  priceMinor: number;
  lowStockAt: number;
}

export interface SaleInput {
  productId: string;
  quantity: number;
  unitPriceMinor: number;
  paymentMethod: PaymentMethod;
  date: string;
  reference: string;
}

export interface AdjustmentInput {
  productId: string;
  delta: number;
  reason: string;
  date: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "transfer", "pos", "credit"];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  transfer: "Bank transfer",
  pos: "POS",
  credit: "Credit",
};

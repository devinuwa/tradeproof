import { isIsoDate, todayIso } from "./dates";
import type { AdjustmentInput, CurrencyCode, Ledger, Product, ProductEdit, ProductInput, Sale, SaleInput } from "./types";
import { PAYMENT_METHODS } from "./types";

const MAX_MINOR = 100_000_000_00;
const MAX_QTY = 100_000;

export function emptyProfile(): Ledger["profile"] {
  return {
    name: "",
    owner: "",
    sector: "",
    location: "",
    currency: "NGN",
  };
}

export function emptyLedger(mode: Ledger["mode"]): Ledger {
  return {
    version: 1,
    mode,
    profile: emptyProfile(),
    products: [],
    sales: [],
    adjustments: [],
    insight: null,
  };
}

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function clean(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function normalizeProfile(input: Ledger["profile"]): { profile: Ledger["profile"] } | { error: string } {
  const currency: CurrencyCode = input.currency === "USD" ? "USD" : input.currency === "NGN" ? "NGN" : "NGN";
  if (input.currency !== "NGN" && input.currency !== "USD") {
    return { error: "Choose NGN or USD." };
  }
  const name = clean(input.name, 80);
  const owner = clean(input.owner, 80);
  const sector = clean(input.sector, 80);
  const location = clean(input.location, 80);
  if (name && name.length < 2) return { error: "Business name must be at least 2 characters." };
  if (owner && owner.length < 2) return { error: "Owner name must be at least 2 characters." };
  return { profile: { name, owner, sector, location, currency } };
}

function validateProductFields(input: { name: string; sku: string; category: string; costMinor: number; priceMinor: number; lowStockAt: number }): string | null {
  const name = clean(input.name, 80);
  const sku = clean(input.sku, 32).toUpperCase();
  const category = clean(input.category, 40);
  if (name.length < 2) return "Enter a product name.";
  if (!/^[A-Z0-9][A-Z0-9-]{0,31}$/.test(sku)) return "SKU must use letters, numbers, and hyphens.";
  if (category.length < 2) return "Enter a category.";
  if (!Number.isInteger(input.costMinor) || input.costMinor < 0 || input.costMinor > MAX_MINOR) return "Enter a valid purchase cost.";
  if (!Number.isInteger(input.priceMinor) || input.priceMinor < 0 || input.priceMinor > MAX_MINOR) return "Enter a valid selling price.";
  if (!Number.isInteger(input.lowStockAt) || input.lowStockAt < 0 || input.lowStockAt > MAX_QTY) return "Low-stock level must be a whole number from 0 upward.";
  return null;
}

export function createProduct(ledger: Ledger, input: ProductInput, now = new Date()): { ledger: Ledger } | { error: string } {
  const error = validateProductFields(input);
  if (error) return { error };
  if (!Number.isInteger(input.initialQty) || input.initialQty < 0 || input.initialQty > MAX_QTY) {
    return { error: "Opening stock must be a whole number from 0 upward." };
  }
  const sku = clean(input.sku, 32).toUpperCase();
  if (ledger.products.some((product) => product.sku.toUpperCase() === sku)) {
    return { error: "That SKU is already used." };
  }
  const stamp = now.toISOString();
  const product: Product = {
    id: id("prd"),
    name: clean(input.name, 80),
    sku,
    category: clean(input.category, 40),
    costMinor: input.costMinor,
    priceMinor: input.priceMinor,
    stockQty: input.initialQty,
    lowStockAt: input.lowStockAt,
    createdAt: stamp,
    updatedAt: stamp,
  };
  const adjustments = [...ledger.adjustments];
  if (input.initialQty > 0) {
    adjustments.unshift({
      id: id("adj"),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      delta: input.initialQty,
      reason: "Opening stock",
      date: todayIso(now),
      createdAt: stamp,
    });
  }
  return { ledger: { ...ledger, products: [product, ...ledger.products], adjustments } };
}

export function editProduct(ledger: Ledger, productId: string, input: ProductEdit): { ledger: Ledger } | { error: string } {
  const error = validateProductFields(input);
  if (error) return { error };
  const current = ledger.products.find((product) => product.id === productId);
  if (!current) return { error: "That product is no longer in the catalog." };
  const sku = clean(input.sku, 32).toUpperCase();
  if (ledger.products.some((product) => product.id !== productId && product.sku.toUpperCase() === sku)) {
    return { error: "That SKU is already used." };
  }
  const products = ledger.products.map((product) =>
    product.id === productId
      ? {
          ...product,
          name: clean(input.name, 80),
          sku,
          category: clean(input.category, 40),
          costMinor: input.costMinor,
          priceMinor: input.priceMinor,
          lowStockAt: input.lowStockAt,
          updatedAt: new Date().toISOString(),
        }
      : product,
  );
  return { ledger: { ...ledger, products } };
}

export function deleteProduct(ledger: Ledger, productId: string): { ledger: Ledger } | { error: string } {
  if (!ledger.products.some((product) => product.id === productId)) {
    return { error: "That product is no longer in the catalog." };
  }
  return { ledger: { ...ledger, products: ledger.products.filter((product) => product.id !== productId) } };
}

export function adjustStock(ledger: Ledger, input: AdjustmentInput, now = new Date()): { ledger: Ledger } | { error: string } {
  const product = ledger.products.find((item) => item.id === input.productId);
  if (!product) return { error: "Choose a product." };
  if (!Number.isInteger(input.delta) || input.delta === 0 || Math.abs(input.delta) > MAX_QTY) {
    return { error: "Enter a whole-number quantity that is not zero." };
  }
  if (product.stockQty + input.delta < 0) {
    return { error: `Only ${product.stockQty} in stock. That adjustment would go below zero.` };
  }
  const reason = clean(input.reason, 80);
  if (reason.length < 2) return { error: "Add a short reason for the adjustment." };
  if (!isIsoDate(input.date) || input.date > todayIso(now)) return { error: "Enter an adjustment date that is not in the future." };
  const stamp = now.toISOString();
  return {
    ledger: {
      ...ledger,
      products: ledger.products.map((item) => (item.id === product.id ? { ...item, stockQty: item.stockQty + input.delta, updatedAt: stamp } : item)),
      adjustments: [
        {
          id: id("adj"),
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          delta: input.delta,
          reason,
          date: input.date,
          createdAt: stamp,
        },
        ...ledger.adjustments,
      ],
    },
  };
}

export function recordSale(ledger: Ledger, input: SaleInput, now = new Date()): { ledger: Ledger } | { error: string } {
  const product = ledger.products.find((item) => item.id === input.productId);
  if (!product) return { error: "Choose a product that is still in the catalog." };
  if (!Number.isInteger(input.quantity) || input.quantity <= 0 || input.quantity > MAX_QTY) {
    return { error: "Quantity must be a whole number greater than zero." };
  }
  if (input.quantity > product.stockQty) {
    return { error: product.stockQty === 0 ? `${product.name} is out of stock.` : `Only ${product.stockQty} ${product.name} in stock.` };
  }
  if (!Number.isInteger(input.unitPriceMinor) || input.unitPriceMinor < 0 || input.unitPriceMinor > MAX_MINOR) {
    return { error: "Enter a valid selling price." };
  }
  if (!Number.isSafeInteger(input.quantity * input.unitPriceMinor) || !Number.isSafeInteger(input.quantity * product.costMinor)) {
    return { error: "That quantity and price are too large to total safely." };
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) return { error: "Choose a payment method." };
  if (!isIsoDate(input.date) || input.date > todayIso(now)) return { error: "Enter a sale date that is not in the future." };
  const reference = clean(input.reference, 40);
  const stamp = now.toISOString();
  const sale: Sale = {
    id: id("sale"),
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    quantity: input.quantity,
    unitPriceMinor: input.unitPriceMinor,
    unitCostMinor: product.costMinor,
    paymentMethod: input.paymentMethod,
    date: input.date,
    reference,
    createdAt: stamp,
    voided: false,
  };
  return {
    ledger: {
      ...ledger,
      products: ledger.products.map((item) => (item.id === product.id ? { ...item, stockQty: item.stockQty - input.quantity, updatedAt: stamp } : item)),
      sales: [sale, ...ledger.sales],
    },
  };
}

export function voidSale(ledger: Ledger, saleId: string, now = new Date()): { ledger: Ledger } | { error: string } {
  const sale = ledger.sales.find((item) => item.id === saleId);
  if (!sale) return { error: "That sale is not in the ledger." };
  if (sale.voided) return { error: "This sale is already voided." };
  const product = ledger.products.find((item) => item.id === sale.productId);
  if (!product) {
    return { error: "The product was removed, so the stock cannot be restored. Add the product again before voiding this sale." };
  }
  const stamp = now.toISOString();
  return {
    ledger: {
      ...ledger,
      products: ledger.products.map((item) => (item.id === product.id ? { ...item, stockQty: item.stockQty + sale.quantity, updatedAt: stamp } : item)),
      sales: ledger.sales.map((item) => (item.id === sale.id ? { ...item, voided: true } : item)),
    },
  };
}

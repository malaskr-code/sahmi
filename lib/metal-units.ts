import type { Product } from "@/lib/product-types";

export function isValidQuantity(type: Product["type"], quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) return false;
  if (type !== "metal") return Number.isSafeInteger(quantity) && quantity >= 1;
  const milliGrams = quantity * 1000;
  return quantity <= 1_000_000 && Math.abs(milliGrams - Math.round(milliGrams)) < 1e-7;
}

export function quantityToMilli(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > Number.MAX_SAFE_INTEGER / 1000) return null;
  const milli = Math.round(quantity * 1000);
  return Number.isSafeInteger(milli) && Math.abs(quantity * 1000 - milli) < 1e-7 ? milli : null;
}

export function multiplyFilsByQuantity(unitPriceFils: number, quantity: number) {
  const milli = quantityToMilli(quantity);
  if (!Number.isSafeInteger(unitPriceFils) || unitPriceFils < 0 || milli === null) {
    throw new Error("Invalid unit price or quantity.");
  }
  const total = Math.round(unitPriceFils * milli / 1000);
  if (!Number.isSafeInteger(total)) throw new Error("Calculated amount is too large.");
  return total;
}

export function formatQuantity(quantity: number, type: Product["type"], lang: "en" | "ar") {
  const number = new Intl.NumberFormat(lang === "ar" ? "ar-KW" : "en-KW", {
    maximumFractionDigits: type === "metal" ? 3 : 0,
  }).format(quantity);
  return type === "metal" ? `${number} g` : number;
}

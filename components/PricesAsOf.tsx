"use client";
import type { Product } from "@/lib/product-types";
import { useStore } from "@/lib/store";

export function PricesAsOf({ products }: { products: Product[] }) {
  const { t, lang } = useStore();
  if (!products.length) return null;
  const dates = products.map(product => product.priceUpdatedAt ? Date.parse(product.priceUpdatedAt) : NaN);
  const timestamp = Math.min(...dates);
  return <p className="mt-3 text-xs text-[var(--muted)]">
    {Number.isFinite(timestamp) ? <>
      {t.common.pricesAsOf}{" "}
      <time dateTime={new Date(timestamp).toISOString()}>{new Intl.DateTimeFormat(lang === "ar" ? "ar-KW" : "en-KW", {
        dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuwait",
      }).format(timestamp)}</time>
    </> : t.common.pricesUnavailable}
  </p>;
}

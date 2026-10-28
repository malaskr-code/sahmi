"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/product-types";
import { isMarketOpen } from "@/lib/market-hours";
import { useStore } from "@/lib/store";

export function MarketStatus({ products, stacked = false }: { products: Product[]; stacked?: boolean }) {
  const { lang } = useStore();
  const metals = products.filter(product => product.type === "metal");
  const shares = products.filter(product => product.type !== "metal");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const metalStatus = metals.length ? (() => {
    const updatedAt = metals.reduce<number | null>((oldest, product) => {
      const timestamp = product.priceUpdatedAt ? Date.parse(product.priceUpdatedAt) : NaN;
      if (!Number.isFinite(timestamp)) return oldest;
      return oldest === null || timestamp < oldest ? timestamp : oldest;
    }, null);
    const age = updatedAt === null || now === null ? null : Math.max(0, Math.floor((now - updatedAt) / 60_000));
    const status = lang === "ar"
      ? age === null ? "سوق المعادن يعمل على مدار الساعة" : `سوق المعادن يعمل على مدار الساعة · تم التحديث قبل ${new Intl.NumberFormat("ar-KW").format(age)} دقيقة`
      : age === null ? "Metals market open 24/7" : `Metals market open 24/7 · updated ${age} min ago`;
    return status;
  })() : null;
  const updatedAt = shares.reduce<number | null>((oldest, product) => {
    const timestamp = product.priceUpdatedAt ? Date.parse(product.priceUpdatedAt) : NaN;
    if (!Number.isFinite(timestamp)) return oldest;
    return oldest === null || timestamp < oldest ? timestamp : oldest;
  }, null);
  const open = now === null ? true : isMarketOpen(new Date(now));
  const age = updatedAt === null || now === null ? null : Math.max(0, Math.floor((now - updatedAt) / 60_000));

  const status = !shares.length ? null : lang === "ar"
    ? open
      ? age === null ? "السوق مفتوح · يتم تحديث الأسعار" : `السوق مفتوح · آخر تحديث قبل ${new Intl.NumberFormat("ar-KW").format(age)} دقيقة`
      : "السوق مغلق · الأسعار المعروضة هي أسعار الإغلاق"
    : open
      ? age === null ? "Market open · updating prices" : `Market open · updated ${age} min ago`
      : "Market closed · showing closing prices";

  if (!metalStatus && !status) return null;
  return <div className={`mt-3 ${stacked ? "flex flex-col gap-2" : "space-y-1"}`}>
    {status && <p className="inline-flex w-fit items-center gap-2 text-xs text-[var(--muted)]" aria-live="polite">
      <span className={`h-2 w-2 shrink-0 rounded-full ${open ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden="true" />
      {status}
    </p>}
    {metalStatus && <p className="inline-flex w-fit items-center gap-2 text-xs text-[var(--muted)]" aria-live="polite">
      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
      {metalStatus}
    </p>}
  </div>;
}

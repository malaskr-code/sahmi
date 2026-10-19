"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import { CARD_THEME_IDS, type CardThemeId } from "@/data/cardThemes";
import { CardThemePreview } from "@/components/CardThemePreview";
import { formatKwd, SERVICE_FEE } from "@/lib/products";
import { useProducts } from "@/lib/use-products";
import { ProductFeedback } from "@/components/ProductFeedback";
import { PricesAsOf } from "@/components/PricesAsOf";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useStore } from "@/lib/store";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { product, loading, error, notFound, retry } = useProducts(params.id);
  const { t, lang, gift, setGift } = useStore();
  const [mode, setMode] = useState<"shares" | "budget">("shares");
  const [shares, setShares] = useState(10);
  const [sharesPicked, setSharesPicked] = useState(false);
  const [custom, setCustom] = useState("");
  const [budget, setBudget] = useState("");
  const [theme, setTheme] = useState<CardThemeId | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (gift && gift.product.id === product?.id) {
      setTheme(gift.theme);
      setShares(gift.shares);
      setSharesPicked(true);
    } else {
      setTheme(null);
      setSharesPicked(false);
    }
  }, [gift, product?.id]);

  const count =
    mode === "shares"
      ? custom
        ? Math.max(0, Math.floor(Number(custom) || 0))
        : shares
      : product
        ? Math.max(0, Math.floor((Number(budget) || 0) / product.price))
        : 0;
  const subtotal = product ? count * product.price : 0;
  const total = subtotal + SERVICE_FEE;
  const hasPickedAmount = mode === "shares" ? sharesPicked : Number(budget) > 0;
  const name = product ? (lang === "ar" ? product.nameAr : product.name) : "";
  const currency = (amount: number) => formatKwd(amount, lang);

  const add = () => {
    if (!product || count < 1 || !hasPickedAmount || !theme) return;
    if (gift) {
      setConfirm(true);
      return;
    }
    setGift({ product, shares: count, theme });
    setAdded(true);
  };

  const finishReplace = () => {
    if (product && theme) setGift({ product, shares: count, theme });
    setConfirm(false);
    setAdded(true);
  };

  if (loading || error || !product) {
    return (
      <div className="page-shell min-h-[55vh] pt-16">
        <Link href="/products" className="outline-button">
          <ArrowLeft size={16} />
          {t.product.back}
        </Link>
        <ProductFeedback loading={loading} error={error} notFound={notFound} retry={retry} />
      </div>
    );
  }

  return (
    <div className="page-shell min-h-[60vh] pt-8 md:pt-12">
      <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--gold-dark)]">
        <ArrowLeft size={16} />
        {t.product.back}
      </Link>
      <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_420px]">
        <div className="card h-fit overflow-hidden p-7 md:p-10">
          <CompanyLogo src={product.image} name={name} className="h-16 w-16 rounded-xl"/>
          <p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[var(--gold-dark)]">
            {lang === "ar" ? product.sectorAr : t.common.sectors[product.sector as keyof typeof t.common.sectors] ?? product.sector}
          </p>
          <h1 className="font-display mt-3 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">{name}</h1>
          <p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">
            {lang === "ar" ? product.descriptionAr : product.description}
          </p>
          <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-[var(--line)] pt-6">
            <div>
              <p className="text-xs text-[var(--muted)]">{t.common.samplePrice}</p>
              <p className="mt-1 text-2xl font-bold">{currency(product.price)}</p>
            </div>
            <p className={`text-sm font-semibold ${product.change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
              {product.change >= 0 ? "+" : ""}
              {product.change.toFixed(2)}% <span className="text-[var(--muted)]">{t.common.change}</span>
            </p>
          </div>
          <PricesAsOf products={[product]} />
        </div>

        <aside id="gift-builder" className="card h-fit p-6 md:p-7">
          <h2 className="font-display text-2xl font-semibold">{t.product.calculator}</h2>
          <div className="mt-5 grid grid-cols-2 rounded-full bg-[var(--soft)] p-1">
            <button
              onClick={() => setMode("shares")}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${mode === "shares" ? "bg-[var(--paper)] shadow-sm" : ""}`}
            >
              {t.product.byShares}
            </button>
            <button
              onClick={() => setMode("budget")}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${mode === "budget" ? "bg-[var(--paper)] shadow-sm" : ""}`}
            >
              {t.product.byBudget}
            </button>
          </div>

          {mode === "shares" ? (
            <div className="mt-5">
              <label className="text-sm font-semibold">{t.product.quantity}</label>
              <div className="mt-3 flex gap-2">
                {[10, 50, 100].map((quantity) => (
                  <button
                    key={quantity}
                    onClick={() => {
                      setShares(quantity);
                      setCustom("");
                      setSharesPicked(true);
                    }}
                    className={`flex-1 rounded-full border px-2 py-2.5 text-sm font-semibold ${
                      shares === quantity && !custom ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-[var(--line)]"
                    }`}
                  >
                    {quantity}
                  </button>
                ))}
              </div>
              <label htmlFor="custom-shares" className="mt-4 block text-xs text-[var(--muted)]">
                {t.product.custom}
              </label>
              <div className="mt-2 flex items-center rounded-lg border border-[var(--line)] px-3">
                <button
                  aria-label={t.common.decrease}
                  onClick={() => {
                    setCustom("");
                    setShares((value) => Math.max(1, value - 1));
                    setSharesPicked(true);
                  }}
                >
                  <Minus size={15} />
                </button>
                <input
                  id="custom-shares"
                  type="number"
                  min="1"
                  value={custom || shares}
                  onChange={(event) => {
                    setCustom(event.target.value);
                    setSharesPicked(true);
                    if (!event.target.value) setShares(10);
                  }}
                  className="w-full bg-transparent p-3 text-center outline-none"
                />
                <button
                  aria-label={t.common.increase}
                  onClick={() => {
                    setCustom("");
                    setShares((value) => value + 1);
                    setSharesPicked(true);
                  }}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <label htmlFor="gift-budget" className="text-sm font-semibold">{t.product.budget}</label>
              <div className="mt-2 flex items-center rounded-lg border border-[var(--line)] px-3">
                <input
                  id="gift-budget"
                  type="number"
                  min="0"
                  step="0.001"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  placeholder="0.000"
                  className="w-full bg-transparent p-3 outline-none"
                />
                <span className="text-xs text-[var(--muted)]">{t.common.kwd}</span>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {t.product.shares}: <strong className="text-[var(--ink)]">{count}</strong>
              </p>
            </div>
          )}

          {hasPickedAmount && (
            <fieldset className="mt-6 border-t border-[var(--line)] pt-5">
              <legend className="mb-3 text-sm font-semibold">{t.product.themeTitle}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {CARD_THEME_IDS.map((themeId) => (
                  <button
                    key={themeId}
                    type="button"
                    aria-pressed={theme === themeId}
                    onClick={() => setTheme(themeId)}
                    className={`rounded-xl border p-2 text-start transition hover:-translate-y-0.5 ${
                      theme === themeId
                        ? "border-[var(--gold)] bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]"
                        : "border-[var(--line)] hover:border-[var(--gold)]/60"
                    }`}
                  >
                    <CardThemePreview theme={themeId} />
                    <span className="mt-2 flex items-center justify-between gap-1 text-xs font-semibold">
                      {t.product.themeNames[themeId]}
                      {theme === themeId && <Check size={14} className="shrink-0 text-[var(--gold-dark)]" />}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-6 space-y-3 border-t border-[var(--line)] pt-5 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted)]">{t.product.shares}</span><span>{count}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">{t.product.subtotal}</span><span>{currency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">{t.product.fee}</span><span>{currency(SERVICE_FEE)}</span></div>
            <div className="flex justify-between border-t border-[var(--line)] pt-3 text-base font-bold">
              <span>{t.product.total}</span><span>{currency(total)}</span>
            </div>
          </div>
          {count < 1 && (custom !== "" || budget !== "") && (
            <p role="alert" className="mt-3 text-xs font-medium text-[var(--red)]">{t.product.outOfRange}</p>
          )}
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{t.product.feeNote}</p>
          <button
            disabled={count < 1 || !hasPickedAmount || !theme}
            onClick={add}
            className="gold-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added ? <><Check size={17} />{t.product.added}</> : t.product.add}
          </button>
        </aside>
      </div>

      {confirm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 p-5">
          <div className="card w-full max-w-md p-7">
            <h2 className="font-display mt-3 text-2xl font-semibold">{t.product.replaceTitle}</h2>
            <p className="mt-3 leading-6 text-[var(--muted)]">{t.product.replaceText}</p>
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setConfirm(false)} className="outline-button">{t.product.cancel}</button>
              <button onClick={finishReplace} className="gold-button">{t.product.replace}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

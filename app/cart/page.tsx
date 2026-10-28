"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { formatKwd, SERVICE_FEE } from "@/lib/products";
import { CardThemePreview } from "@/components/CardThemePreview";
import { useStore } from "@/lib/store";
import { useProducts } from "@/lib/use-products";
import { ProductFeedback } from "@/components/ProductFeedback";
import { CompanyLogo } from "@/components/CompanyLogo";
import { sectorLabel } from "@/data/sectors";

export default function CartPage() {
  const { t, lang, gift, setGift, ready } = useStore();
  const { products, loading, error, retry } = useProducts();
  const currency = (amount: number) => formatKwd(amount, lang);

  if (!ready || !gift) {
    return <div className="page-shell min-h-[55vh] pt-12 md:pt-16">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.cart.title}</p>
      <h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">{gift ? t.cart.title : t.cart.emptyTitle}</h1>
      {!gift && <><p className="mt-3 text-[var(--muted)]">{t.cart.emptyText}</p><div className="card mt-8 flex min-h-72 flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><ShoppingBag size={24}/></div><p className="mt-5 max-w-sm leading-6 text-[var(--muted)]">{t.cart.emptyText}</p><Link href="/products" className="gold-button mt-6">{t.cart.browse}<ArrowRight size={16}/></Link></div></>}
    </div>;
  }

  const cartItems = gift.items.map(item => ({
    ...item,
    product: products.find(product => product.id === item.product.id) ?? item.product,
  }));
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.shares, 0);

  function updateShares(productId: string, shares: number) {
    if (!gift) return;
    setGift({ ...gift, items: gift.items.map(item => item.product.id === productId ? { ...item, shares } : item) });
  }

  function removeCompany(productId: string) {
    if (!gift) return;
    const items = gift.items.filter(item => item.product.id !== productId);
    setGift(items.length ? { ...gift, items } : null);
  }

  return <main className="page-shell min-h-[55vh] pt-12 md:pt-16">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.cart.title}</p>
    <h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">{t.cart.title}</h1>
    <p className="mt-3 text-[var(--muted)]">{t.cart.subtitle}</p>
    {error && !products.length && <ProductFeedback loading={loading} error={error} retry={retry}/>}

    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        {cartItems.map(({ product, shares }) => {
          const name = lang === "ar" ? product.nameAr : product.name;
          return <article key={product.id} className="card p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
              <div className="flex min-w-0 items-center gap-4">
                <CompanyLogo src={product.image} name={name} logoBg={product.logoBg} className="h-14 w-14 shrink-0 rounded-xl"/>
                <div className="min-w-0">
                  <span className="pill">{sectorLabel(product.sectorKey, lang)}</span>
                  <h2 className="mt-2 font-semibold">{name}</h2>
                  <p dir="ltr" className="mt-1 text-xs text-[var(--muted)]">{product.ticker}</p>
                </div>
              </div>
              <button type="button" onClick={() => removeCompany(product.id)} aria-label={`${t.cart.removeCompany}: ${name}`} className="outline-button !px-3 !py-2 text-xs text-[var(--red)]"><Trash2 size={14}/>{t.cart.removeCompany}</button>
            </div>
            <div className="grid gap-5 pt-5 sm:grid-cols-3">
              <div><p className="text-xs text-[var(--muted)]">{t.cart.price}</p><p className="mt-1 font-semibold">{currency(product.price)}</p></div>
              <div>
                <p className="text-xs text-[var(--muted)]">{t.cart.shares}</p>
                <div className="mt-1 flex w-fit items-center gap-4 rounded-full border border-[var(--line)] px-2 py-1">
                  <button type="button" aria-label={t.common.decrease} disabled={shares <= 1} onClick={() => updateShares(product.id, Math.max(1, shares - 1))} className="disabled:opacity-40"><Minus size={14}/></button>
                  <span className="min-w-5 text-center font-semibold">{shares}</span>
                  <button type="button" aria-label={t.common.increase} onClick={() => updateShares(product.id, shares + 1)}><Plus size={14}/></button>
                </div>
              </div>
              <div><p className="text-xs text-[var(--muted)]">{t.cart.subtotal}</p><p className="mt-1 font-semibold">{currency(shares * product.price)}</p></div>
            </div>
          </article>;
        })}
        <section className="card flex flex-wrap items-center gap-4 p-5 md:p-6">
          <div className="w-24 shrink-0"><CardThemePreview theme={gift.theme}/></div>
          <div><p className="text-xs text-[var(--muted)]">{t.cart.theme}</p><p className="mt-1 font-semibold">{t.product.themeNames[gift.theme]}</p></div>
          <Link href={`/products/${cartItems[0]?.product.id ?? ""}#gift-builder`} className="ms-auto text-sm font-semibold text-[var(--gold-dark)] underline underline-offset-4">{t.cart.changeTheme}</Link>
        </section>
      </section>

      <aside className="card h-fit p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl font-semibold">{t.cart.total}</h2>
        <div className="mt-5 space-y-4 border-b border-[var(--line)] pb-5 text-sm">
          {cartItems.map(({ product, shares }) => <div key={product.id} className="flex justify-between gap-3"><span className="min-w-0 truncate text-[var(--muted)]">{lang === "ar" ? product.nameAr : product.name} · {shares}</span><span className="shrink-0">{currency(shares * product.price)}</span></div>)}
          <div className="flex justify-between"><span className="text-[var(--muted)]">{t.cart.subtotal}</span><span>{currency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">{t.cart.fee}</span><span>{currency(SERVICE_FEE)}</span></div>
        </div>
        <div className="flex justify-between py-5 text-base font-bold"><span>{t.cart.total}</span><span>{currency(subtotal + SERVICE_FEE)}</span></div>
        <Link href="/checkout" className="gold-button w-full">{t.cart.checkout}<ArrowRight size={16}/></Link>
      </aside>
    </div>
  </main>;
}

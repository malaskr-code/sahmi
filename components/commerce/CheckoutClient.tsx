"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Clock3, CreditCard, Minus, Plus, WalletCards } from "lucide-react";
import { CARD_THEME_IDS } from "@/data/cardThemes";
import type { CardThemeId } from "@/data/cardThemes";
import { useStore } from "@/lib/store";
import { getProduct } from "@/lib/products";
import { CardThemePreview } from "@/components/CardThemePreview";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useCommerce, PageIntro, LoadingPanel, ErrorPanel, responseError } from "./shared";

type Mode = "wallet" | "card" | "both" | "demo";
type Quote = { shares: number; unitPrice: number; subtotal: number; fee: number; wallet: number; card: number; total: number; lockedAt: string; lockExpiresAt: string };

export default function CheckoutClient() {
  const { gift, setGift, lang, t } = useStore();
  const { copy, currency } = useCommerce();
  const router = useRouter();
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState<Mode>("both");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteToken, setQuoteToken] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [refreshingPrice, setRefreshingPrice] = useState(false);
  const [priceFresh, setPriceFresh] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productLogoBg, setProductLogoBg] = useState("#ffffff");
  const [productLoading, setProductLoading] = useState(false);

  const productId = gift?.product.id ?? "";
  const shares = gift?.shares ?? 0;
  const theme = gift?.theme ?? "general";
  const themeNames = t.product.themeNames;

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setProductLoading(true);
    setProductImage(gift?.product.image ?? "");
    setProductLogoBg(gift?.product.logoBg ?? "#ffffff");
    getProduct(productId).then(product => {
      if (active) {
        setProductName(lang === "ar" ? product.nameAr : product.name);
        setProductImage(product.image);
        setProductLogoBg(product.logoBg);
      }
    }).catch(() => {
      if (active) {
        setProductName(lang === "ar" ? gift?.product.nameAr ?? "" : gift?.product.name ?? "");
        setProductImage(gift?.product.image ?? "");
        setProductLogoBg(gift?.product.logoBg ?? "#ffffff");
      }
    }).finally(() => { if (active) setProductLoading(false); });
    return () => { active = false; };
  }, [productId, lang, gift?.product.name, gift?.product.nameAr, gift?.product.image, gift?.product.logoBg]);

  const getQuote = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    if (!productId || shares < 1) return false;
    setQuoting(true); setQuote(null); setQuoteError(""); setQuoteToken("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", credentials: "same-origin", signal,
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({ action: "quote", productId, shares, payment }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.quote || !body?.quoteToken) throw new Error(responseError(copy, body, copy.checkout.error));
      setQuote(body.quote);
      setQuoteToken(body.quoteToken);
      return true;
    } catch (error) {
      if (signal?.aborted) return false;
      setQuote(null);
      setQuoteError(error instanceof Error ? error.message : copy.checkout.error);
      return false;
    } finally {
      if (!signal?.aborted) {
        setQuoting(false);
        setRefreshingPrice(false);
      }
    }
  }, [productId, shares, payment, lang, copy]);

  const refreshPriceAndQuote = useCallback(async () => {
    if (!productId) return;
    setRefreshingPrice(true); setPriceFresh(false); setQuote(null); setQuoteToken(""); setQuoteError("");
    const refreshed = await getQuote();
    setPriceFresh(refreshed);
  }, [productId, getQuote]);

  useEffect(() => {
    if (!productId || shares < 1) return;
    const controller = new AbortController();
    void getQuote(controller.signal);
    return () => controller.abort();
  }, [getQuote, productId, shares, payment]);

  useEffect(() => {
    if (!quote?.lockExpiresAt) return;
    const wait = new Date(quote.lockExpiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => { void refreshPriceAndQuote(); }, Math.max(0, wait));
    return () => window.clearTimeout(timer);
  }, [quote?.lockExpiresAt, refreshPriceAndQuote]);

  async function submitGift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitError("");
    if (!gift || !quoteToken || !quote || quoting || refreshingPrice) {
      setSubmitError(quoteError || copy.checkout.refreshing); return;
    }
    if (!recipientName.trim()) { setSubmitError(copy.checkout.invalidRecipient); return; }
    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({
          action: "gift", productId, shares, recipientName: recipientName.trim(),
          message: message.trim(), theme, payment, quoteToken,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const shouldRefresh = body?.code === "walletBalanceChanged" || body?.code === "priceQuoteExpired";
        if (shouldRefresh) await refreshPriceAndQuote();
        throw new Error(responseError(copy, body, copy.checkout.error));
      }
      if (body?.url) { window.sessionStorage.setItem("sahmi-checkout-kind", "gift"); window.location.assign(body.url); return; }
      if (body?.successUrl) { router.push(body.successUrl); return; }
      throw new Error(copy.checkout.error);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.checkout.error);
      setPending(false);
      if (!quoteToken) void getQuote();
    }
  }

  if (!gift) return <main className="page-shell min-h-[60vh] py-12 md:py-20"><div className="card mx-auto max-w-2xl p-8 text-center md:p-14"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><WalletCards size={24}/></span><h1 className="font-display mt-5 text-3xl font-semibold">{copy.checkout.noGift}</h1><p className="mt-3 text-sm text-[var(--muted)]">{copy.checkout.noGift}</p><Link href="/products" className="gold-button mt-7">{copy.checkout.browse}<ArrowRight size={16}/></Link></div></main>;

  if (productLoading && !productName) return <main className="page-shell py-12"><LoadingPanel text={copy.checkout.refreshing}/></main>;

  return <main className="page-shell min-h-[65vh] py-10 md:py-16">
    <div className="mb-5"><Link href="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--gold-dark)]"><ArrowLeft size={15}/>{copy.checkout.backToCart}</Link></div>
    <PageIntro eyebrow={copy.checkout.eyebrow} title={copy.checkout.title} subtitle={copy.checkout.subtitle}/>
    <form onSubmit={submitGift} className="grid items-start gap-6 lg:grid-cols-[1fr_390px]">
      <div className="space-y-5">
        <section className="card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
            <div className="flex min-w-0 items-center gap-3"><CompanyLogo src={productImage} name={productName || gift.product.name} logoBg={productLogoBg} className="h-14 w-14 rounded-xl"/><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--gold-dark)]">{gift.product.ticker}</p><h2 className="font-display mt-1 text-2xl font-semibold">{productName || gift.product.name}</h2></div></div>
            <div className="flex items-center gap-3 rounded-full border border-[var(--line)] px-2 py-1"><button type="button" aria-label={t.common.decrease} disabled={shares <= 1} onClick={() => { setQuote(null); setQuoteToken(""); setGift({ ...gift, shares: Math.max(1, shares - 1) }); }} className="rounded-full p-2 transition hover:bg-[var(--soft)] disabled:opacity-40"><Minus size={14}/></button><span className="min-w-5 text-center text-sm font-semibold">{shares}</span><button type="button" aria-label={t.common.increase} onClick={() => { setQuote(null); setQuoteToken(""); setGift({ ...gift, shares: shares + 1 }); }} className="rounded-full p-2 transition hover:bg-[var(--soft)]"><Plus size={14}/></button></div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-[132px_1fr]">
            <CardThemePreview theme={theme} className="w-full"/>
            <div className="flex flex-col justify-center"><p className="text-xs text-[var(--muted)]">{copy.checkout.theme}</p><p className="mt-1 font-semibold">{themeNames[theme]}</p><div className="mt-3 flex flex-wrap gap-2">{CARD_THEME_IDS.map(item => <button type="button" key={item} aria-label={themeNames[item]} aria-pressed={theme === item} onClick={() => setGift({ ...gift, theme: item as CardThemeId })} className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-[var(--gold)] ${theme === item ? "border-[var(--gold-dark)] bg-[var(--soft)] text-[var(--gold-dark)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--gold)]"}`}>{themeNames[item]}</button>)}</div></div>
          </div>
        </section>
        <section className="card p-5 sm:p-7">
          <h2 className="font-display text-2xl font-semibold">{copy.checkout.detailsTitle}</h2>
          <label htmlFor="recipient-name" className="mb-2 mt-6 block text-xs font-semibold">{copy.checkout.recipientName}</label>
          <input id="recipient-name" required maxLength={120} value={recipientName} onChange={event => setRecipientName(event.target.value)} className="w-full rounded-xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm outline-none transition focus:border-[var(--gold-dark)] focus:ring-2 focus:ring-[var(--gold)]/20" autoComplete="name"/>
          <label htmlFor="gift-message" className="mb-2 mt-5 block text-xs font-semibold">{copy.checkout.message}</label>
          <textarea id="gift-message" maxLength={500} rows={4} placeholder={copy.checkout.messagePlaceholder} value={message} onChange={event => setMessage(event.target.value)} className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--gold-dark)] focus:ring-2 focus:ring-[var(--gold)]/20"/>
        </section>
        <section className="card p-5 sm:p-7">
          <h2 className="font-display text-2xl font-semibold">{copy.checkout.payment}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.checkout.paymentHelp}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(["both", "wallet", "card", "demo"] as Mode[]).map(mode => <label key={mode} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${payment === mode ? "border-[var(--gold-dark)] bg-[var(--gold)]/10" : "border-[var(--line)] hover:bg-[var(--soft)]"}`}><input type="radio" name="payment" value={mode} checked={payment === mode} onChange={() => { setQuote(null); setQuoteToken(""); setPayment(mode); }} className="mt-1 accent-[var(--gold-dark)]"/><span className="min-w-0"><span className="flex items-center gap-2 font-semibold">{mode === "card" ? <CreditCard size={15}/> : <WalletCards size={15}/>}<span>{mode === "demo" ? copy.checkout.generateCode : copy.checkout[mode]}</span></span><span className="mt-1 block text-[11px] leading-5 text-[var(--muted)]">{mode === "demo" ? copy.checkout.generateCodeNote : mode === "both" ? copy.checkout.fromWallet : mode === "wallet" ? copy.wallet.available : copy.checkout.byCard}</span></span></label>)}
          </div>
        </section>
      </div>
      <aside className="card sticky top-28 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">{copy.checkout.total}</h2><span className="flex items-center gap-1.5 rounded-full bg-[var(--soft)] px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)]"><Clock3 size={13}/>{copy.checkout.priceLock}</span></div>
        <div aria-live="polite" className="mt-6 space-y-4 border-b border-[var(--line)] pb-5 text-sm">
          <div className="flex justify-between gap-4"><span className="text-[var(--muted)]">{copy.checkout.subtotal}{quote && !quoting && <span dir="ltr" className="mt-1 block text-[10px]">{quote.shares} × {currency(quote.unitPrice)}</span>}</span><span>{quoting ? "—" : quote ? currency(quote.subtotal) : "—"}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--muted)]">{copy.checkout.fee}</span><span>{quoting ? "—" : quote ? currency(quote.fee) : "—"}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--muted)]">{copy.checkout.fromWallet}</span><span>{quoting ? "—" : quote ? currency(quote.wallet) : "—"}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--muted)]">{copy.checkout.byCard}</span><span>{quoting ? "—" : quote ? currency(quote.card) : "—"}</span></div>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-5"><span className="font-semibold">{copy.checkout.total}</span><strong className="font-display text-2xl">{quoting ? "—" : quote ? currency(quote.total) : "—"}</strong></div>
        <p className="text-xs leading-5 text-[var(--muted)]">{copy.checkout.feeNote}</p>
        {(quoting || refreshingPrice) && <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]" role="status"><span className="h-4 w-4 animate-pulse rounded-full bg-[var(--gold)]/50"/>{refreshingPrice ? copy.checkout.refreshing : copy.checkout.refreshing}</p>}
        {priceFresh && <p className="mt-3 flex items-center gap-2 text-xs text-[var(--green)]"><BadgeCheck size={15}/>{copy.checkout.priceUpdated}</p>}
        {quoteError && <p className="mt-4 text-sm text-[var(--red)]" role="alert">{quoteError}</p>}
        <button type="button" onClick={refreshPriceAndQuote} disabled={refreshingPrice || quoting} className="mt-4 w-full text-xs font-semibold text-[var(--gold-dark)] underline underline-offset-4 disabled:opacity-50">{copy.checkout.reloadProduct}</button>
        {submitError && <p className="mt-4 text-sm leading-6 text-[var(--red)]" role="alert">{submitError}</p>}
        <button type="submit" disabled={pending || quoting || refreshingPrice || !quoteToken} className="gold-button mt-5 w-full disabled:cursor-wait disabled:opacity-55">{pending ? copy.checkout.paying : payment === "demo" ? copy.checkout.generateGiftCode : quote && quote.card === 0 ? copy.checkout.walletPay : copy.checkout.pay}<ArrowRight size={16}/></button>
        <p className="mt-3 text-center text-[10px] leading-5 text-[var(--muted)]">{copy.checkout.feeNote}</p>
      </aside>
    </form>
  </main>;
}

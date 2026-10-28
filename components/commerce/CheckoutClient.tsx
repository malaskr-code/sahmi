"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Clock3, CreditCard, Info, Minus, Plus, WalletCards } from "lucide-react";
import { CARD_THEME_IDS, type CardThemeId } from "@/data/cardThemes";
import type { Product } from "@/lib/product-types";
import { useStore } from "@/lib/store";
import { getProduct } from "@/lib/products";
import { CardThemePreview } from "@/components/CardThemePreview";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MarketStatus } from "@/components/MarketStatus";
import { useCommerce, PageIntro, LoadingPanel, responseError } from "./shared";
import { ExchangeRateAttribution } from "@/components/ExchangeRateAttribution";
import { formatQuantity } from "@/lib/metal-units";

type Mode = "wallet" | "card" | "demo";
type QuoteItem = { productId: string; shares: number; unitPrice: number; subtotal: number };
type Quote = { items: QuoteItem[]; subtotal: number; fee: number; wallet: number; card: number; total: number; lockedAt: string; lockExpiresAt: string };
type BuyNow = { productId: string; shares: number; theme: CardThemeId };
type CheckoutLine = { productId: string; shares: number; product?: Product };

export default function CheckoutClient({ buyNow }: { buyNow: BuyNow | null }) {
  const { gift, setGift, lang, t, ready } = useStore();
  const { copy, currency } = useCommerce();
  const router = useRouter();
  const buyNowKey = buyNow ? `${buyNow.productId}|${buyNow.shares}|${buyNow.theme}` : "";
  const [buyNowLines, setBuyNowLines] = useState<CheckoutLine[]>([]);
  const [theme, setTheme] = useState<CardThemeId>(buyNow?.theme ?? "general");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState<Mode>("card");
  const paymentTouched = useRef(false);
  const [walletAvailable, setWalletAvailable] = useState<number | null>(null);
  const [walletLoadError, setWalletLoadError] = useState(false);
  const [resolvedProducts, setResolvedProducts] = useState<Record<string, Product>>({});
  const [productLoading, setProductLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteToken, setQuoteToken] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [refreshingPrice, setRefreshingPrice] = useState(false);
  const [priceFresh, setPriceFresh] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const refreshWalletBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.available !== "number" || !Number.isFinite(body.available)) {
        throw new Error("Wallet balance unavailable.");
      }
      setWalletAvailable(body.available);
      setWalletLoadError(false);
      return true;
    } catch {
      setWalletAvailable(null);
      setWalletLoadError(true);
      return false;
    }
  }, []);

  useEffect(() => { void refreshWalletBalance(); }, [refreshWalletBalance]);

  useEffect(() => {
    if (buyNow) {
      setBuyNowLines([{ productId: buyNow.productId, shares: buyNow.shares }]);
      setTheme(buyNow.theme);
    } else if (gift) {
      setBuyNowLines([]);
      setTheme(gift.theme);
    } else {
      setBuyNowLines([]);
    }
  }, [buyNowKey, gift?.items, gift?.theme]);

  const lines = useMemo<CheckoutLine[]>(() => {
    if (buyNow) return buyNowLines.length ? buyNowLines : [{ productId: buyNow.productId, shares: buyNow.shares }];
    return gift?.items.map(item => ({ productId: item.product.id, shares: item.shares, product: item.product })) ?? [];
  }, [buyNowKey, buyNowLines, gift?.items]);
  const requestItems = useMemo(() => lines.map(({ productId, shares }) => ({ productId, shares })), [lines]);
  const itemsSignature = JSON.stringify(requestItems);
  const productKey = [...new Set(requestItems.map(item => item.productId))].join("\u001f");

  useEffect(() => {
    const ids = productKey ? productKey.split("\u001f") : [];
    if (!ids.length) { setProductLoading(false); return; }
    let active = true;
    setProductLoading(true);
    Promise.all(ids.map(async id => {
      try { return [id, await getProduct(id)] as const; }
      catch { return null; }
    })).then(results => {
      if (!active) return;
      setResolvedProducts(current => ({
        ...current,
        ...Object.fromEntries(results.filter((result): result is readonly [string, Product] => result !== null)),
      }));
    }).finally(() => { if (active) setProductLoading(false); });
    return () => { active = false; };
  }, [productKey]);

  const products = useMemo(() => lines.map(line => resolvedProducts[line.productId] ?? line.product).filter((product): product is Product => Boolean(product)), [lines, resolvedProducts]);
  const themeNames = t.product.themeNames;

  const getQuote = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    if (!requestItems.length || requestItems.some(item => item.shares <= 0)) return false;
    setQuoting(true); setQuote(null); setQuoteError(""); setQuoteToken("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", credentials: "same-origin", signal,
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({ action: "quote", items: JSON.parse(itemsSignature), payment }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.quote || !body?.quoteToken) {
        if (body?.code === "insufficientWallet") {
          await refreshWalletBalance();
          paymentTouched.current = true;
          setPayment("card");
        }
        throw new Error(responseError(copy, body, copy.checkout.error));
      }
      setQuote(body.quote);
      setQuoteToken(body.quoteToken);
      return true;
    } catch (error) {
      if (signal?.aborted) return false;
      setQuote(null);
      setQuoteError(error instanceof Error ? error.message : copy.checkout.error);
      return false;
    } finally {
      if (!signal?.aborted) { setQuoting(false); setRefreshingPrice(false); }
    }
  }, [itemsSignature, lang, payment, copy, requestItems.length, refreshWalletBalance]);

  const refreshPriceAndQuote = useCallback(async () => {
    if (!requestItems.length) return;
    setRefreshingPrice(true); setPriceFresh(false); setQuote(null); setQuoteToken(""); setQuoteError("");
    setPriceFresh(await getQuote());
  }, [getQuote, requestItems.length]);

  useEffect(() => {
    if (!requestItems.length) return;
    const controller = new AbortController();
    void getQuote(controller.signal);
    return () => controller.abort();
  }, [getQuote, itemsSignature]);

  useEffect(() => {
    if (!quote?.lockExpiresAt) return;
    const wait = new Date(quote.lockExpiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => { void refreshPriceAndQuote(); }, Math.max(0, wait));
    return () => window.clearTimeout(timer);
  }, [quote?.lockExpiresAt, refreshPriceAndQuote]);

  useEffect(() => {
    if (paymentTouched.current || walletAvailable === null || !quote) return;
    const initialPayment: Mode = walletAvailable >= quote.total ? "wallet" : "card";
    paymentTouched.current = true;
    if (payment !== initialPayment) setPayment(initialPayment);
  }, [payment, quote?.total, walletAvailable]);

  function updateShares(productId: string, shares: number) {
    setQuote(null); setQuoteToken(""); setSubmitError("");
    if (buyNow) {
      setBuyNowLines(current => current.map(item => item.productId === productId ? { ...item, shares } : item));
    } else if (gift) {
      setGift({ ...gift, items: gift.items.map(item => item.product.id === productId ? { ...item, shares } : item) });
    }
  }

  function changeLineQuantity(line: CheckoutLine, delta: number) {
    const product = resolvedProducts[line.productId] ?? line.product;
    const next = product?.type === "metal"
      ? Math.max(0.001, Math.round((line.shares + delta) * 1000) / 1000)
      : Math.max(1, line.shares + delta);
    updateShares(line.productId, next);
  }

  function updateTheme(value: CardThemeId) {
    setTheme(value);
    if (!buyNow && gift) setGift({ ...gift, theme: value });
  }

  async function submitGift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitError("");
    if ((!buyNow && !gift) || !requestItems.length || !quoteToken || !quote || quoting || refreshingPrice) {
      setSubmitError(quoteError || copy.checkout.refreshing); return;
    }
    if (!recipientName.trim()) { setSubmitError(copy.checkout.invalidRecipient); return; }
    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({
          action: "gift", items: JSON.parse(itemsSignature), recipientName: recipientName.trim(),
          message: message.trim(), theme, payment, quoteToken,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const shouldRefresh = body?.code === "walletBalanceChanged" || body?.code === "priceQuoteExpired";
        if (body?.code === "insufficientWallet") {
          await refreshWalletBalance();
          paymentTouched.current = true;
          setPayment("card");
        }
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

  if (!ready && !buyNow) return <main className="page-shell py-12"><LoadingPanel text={copy.checkout.refreshing}/></main>;
  if (!lines.length) return <main className="page-shell min-h-[60vh] py-12 md:py-20"><div className="card mx-auto max-w-2xl p-8 text-center md:p-14"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><WalletCards size={24}/></span><h1 className="font-display mt-5 text-3xl font-semibold">{copy.checkout.noGift}</h1><p className="mt-3 text-sm text-[var(--muted)]">{copy.checkout.noGift}</p><Link href="/products" className="gold-button mt-7">{copy.checkout.browse}<ArrowRight size={16}/></Link></div></main>;
  if (productLoading && !products.length) return <main className="page-shell py-12"><LoadingPanel text={copy.checkout.refreshing}/></main>;

  const backHref = buyNow ? `/products/${encodeURIComponent(buyNow.productId)}` : "/cart";
  return <main className="page-shell checkout-page min-h-[65vh]">
    <div className="mb-5"><Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--gold-dark)]"><ArrowLeft size={15}/>{buyNow ? copy.checkout.backToProduct : copy.checkout.backToCart}</Link></div>
    <PageIntro eyebrow={copy.checkout.eyebrow} title={copy.checkout.title} subtitle={copy.checkout.subtitle}/>
     <MarketStatus products={products}/>
     {products.some(product => product.type === "metal") && <ExchangeRateAttribution />}
    <form onSubmit={submitGift} className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_390px]">
      <div className="space-y-5">
        <section className="card p-5 sm:p-7">
          <h2 className="font-display mb-5 text-2xl font-semibold">{copy.checkout.detailsTitle}</h2>
          <div className="space-y-4">
            {lines.map(line => {
              const product = resolvedProducts[line.productId] ?? line.product;
              const name = product ? lang === "ar" ? product.nameAr : product.name : line.productId;
              const unitPrice = quote?.items.find(item => item.productId === line.productId)?.unitPrice ?? product?.price;
              const quantityLabel = product?.type === "metal" ? lang === "ar" ? "غرامات" : "Grams" : t.product.shares;
              const formattedQuantity = product ? formatQuantity(line.shares, product.type, lang) : String(line.shares);
              return <article key={line.productId} className="rounded-2xl border border-[var(--line)] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <CompanyLogo src={product?.image ?? ""} name={name} logoBg={product?.logoBg ?? "#ffffff"} className="h-14 w-14 shrink-0 rounded-xl"/>
                    <div className="min-w-0"><p dir="ltr" className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--gold-dark)]">{product?.ticker ?? line.productId}</p><h3 className="font-display mt-1 truncate text-xl font-semibold">{name}</h3></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border border-[var(--line)] px-2 py-1">
                    <button type="button" aria-label={t.common.decrease} disabled={line.shares <= (product?.type === "metal" ? 0.001 : 1)} onClick={() => changeLineQuantity(line, product?.type === "metal" ? -0.001 : -1)} className="rounded-full p-2 transition hover:bg-[var(--soft)] disabled:opacity-40"><Minus size={14}/></button>
                    <span className="min-w-5 text-center text-sm font-semibold">{formattedQuantity}</span>
                    <button type="button" aria-label={t.common.increase} onClick={() => changeLineQuantity(line, product?.type === "metal" ? 0.001 : 1)} className="rounded-full p-2 transition hover:bg-[var(--soft)]"><Plus size={14}/></button>
                  </div>
                </div>
                <div className="mt-4 flex justify-between gap-4 border-t border-[var(--line)] pt-3 text-sm">
                  <span dir="ltr" className="text-[var(--muted)]">{formattedQuantity} × {unitPrice === undefined ? "—" : currency(unitPrice)}{product?.type === "metal" ? lang === "ar" ? " / غ" : " / g" : ""} <span className="sr-only">{quantityLabel}</span></span>
                  <strong>{quote?.items.find(item => item.productId === line.productId) ? currency(quote.items.find(item => item.productId === line.productId)!.subtotal) : "—"}</strong>
                </div>
              </article>;
            })}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-[132px_1fr]">
            <CardThemePreview theme={theme} className="w-full"/>
            <div className="flex flex-col justify-center"><p className="text-xs text-[var(--muted)]">{copy.checkout.theme}</p><p className="mt-1 font-semibold">{themeNames[theme]}</p><div className="mt-3 flex flex-wrap gap-2">{CARD_THEME_IDS.map(item => <button type="button" key={item} aria-label={themeNames[item]} aria-pressed={theme === item} onClick={() => updateTheme(item)} className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-[var(--gold)] ${theme === item ? "border-[var(--gold-dark)] bg-[var(--soft)] text-[var(--gold-dark)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--gold)]"}`}>{themeNames[item]}</button>)}</div></div>
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
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(["wallet", "card", "demo"] as Mode[]).map(mode => {
              const shortfall = quote && walletAvailable !== null ? Math.max(0, quote.total - walletAvailable) : 0;
              const walletDisabled = mode === "wallet" && (walletAvailable === null || shortfall > 0);
              const subtitle = mode === "wallet"
                ? walletLoadError
                  ? copy.wallet.error
                  : walletAvailable === null
                    ? copy.checkout.walletLoading
                    : copy.checkout.walletBalance.replace("{amount}", currency(walletAvailable))
                : mode === "card"
                  ? copy.checkout.cardMethods
                  : copy.checkout.generateCodeNote;
              return <div key={mode} className={`min-w-0 rounded-xl border transition ${walletDisabled ? "border-[var(--line)] bg-[var(--paper)]" : payment === mode ? "border-[var(--gold-dark)] bg-[var(--gold)]/10" : "border-[var(--line)] hover:bg-[var(--soft)]"}`}>
                <label className={`flex items-start gap-3 p-4 ${walletDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}>
                  <input type="radio" name="payment" value={mode} checked={payment === mode} disabled={walletDisabled} onChange={() => {
                    paymentTouched.current = true;
                    setQuote(null); setQuoteToken(""); setPayment(mode);
                  }} className="mt-1 accent-[var(--gold-dark)] disabled:cursor-not-allowed"/>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold">{mode === "card" ? <CreditCard size={15}/> : <WalletCards size={15}/>}<span>{mode === "demo" ? copy.checkout.generateCode : copy.checkout[mode]}</span></span>
                    <span dir={lang === "ar" ? "rtl" : "ltr"} className="mt-1 block text-[11px] leading-5 text-[var(--muted)]">{subtitle}</span>
                  </span>
                </label>
                {mode === "wallet" && shortfall > 0 && <div className="px-4 pb-4">
                  <div className="flex items-start gap-2 rounded-xl bg-[var(--gold)]/15 p-[10px_12px] text-xs leading-5 text-[var(--gold-dark)]">
                    <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0"/>
                    <span><strong className="block font-semibold">{copy.checkout.insufficientBalanceTitle}</strong><span dir={lang === "ar" ? "rtl" : "ltr"} className="block">{copy.checkout.insufficientBalanceAmount.replace("{amount}", currency(shortfall))}</span></span>
                  </div>
                  <Link href="/wallet" className="outline-button mt-2 !border-[var(--gold-dark)] !px-3 !py-2 !text-xs !text-[var(--gold-dark)]">{copy.checkout.addMoney}</Link>
                </div>}
              </div>;
            })}
          </div>
        </section>
      </div>
      <aside className="card h-fit p-5 sm:p-7 lg:sticky lg:top-28">
        <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">{copy.checkout.total}</h2><span className="flex items-center gap-1.5 rounded-full bg-[var(--soft)] px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)]"><Clock3 size={13}/>{copy.checkout.priceLock}</span></div>
        <div aria-live="polite" className="mt-6 space-y-4 border-b border-[var(--line)] pb-5 text-sm">
          {lines.map(line => {
            const product = resolvedProducts[line.productId] ?? line.product;
            const name = product ? lang === "ar" ? product.nameAr : product.name : line.productId;
            const item = quote?.items.find(quoteItem => quoteItem.productId === line.productId);
             const quantityText = product ? formatQuantity(line.shares, product.type, lang) : String(line.shares);
             return <div key={line.productId} className="flex justify-between gap-4"><span className="min-w-0 text-[var(--muted)]">{name}<span dir="ltr" className="mt-1 block text-[10px]">{quantityText} × {item ? currency(item.unitPrice) : "—"}{product?.type === "metal" ? lang === "ar" ? " / غ" : " / g" : ""}</span></span><span className="shrink-0">{quoting || !item ? "—" : currency(item.subtotal)}</span></div>;
          })}
          <div className="flex justify-between gap-4"><span className="text-[var(--muted)]">{copy.checkout.subtotal}</span><span>{quoting ? "—" : quote ? currency(quote.subtotal) : "—"}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--muted)]">{copy.checkout.fee}</span><span>{quoting ? "—" : quote ? currency(quote.fee) : "—"}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--muted)]">{copy.checkout.fromWallet}</span><span>{quoting ? "—" : quote ? currency(quote.wallet) : "—"}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--muted)]">{copy.checkout.byCard}</span><span>{quoting ? "—" : quote ? currency(quote.card) : "—"}</span></div>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-5"><span className="font-semibold">{copy.checkout.total}</span><strong className="font-display text-2xl">{quoting ? "—" : quote ? currency(quote.total) : "—"}</strong></div>
        <p className="text-xs leading-5 text-[var(--muted)]">{copy.checkout.feeNote}</p>
        {(quoting || refreshingPrice) && <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]" role="status"><span className="h-4 w-4 animate-pulse rounded-full bg-[var(--gold)]/50"/>{copy.checkout.refreshing}</p>}
        {priceFresh && <p className="mt-3 flex items-center gap-2 text-xs text-[var(--green)]"><BadgeCheck size={15}/>{copy.checkout.priceUpdated}</p>}
        {quoteError && <p className="mt-4 text-sm text-[var(--red)]" role="alert">{quoteError}</p>}
        <button type="button" onClick={() => void refreshPriceAndQuote()} disabled={refreshingPrice || quoting} className="mt-4 w-full text-xs font-semibold text-[var(--gold-dark)] underline underline-offset-4 disabled:opacity-50">{copy.checkout.reloadProduct}</button>
        {submitError && <p className="mt-4 text-sm leading-6 text-[var(--red)]" role="alert">{submitError}</p>}
        <button type="submit" disabled={pending || quoting || refreshingPrice || !quoteToken} className="gold-button mt-5 w-full disabled:cursor-wait disabled:opacity-55">{pending ? copy.checkout.paying : payment === "demo" ? copy.checkout.generateGiftCode : quote && quote.card === 0 ? copy.checkout.walletPay : copy.checkout.pay}<ArrowRight size={16}/></button>
        <p className="mt-3 text-center text-[10px] leading-5 text-[var(--muted)]">{copy.checkout.feeNote}</p>
      </aside>
    </form>
  </main>;
}

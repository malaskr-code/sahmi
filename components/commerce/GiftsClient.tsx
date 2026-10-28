"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Gift } from "lucide-react";
import Link from "next/link";
import { useCommerce, PageIntro, LoadingPanel, ErrorPanel, type GiftRecord } from "./shared";
import { useStore } from "@/lib/store";
import { GiftDeliveryCard } from "./GiftDeliveryCard";

export default function GiftsClient() {
  const { copy, lang, currency } = useCommerce();
  const { t } = useStore();
  const [gifts, setGifts] = useState<GiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const response = await fetch("/api/gifts", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error();
      setGifts(body.gifts ?? []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [attempt]);
  useEffect(() => { void load(); }, [load]);

  return <main className="page-shell min-h-[65vh] py-10 md:py-16">
    <PageIntro eyebrow={copy.gifts.eyebrow} title={copy.gifts.title} subtitle={copy.gifts.subtitle}/>
    {loading ? <LoadingPanel text={copy.gifts.loading}/> : error ? <ErrorPanel text={copy.gifts.error} retry={() => setAttempt(value => value + 1)}/> : !gifts.length ?
      <section className="card flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><Gift size={24}/></span><h2 className="font-display mt-5 text-2xl font-semibold">{copy.gifts.empty}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{copy.gifts.subtitle}</p><Link href="/products" className="gold-button mt-6">{copy.checkout.browse}<ArrowUpRight size={15}/></Link></section> :
      <div className="space-y-6">
        {gifts.map(gift => {
          const isRedeemed = gift.status === "redeemed";
          const canShare = gift.direction === "sent" && !isRedeemed && Boolean(gift.code);
          return <article key={gift.id} className="grid gap-0 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow)] lg:grid-cols-[minmax(250px,.82fr)_1.18fr]">
             <div className="p-5 sm:p-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1.5">{gift.items.map(item => <span key={item.company.ticker} className="rounded-full bg-[var(--soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--gold-dark)]">{item.company.ticker} · {item.shares}</span>)}</div><span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${isRedeemed ? "bg-[var(--green)]/10 text-[var(--green)]" : "bg-[var(--gold)]/20 text-[var(--gold-dark)]"}`}>{gift.direction === "received" ? copy.gifts.accepted : isRedeemed ? copy.gifts.redeemed : copy.gifts.active}</span></div>
               {gift.code ? <GiftDeliveryCard gift={{ ...gift, code: gift.code }} actions={canShare} /> : <p className="rounded-xl bg-[var(--soft)] px-4 py-3 text-xs text-[var(--muted)]">{gift.direction === "received" ? copy.gifts.received : copy.gifts.redeemed}</p>}
            </div>
            <div className="flex flex-col border-t border-[var(--line)] p-5 sm:p-7 lg:border-s lg:border-t-0">
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-[var(--line)] pb-6">
                <div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">{copy.gifts.purchaseValue}</p><p className="mt-1 font-semibold">{currency(gift.priceAtPurchase)}</p></div>
                <div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">{copy.gifts.currentValue}</p><p className="mt-1 font-semibold">{currency(gift.currentValue)}</p></div>
                <div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">{copy.gifts.theme}</p><p className="mt-1 font-semibold">{t.product.themeNames[gift.theme]}</p></div>
                <div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">{copy.gifts.date}</p><time className="mt-1 block font-semibold" dateTime={gift.createdAt}>{new Date(gift.createdAt).toLocaleDateString(lang === "ar" ? "ar-KW" : "en-KW", { day: "numeric", month: "short", year: "numeric" })}</time></div>
              </div>
              {gift.message && <blockquote className="my-5 border-s-2 border-[var(--gold)] ps-4 text-sm leading-6 text-[var(--muted)]">“{gift.message}”</blockquote>}
            </div>
          </article>;
        })}
      </div>}
  </main>;
}

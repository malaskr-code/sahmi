"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowUpRight, Check, Copy, Download, Gift, Share2 } from "lucide-react";
import Link from "next/link";
import { useCommerce, PageIntro, LoadingPanel, ErrorPanel, type GiftRecord } from "./shared";
import { useStore } from "@/lib/store";

const cardPalette: Record<string, { background: string; ink: string; accent: string }> = {
  eid: { background: "#e9f1e8", ink: "#234631", accent: "#bf9b43" },
  graduation: { background: "#e8edf5", ink: "#253b64", accent: "#c5a456" },
  birthday: { background: "#fbebdf", ink: "#744337", accent: "#d87964" },
  newborn: { background: "#e9f2f4", ink: "#355765", accent: "#89b7c0" },
  wedding: { background: "#f4e8e8", ink: "#704e55", accent: "#bc8b88" },
  general: { background: "#f2eddf", ink: "#625537", accent: "#c9a227" },
};

export default function GiftsClient() {
  const { copy, lang, currency } = useCommerce();
  const { t } = useStore();
  const [gifts, setGifts] = useState<GiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [qr, setQr] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [actionError, setActionError] = useState("");

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

  useEffect(() => {
    let active = true;
    Promise.all(gifts.filter((gift): gift is GiftRecord & { code: string } => Boolean(gift.code && gift.direction === "sent" && gift.status === "active")).map(async gift => {
      const url = `${window.location.origin}/redeem/${encodeURIComponent(gift.code)}`;
      try { return [gift.id, await QRCode.toDataURL(url, { width: 180, margin: 1, color: { dark: "#183b38", light: "#ffffff" }, errorCorrectionLevel: "M" })] as const; }
      catch { return [gift.id, ""] as const; }
    })).then(entries => { if (active) setQr(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [gifts]);

  async function copyLink(gift: GiftRecord) {
    if (!gift.code) return;
    setActionError(""); setCopied("");
    const link = `${window.location.origin}/redeem/${encodeURIComponent(gift.code)}`;
    try { await navigator.clipboard.writeText(link); setCopied(gift.id); window.setTimeout(() => setCopied(""), 2500); }
    catch { setActionError(copy.gifts.copiedError); }
  }

  function shareWhatsApp(gift: GiftRecord) {
    if (!gift.code) return;
    const link = `${window.location.origin}/redeem/${encodeURIComponent(gift.code)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${copy.gifts.title}: ${link}`)}`, "_blank", "noopener,noreferrer");
  }

  async function downloadCard(gift: GiftRecord) {
    if (!gift.code) return;
    setActionError("");
    const palette = cardPalette[gift.theme] ?? cardPalette.general;
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 760;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const textX = lang === "ar" ? 830 : 72;
    ctx.direction = lang === "ar" ? "rtl" : "ltr";
    ctx.textAlign = lang === "ar" ? "right" : "left";
    ctx.fillStyle = palette.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `${palette.accent}88`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(1040, 135, 210, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(1040, 135, 165, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = palette.accent; ctx.font = "600 24px sans-serif"; ctx.fillText(copy.brandMark, textX, 82);
    ctx.fillStyle = palette.ink; ctx.font = "600 68px Georgia, serif"; ctx.fillText(lang === "ar" ? gift.company.nameAr : gift.company.name, textX, 210, 740);
    ctx.font = "500 34px sans-serif"; ctx.fillText(`${gift.shares} ${copy.gifts.shares}`, textX, 282);
    ctx.font = "600 28px sans-serif"; ctx.fillText(`${copy.gifts.recipient}: ${gift.recipientName}`, textX, 390, 740);
    ctx.font = "italic 24px sans-serif";
    const msg = gift.message || copy.gifts.shareTools;
    ctx.fillText(msg.slice(0, 92), textX, 454, 740);
    if (qr[gift.id]) {
      const image = new Image(); image.src = qr[gift.id];
      await new Promise(resolve => { image.onload = resolve; image.onerror = resolve; });
      if (image.complete && image.naturalWidth) { ctx.fillStyle = "#fff"; ctx.fillRect(930, 490, 205, 205); ctx.drawImage(image, 948, 508, 169, 169); }
    }
    const anchor = document.createElement("a");
    anchor.download = `sahmi-gift-${gift.company.ticker.toLowerCase()}.png`;
    anchor.href = canvas.toDataURL("image/png");
    anchor.click();
  }

  return <main className="page-shell min-h-[65vh] py-10 md:py-16">
    <PageIntro eyebrow={copy.gifts.eyebrow} title={copy.gifts.title} subtitle={copy.gifts.subtitle}/>
    {loading ? <LoadingPanel text={copy.gifts.loading}/> : error ? <ErrorPanel text={copy.gifts.error} retry={() => setAttempt(value => value + 1)}/> : !gifts.length ?
      <section className="card flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><Gift size={24}/></span><h2 className="font-display mt-5 text-2xl font-semibold">{copy.gifts.empty}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{copy.gifts.subtitle}</p><Link href="/products" className="gold-button mt-6">{copy.checkout.browse}<ArrowUpRight size={15}/></Link></section> :
      <div className="space-y-6">
        {actionError && <p role="alert" className="rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 p-4 text-sm text-[var(--red)]">{actionError}</p>}
        {gifts.map(gift => {
          const name = lang === "ar" ? gift.company.nameAr : gift.company.name;
          const link = gift.code ? `/redeem/${encodeURIComponent(gift.code)}` : "";
          const isRedeemed = gift.status === "redeemed";
          const canShare = gift.direction === "sent" && !isRedeemed && Boolean(gift.code);
          return <article key={gift.id} className="grid gap-0 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow)] lg:grid-cols-[minmax(250px,.82fr)_1.18fr]">
            <div className="relative p-5 sm:p-7">
               <div className="mb-4 flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{gift.company.ticker}</span><span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${isRedeemed ? "bg-[var(--green)]/10 text-[var(--green)]" : "bg-[var(--gold)]/20 text-[var(--gold-dark)]"}`}>{gift.direction === "received" ? copy.gifts.accepted : isRedeemed ? copy.gifts.redeemed : copy.gifts.active}</span></div>
              <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7" style={{ backgroundColor: cardPalette[gift.theme]?.background ?? cardPalette.general.background, color: cardPalette[gift.theme]?.ink ?? cardPalette.general.ink }}>
                <span className="pointer-events-none absolute -end-8 -top-12 h-40 w-40 rounded-full border opacity-40" style={{ borderColor: cardPalette[gift.theme]?.accent ?? cardPalette.general.accent }}/>
                <div className="relative flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] opacity-65">{copy.brandMark}</p><h2 className="font-display mt-5 text-2xl font-semibold leading-tight">{name}</h2><p className="mt-1 text-xs opacity-70">{gift.company.ticker}</p></div><span aria-hidden="true" className="mt-2 h-7 w-7 rounded-full border-2" style={{ borderColor: cardPalette[gift.theme]?.accent ?? cardPalette.general.accent }}/></div>
                <div className="relative mt-8 flex items-end justify-between gap-4 border-t border-current/15 pt-4"><div><p className="text-[10px] uppercase tracking-[.12em] opacity-65">{copy.gifts.recipient}</p><p className="mt-1 font-semibold">{gift.recipientName}</p></div><div className="text-end"><p className="font-display text-3xl font-semibold">{gift.shares}</p><p className="text-[10px] opacity-65">{copy.gifts.shares}</p></div></div>
                {gift.message && <p className="relative mt-5 line-clamp-2 text-sm leading-6 opacity-80">{gift.message}</p>}
              </div>
               {canShare ? <div className="mt-5 grid grid-cols-[1fr_80px] items-center gap-4">
                 <div><p className="text-xs font-semibold">{copy.gifts.qr}</p><p className="mt-1 break-all text-[10px] leading-4 text-[var(--muted)]">{link}</p></div>
                 <div className="rounded-xl border border-[var(--line)] bg-white p-1.5">{qr[gift.id] ? <img src={qr[gift.id]} alt={copy.gifts.qr} className="block aspect-square w-full" /> : <div className="aspect-square animate-pulse rounded bg-[var(--soft)]"/>}</div>
               </div> : <p className="mt-5 rounded-xl bg-[var(--soft)] px-4 py-3 text-xs text-[var(--muted)]">{gift.direction === "received" ? copy.gifts.received : copy.gifts.redeemed}</p>}
            </div>
            <div className="flex flex-col border-t border-[var(--line)] p-5 sm:p-7 lg:border-s lg:border-t-0">
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-[var(--line)] pb-6">
                <div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">{copy.gifts.purchaseValue}</p><p className="mt-1 font-semibold">{currency(gift.priceAtPurchase)}</p></div>
                <div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">{copy.gifts.currentValue}</p><p className="mt-1 font-semibold">{currency(gift.currentValue)}</p></div>
                <div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">{copy.gifts.theme}</p><p className="mt-1 font-semibold">{t.product.themeNames[gift.theme]}</p></div>
                <div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">{copy.gifts.date}</p><time className="mt-1 block font-semibold" dateTime={gift.createdAt}>{new Date(gift.createdAt).toLocaleDateString(lang === "ar" ? "ar-KW" : "en-KW", { day: "numeric", month: "short", year: "numeric" })}</time></div>
              </div>
              {gift.message && <blockquote className="my-5 border-s-2 border-[var(--gold)] ps-4 text-sm leading-6 text-[var(--muted)]">“{gift.message}”</blockquote>}
              {canShare && <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-3">
                <button type="button" onClick={() => void copyLink(gift)} className="outline-button !px-2 !py-3 text-xs">{copied === gift.id ? <Check size={14}/> : <Copy size={14}/ >}{copied === gift.id ? copy.gifts.copied : copy.gifts.copy}</button>
                <button type="button" onClick={() => shareWhatsApp(gift)} className="outline-button !px-2 !py-3 text-xs"><Share2 size={14}/>{copy.gifts.share}</button>
                <button type="button" onClick={() => void downloadCard(gift)} className="outline-button !px-2 !py-3 text-xs"><Download size={14}/>{copy.gifts.download}</button>
              </div>}
            </div>
          </article>;
        })}
      </div>}
  </main>;
}

"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Share2 } from "lucide-react";
import type { GiftRecord } from "./shared";
import { useCommerce } from "./shared";

type ShareableGift = Omit<GiftRecord, "code" | "direction"> & { code: string };

const palettes: Record<GiftRecord["theme"], { background: string; ink: string; accent: string }> = {
  eid: { background: "#e9f1e8", ink: "#234631", accent: "#bf9b43" },
  graduation: { background: "#e8edf5", ink: "#253b64", accent: "#c5a456" },
  birthday: { background: "#fbebdf", ink: "#744337", accent: "#d87964" },
  newborn: { background: "#e9f2f4", ink: "#355765", accent: "#89b7c0" },
  wedding: { background: "#f4e8e8", ink: "#704e55", accent: "#bc8b88" },
  general: { background: "#f2eddf", ink: "#625537", accent: "#c9a227" },
};

export function GiftDeliveryCard({ gift }: { gift: ShareableGift }) {
  const { copy, lang } = useCommerce();
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const theme = palettes[gift.theme] ?? palettes.general;
  const link = origin ? `${origin}/redeem/${encodeURIComponent(gift.code)}` : "";
  const companyName = lang === "ar" ? gift.company.nameAr : gift.company.name;

  useEffect(() => {
    const currentOrigin = window.location.origin;
    setOrigin(currentOrigin);
    const url = `${currentOrigin}/redeem/${encodeURIComponent(gift.code)}`;
    let active = true;
    QRCode.toDataURL(url, { width: 200, margin: 1, color: { dark: "#183b38", light: "#ffffff" }, errorCorrectionLevel: "M" })
      .then(value => { if (active) setQr(value); })
      .catch(() => { if (active) setQr(""); });
    return () => { active = false; };
  }, [gift.code]);

  async function copyLink() {
    setError("");
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError(copy.gifts.copiedError);
    }
  }

  function shareWhatsApp() {
    const text = `${copy.gifts.title}: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function downloadCard() {
    setError("");
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 760;
    const context = canvas.getContext("2d");
    if (!context) return;
    const textX = lang === "ar" ? 830 : 72;
    context.direction = lang === "ar" ? "rtl" : "ltr";
    context.textAlign = lang === "ar" ? "right" : "left";
    context.fillStyle = theme.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = `${theme.accent}88`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(1050, 135, 210, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = theme.accent;
    context.font = "600 25px sans-serif";
    context.fillText(copy.brandMark, textX, 82);
    context.fillStyle = theme.ink;
    context.font = "600 66px Georgia, serif";
    context.fillText(companyName, textX, 220, 740);
    context.font = "500 34px sans-serif";
    context.fillText(`${gift.shares} ${copy.gifts.shares}`, textX, 292);
    context.font = "600 28px sans-serif";
    context.fillText(`${copy.gifts.recipient}: ${gift.recipientName}`, textX, 398, 740);
    if (gift.message) {
      context.font = "italic 24px sans-serif";
      context.fillText(gift.message.slice(0, 100), textX, 462, 740);
    }
    if (qr) {
      const image = new Image();
      image.src = qr;
      await new Promise<void>(resolve => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
      if (image.complete && image.naturalWidth) {
        context.fillStyle = "#fff";
        context.fillRect(925, 505, 210, 210);
        context.drawImage(image, 945, 525, 170, 170);
      }
    }
    const anchor = document.createElement("a");
    anchor.download = `sahmi-gift-${gift.company.ticker.toLowerCase()}.png`;
    anchor.href = canvas.toDataURL("image/png");
    anchor.click();
  }

  return <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-4 text-start sm:p-6" aria-label={copy.success.giftTitle}>
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_132px]">
      <article className="relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ backgroundColor: theme.background, color: theme.ink }}>
        <span aria-hidden="true" className="pointer-events-none absolute -end-12 -top-16 h-52 w-52 rounded-full border opacity-40" style={{ borderColor: theme.accent }}/>
        <p className="relative text-[10px] font-bold uppercase tracking-[.2em] opacity-70">{copy.brandMark}</p>
        <h2 className="font-display relative mt-7 text-3xl font-semibold">{companyName}</h2>
        <p className="relative mt-1 text-xs tracking-widest opacity-70">{gift.company.ticker}</p>
        <div className="relative mt-7 flex items-end justify-between gap-4 border-t border-current/15 pt-4">
          <div><p className="text-[10px] uppercase tracking-widest opacity-65">{copy.gifts.recipient}</p><p className="mt-1 font-semibold">{gift.recipientName}</p></div>
          <div className="text-end"><p className="font-display text-3xl font-semibold">{gift.shares}</p><p className="text-[10px] opacity-70">{copy.gifts.shares}</p></div>
        </div>
        {gift.message && <p className="relative mt-5 text-sm leading-6 opacity-85">{gift.message}</p>}
      </article>
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white p-3">
        {qr ? <img src={qr} alt={copy.gifts.qr} className="aspect-square w-full max-w-32" /> : <div className="aspect-square w-full max-w-32 animate-pulse rounded-lg bg-[var(--soft)]" aria-label={copy.success.verifying}/>}
        <span className="text-center text-[10px] leading-4 text-[#183b38]">{copy.gifts.qr}</span>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{copy.gifts.code}</p><p dir="ltr" className="mt-1 font-mono text-sm font-bold tracking-[.12em]">{gift.code}</p></div>
      <span className="max-w-full break-all text-xs text-[var(--muted)]">{link.replace(/^https?:\/\//, "")}</span>
    </div>
    {error && <p className="mt-3 text-sm text-[var(--red)]" role="alert">{error}</p>}
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <button type="button" onClick={() => void copyLink()} className="outline-button !px-2 !py-3 text-xs">{copied ? <Check size={15}/> : <Copy size={15}/ >}{copied ? copy.gifts.copied : copy.gifts.copy}</button>
      <button type="button" onClick={shareWhatsApp} className="outline-button !px-2 !py-3 text-xs"><Share2 size={15}/>{copy.gifts.share}</button>
      <button type="button" onClick={() => void downloadCard()} className="outline-button !px-2 !py-3 text-xs"><Download size={15}/>{copy.gifts.download}</button>
    </div>
  </section>;
}

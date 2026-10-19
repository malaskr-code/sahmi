"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
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

export function GiftDeliveryCard({ gift, actions = true }: { gift: ShareableGift; actions?: boolean }) {
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
      const redeemLink = link || `${window.location.origin}/redeem/${encodeURIComponent(gift.code)}`;
      await navigator.clipboard.writeText(redeemLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError(copy.gifts.copiedError);
    }
  }

  function shareWhatsApp() {
    const redeemLink = link || `${window.location.origin}/redeem/${encodeURIComponent(gift.code)}`;
    const text = `${copy.gifts.shareMessage} ${redeemLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function downloadCard() {
    setError("");
    const redeemLink = link || `${window.location.origin}/redeem/${encodeURIComponent(gift.code)}`;
    let qrImageData = qr;
    if (!qrImageData) {
      try {
        qrImageData = await QRCode.toDataURL(redeemLink, {
          width: 200,
          margin: 1,
          color: { dark: "#183b38", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
      } catch {
        setError(copy.errors.serverError);
        return;
      }
    }
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
    if (gift.company.image) {
      const logoImage = new Image();
      logoImage.src = gift.company.image;
      await new Promise<void>(resolve => {
        logoImage.onload = () => resolve();
        logoImage.onerror = () => resolve();
      });
      if (logoImage.complete && logoImage.naturalWidth) {
        const logoSize = 120;
        const logoX = lang === "ar" ? 72 : 1008;
        const logoY = 40;
        context.fillStyle = gift.company.logoBg;
        context.beginPath();
        context.roundRect(logoX, logoY, logoSize, logoSize, 14);
        context.fill();
        context.strokeStyle = `${theme.accent}88`;
        context.lineWidth = 2;
        context.stroke();
        const scale = Math.min(logoSize / logoImage.naturalWidth, logoSize / logoImage.naturalHeight);
        const width = logoImage.naturalWidth * scale;
        const height = logoImage.naturalHeight * scale;
        context.drawImage(logoImage, logoX + (logoSize - width) / 2, logoY + (logoSize - height) / 2, width, height);
      }
    }
    context.fillStyle = theme.accent;
    context.font = "600 25px sans-serif";
    context.fillText(copy.brandMark, textX, 82);
    context.fillStyle = theme.ink;
    context.font = "600 66px Georgia, serif";
    context.fillText(companyName, textX, 220, 740);
    context.font = "500 25px sans-serif";
    context.fillText(gift.company.ticker, textX, 262);
    context.font = "500 34px sans-serif";
    context.fillText(`${gift.shares} ${copy.gifts.shares}`, textX, 322);
    context.font = "600 28px sans-serif";
    context.fillText(`${copy.gifts.recipient}: ${gift.recipientName}`, textX, 394, 740);
    if (gift.message) {
      context.font = "italic 24px sans-serif";
      context.fillText(gift.message.slice(0, 100), textX, 458, 740);
    }
    context.font = "600 22px monospace";
    context.fillText(`${copy.gifts.code}: ${gift.code}`, textX, 682, 740);
    if (qrImageData) {
      const image = new Image();
      image.src = qrImageData;
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

  return <section className="text-start" aria-label={copy.success.giftTitle}>
      <article className="relative overflow-hidden rounded-2xl p-5 sm:p-7" style={{ backgroundColor: theme.background, color: theme.ink }}>
        <span aria-hidden="true" className="pointer-events-none absolute -end-12 -top-16 h-52 w-52 rounded-full border opacity-40" style={{ borderColor: theme.accent }}/>
        <p className="relative text-[10px] font-bold uppercase tracking-[.2em] opacity-70">{copy.brandMark}</p>
        <div className="relative mt-5 grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_124px]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <CompanyLogo src={gift.company.image} name={companyName} logoBg={gift.company.logoBg} className="h-14 w-14 rounded-xl"/>
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{companyName}</h2>
                <p dir="ltr" className="mt-1 text-xs tracking-widest opacity-70">{gift.company.ticker}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-x-7 gap-y-3 border-t border-current/15 pt-4">
              <div><p className="text-[10px] uppercase tracking-widest opacity-65">{copy.gifts.shares}</p><p className="font-display mt-1 text-2xl font-semibold">{gift.shares}</p></div>
            </div>
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest opacity-65">{copy.gifts.recipient}</p>
              <p className="mt-1 font-semibold">{gift.recipientName}</p>
            </div>
            {gift.message && <p className="mt-4 border-s-2 border-current/25 ps-3 text-sm leading-6 opacity-85">{gift.message}</p>}
            <div className="mt-4 border-t border-current/15 pt-3">
              <p className="text-[10px] uppercase tracking-widest opacity-65">{copy.gifts.code}</p>
              <p dir="ltr" className="mt-1 flex flex-wrap gap-x-0 font-mono text-sm font-bold tracking-[.12em]">
                {gift.code.split("-").map((group, index, groups) => (
                  <span key={`${index}-${group}`} className="whitespace-nowrap">{group}{index < groups.length - 1 ? "-" : ""}</span>
                ))}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-3 rounded-xl bg-white p-2.5 text-[#183b38] sm:w-auto sm:flex-col">
            {qr ? <img src={qr} alt={copy.gifts.qr} className="aspect-square w-20 sm:w-full" /> : <div className="aspect-square w-20 animate-pulse rounded-lg bg-[var(--soft)] sm:w-full" aria-label={copy.success.verifying}/>}
            <span className="text-xs leading-5 sm:text-center sm:text-[10px]">{copy.gifts.qr}</span>
          </div>
        </div>
      </article>
    {link && <p className="mt-3 break-all text-[10px] leading-5 text-[var(--muted)]">{link.replace(/^https?:\/\//, "")}</p>}
    {error && <p className="mt-3 text-sm text-[var(--red)]" role="alert">{error}</p>}
    {actions && <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <button type="button" onClick={() => void copyLink()} className="outline-button !px-2 !py-3 text-xs">{copied ? <Check size={15}/> : <Copy size={15}/ >}{copied ? copy.gifts.copied : copy.gifts.copy}</button>
      <button type="button" onClick={shareWhatsApp} className="outline-button !px-2 !py-3 text-xs"><Share2 size={15}/>{copy.gifts.share}</button>
      <button type="button" onClick={() => void downloadCard()} className="outline-button !px-2 !py-3 text-xs"><Download size={15}/>{copy.gifts.download}</button>
    </div>}
  </section>;
}

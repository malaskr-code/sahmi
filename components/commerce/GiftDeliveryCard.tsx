"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { GiftRecord } from "./shared";
import { useCommerce } from "./shared";
import { formatQuantity } from "@/lib/metal-units";

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
  const items = gift.items?.length ? gift.items : [{
    company: gift.company,
    shares: gift.shares,
    priceAtPurchase: gift.priceAtPurchase,
    currentValue: gift.currentValue,
  }];

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

  async function loadImage(src: string) {
    if (!src) return null;
    const image = new Image();
    image.src = src;
    await new Promise<void>(resolve => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });
    return image.complete && image.naturalWidth ? image : null;
  }

  async function downloadCard() {
    setError("");
    const redeemLink = link || `${window.location.origin}/redeem/${encodeURIComponent(gift.code)}`;
    let qrImageData = qr;
    if (!qrImageData) {
      try {
        qrImageData = await QRCode.toDataURL(redeemLink, {
          width: 200, margin: 1, color: { dark: "#183b38", light: "#ffffff" }, errorCorrectionLevel: "M",
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
    const rtl = lang === "ar";
    const textX = rtl ? 1128 : 72;
    context.direction = rtl ? "rtl" : "ltr";
    context.textAlign = rtl ? "right" : "left";
    context.fillStyle = theme.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = `${theme.accent}88`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(rtl ? 1050 : 150, 80, 210, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = theme.accent;
    context.font = "600 25px sans-serif";
    context.fillText(copy.brandMark, textX, 66);
    context.fillStyle = theme.ink;

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const y = 104 + index * 78;
      const size = 58;
      const logoX = rtl ? 1070 : 72;
      context.fillStyle = item.company.logoBg || "#ffffff";
      context.beginPath();
      context.roundRect(logoX, y, size, size, 10);
      context.fill();
      context.strokeStyle = `${theme.accent}88`;
      context.lineWidth = 1;
      context.stroke();
      const logo = await loadImage(item.company.image);
      if (logo) {
        const scale = Math.min(size / logo.naturalWidth, size / logo.naturalHeight);
        const width = logo.naturalWidth * scale;
        const height = logo.naturalHeight * scale;
        context.drawImage(logo, logoX + (size - width) / 2, y + (size - height) / 2, width, height);
      }
      context.fillStyle = theme.ink;
      context.textAlign = rtl ? "right" : "left";
      context.font = "600 29px Georgia, serif";
      context.fillText(lang === "ar" ? item.company.nameAr : item.company.name, rtl ? 1038 : 150, y + 27, 730);
      context.font = "500 17px sans-serif";
      context.globalAlpha = 0.72;
      context.fillText(item.company.ticker, rtl ? 1038 : 150, y + 51);
      context.globalAlpha = 1;
      context.font = "600 23px sans-serif";
      context.textAlign = rtl ? "left" : "right";
      const quantity = item.company.type === "metal"
        ? `${formatQuantity(item.shares, "metal", lang)} of ${lang === "ar" ? item.company.nameAr : item.company.name}`
        : `${item.shares} ${copy.gifts.shares}`;
      context.fillText(quantity, rtl ? 105 : 1100, y + 38, 400);
      if (index < items.length - 1) {
        context.strokeStyle = `${theme.ink}22`;
        context.beginPath();
        context.moveTo(72, y + 68);
        context.lineTo(1128, y + 68);
        context.stroke();
      }
    }

    const detailsY = 128 + items.length * 78;
    context.textAlign = rtl ? "right" : "left";
    context.fillStyle = theme.accent;
    context.font = "600 17px sans-serif";
    context.fillText(copy.gifts.recipient, textX, detailsY);
    context.fillStyle = theme.ink;
    context.font = "600 27px sans-serif";
    context.fillText(gift.recipientName, textX, detailsY + 34, 760);
    if (gift.message) {
      context.font = "italic 21px sans-serif";
      context.fillText(gift.message.slice(0, 105), textX, detailsY + 72, 760);
    }
    context.font = "600 20px monospace";
    context.fillText(`${copy.gifts.code}: ${gift.code}`, textX, 724, 790);
    if (qrImageData) {
      const image = await loadImage(qrImageData);
      if (image) {
        const qrX = rtl ? 72 : 950;
        context.fillStyle = "#fff";
        context.fillRect(qrX, 548, 190, 190);
        context.drawImage(image, qrX + 15, 563, 160, 160);
      }
    }
    const anchor = document.createElement("a");
    anchor.download = `sahmi-gift-box-${items.map(item => item.company.ticker.toLowerCase()).join("-")}.png`;
    anchor.href = canvas.toDataURL("image/png");
    anchor.click();
  }

  return <section className="text-start" aria-label={copy.success.giftTitle}>
    <article className="relative overflow-hidden rounded-2xl p-5 sm:p-7" style={{ backgroundColor: theme.background, color: theme.ink }}>
      <span aria-hidden="true" className="pointer-events-none absolute -end-12 -top-16 h-52 w-52 rounded-full border opacity-40" style={{ borderColor: theme.accent }}/>
      <p className="relative text-[10px] font-bold uppercase tracking-[.2em] opacity-70">{copy.brandMark}</p>
      <div className="relative mt-4 grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_112px]">
        <div className="min-w-0">
          <ul className="divide-y divide-current/15">
            {items.map(item => {
              const companyName = lang === "ar" ? item.company.nameAr : item.company.name;
              return <li key={item.company.ticker} className="flex min-w-0 items-center gap-3 py-3 first:pt-1">
                <CompanyLogo src={item.company.image} name={companyName} logoBg={item.company.logoBg} className="h-12 w-12 shrink-0 rounded-lg"/>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display truncate text-lg font-semibold leading-tight sm:text-xl">{companyName}</h2>
                  <p dir="ltr" className="mt-1 text-[10px] tracking-widest opacity-70">{item.company.ticker}</p>
                </div>
                 <p className="shrink-0 text-sm font-semibold">{item.company.type === "metal" ? `${formatQuantity(item.shares, "metal", lang)} ${lang === "ar" ? "من" : "of"} ${companyName}` : <>{item.shares} <span className="text-xs font-normal opacity-75">{copy.gifts.shares}</span></>}</p>
              </li>;
            })}
          </ul>
          <div className="mt-3 border-t border-current/15 pt-3">
            <p className="text-[10px] uppercase tracking-widest opacity-65">{copy.gifts.recipient}</p>
            <p className="mt-1 font-semibold">{gift.recipientName}</p>
          </div>
          {gift.message && <p className="mt-3 border-s-2 border-current/25 ps-3 text-sm leading-6 opacity-85">{gift.message}</p>}
          <div className="mt-3 border-t border-current/15 pt-3">
            <p className="text-[10px] uppercase tracking-widest opacity-65">{copy.gifts.code}</p>
            <p dir="ltr" className="mt-1 flex flex-wrap gap-x-0 font-mono text-sm font-bold tracking-[.12em]">
              {gift.code.split("-").map((group, index, groups) => (
                <span key={`${index}-${group}`} className="whitespace-nowrap">{group}{index < groups.length - 1 ? "-" : ""}</span>
              ))}
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 rounded-xl bg-white p-2.5 text-[#183b38] sm:flex-col">
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

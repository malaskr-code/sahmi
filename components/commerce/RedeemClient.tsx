"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Gift, LockKeyhole } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useCommerce, ErrorPanel, responseError } from "./shared";
import { CompanyLogo } from "@/components/CompanyLogo";
import { formatQuantity } from "@/lib/metal-units";

type Preview = {
  items: Array<{
    company: { ticker: string; type: "share" | "metal"; name: string; nameAr: string; image: string; logoBg: string };
    shares: number;
  }>;
  recipientName: string; message: string; theme: string; status: string;
};
const palette: Record<string, { bg: string; ink: string; accent: string }> = {
  eid: { bg: "#e9f1e8", ink: "#234631", accent: "#bf9b43" },
  graduation: { bg: "#e8edf5", ink: "#253b64", accent: "#c5a456" },
  birthday: { bg: "#fbebdf", ink: "#744337", accent: "#d87964" },
  newborn: { bg: "#e9f2f4", ink: "#355765", accent: "#89b7c0" },
  wedding: { bg: "#f4e8e8", ink: "#704e55", accent: "#bc8b88" },
  general: { bg: "#f2eddf", ink: "#625537", accent: "#c9a227" },
};

export default function RedeemClient({ code }: { code: string }) {
  const { copy, lang } = useCommerce();
  const { user, loading: authLoading } = useAuth();
  const [gift, setGift] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setUnavailable(false);
    fetch(`/api/gifts/redeem/${encodeURIComponent(code)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.gift) throw new Error(body?.code || "giftUnavailable");
        setGift(body.gift);
      })
      .catch(reason => { if (!controller.signal.aborted) { setUnavailable(true); setError(responseError(copy, { code: reason instanceof Error ? reason.message : "" }, copy.redeem.unavailable)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [code, copy]);

  async function claim() {
    setClaiming(true); setError("");
    try {
      const response = await fetch("/api/gifts/redeem", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({ code }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseError(copy, body, copy.redeem.error));
      setClaimed(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy.redeem.error); }
    finally { setClaiming(false); }
  }

  const design = palette[gift?.theme ?? "general"] ?? palette.general;
  return <main className="page-shell flex min-h-[70vh] items-center justify-center py-10 md:py-16">
    {loading || authLoading ? <section className="card w-full max-w-2xl p-7 sm:p-10" role="status" aria-live="polite"><div className="h-3 w-32 animate-pulse rounded bg-[var(--soft)]"/><div className="mt-6 h-8 max-w-md animate-pulse rounded bg-[var(--soft)]"/><div className="mt-5 h-40 animate-pulse rounded-2xl bg-[var(--soft)]"/></section>
      : unavailable || !gift ? <section className="card w-full max-w-xl p-7 text-center sm:p-12"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--red)]/10 text-[var(--red)]"><Gift size={24}/></span><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{copy.redeem.eyebrow}</p><h1 className="font-display mt-3 text-3xl font-semibold">{copy.redeem.invalidTitle}</h1><ErrorPanel text={error || copy.redeem.unavailable}/><Link href="/" className="gold-button mt-7">{copy.redeem.back}<ArrowRight size={15}/></Link></section>
      : claimed ? <section className="card w-full max-w-xl p-7 text-center sm:p-12"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green)]/10 text-[var(--green)]"><Check size={24}/></span><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{copy.redeem.eyebrow}</p><h1 className="font-display mt-3 text-4xl font-semibold">{copy.redeem.claimedTitle}</h1><p className="mt-4 text-sm leading-7 text-[var(--muted)]">{copy.redeem.claimedBody}</p><Link href="/gifts" className="gold-button mt-7">{copy.success.showGift}<ArrowRight size={15}/></Link></section>
      : <div className="w-full max-w-3xl">
        <div className="mb-5 text-center"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--gold-dark)]">{copy.redeem.eyebrow}</p><h1 className="font-display mt-3 text-4xl font-semibold leading-tight md:text-5xl">{copy.redeem.title}</h1></div>
        <article className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow)]">
          <div className="relative m-4 overflow-hidden rounded-[20px] p-6 sm:m-6 sm:p-10" style={{ background: design.bg, color: design.ink }}>
            <span aria-hidden="true" className="absolute -end-10 -top-16 h-64 w-64 rounded-full border opacity-40" style={{ borderColor: design.accent }}/>
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="w-full">
                <p className="text-[10px] font-bold uppercase tracking-[.2em] opacity-60">{copy.brandMark}</p>
                <ul className="mt-4 divide-y divide-current/15">
                  {gift.items.map(item => {
                    const name = lang === "ar" ? item.company.nameAr : item.company.name;
                    return <li key={item.company.ticker} className="flex flex-wrap items-center gap-3 py-3 first:pt-1">
                      <CompanyLogo src={item.company.image} name={name} logoBg={item.company.logoBg} className="h-12 w-12 shrink-0 rounded-xl"/>
                      <div className="min-w-0 flex-1"><h2 className="font-display truncate text-xl font-semibold md:text-2xl">{name}</h2><p dir="ltr" className="mt-1 text-xs font-semibold tracking-widest opacity-70">{item.company.ticker}</p></div>
                      <div className="rounded-full border border-current/20 px-4 py-2 text-xs font-semibold">{item.company.type === "metal" ? `${formatQuantity(item.shares, "metal", lang)} ${lang === "ar" ? "من" : "of"} ${name}` : `${item.shares} ${copy.redeem.shares}`}</div>
                    </li>;
                  })}
                </ul>
              </div>
            </div>
            <div className="relative mt-6 grid gap-5 border-t border-current/15 pt-5 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] opacity-60">{copy.redeem.recipient}</p><p className="mt-1 text-lg font-semibold">{gift.recipientName}</p>{gift.message && <><p className="mt-5 text-[10px] font-bold uppercase tracking-[.13em] opacity-60">{copy.redeem.message}</p><p className="mt-2 max-w-xl text-sm leading-6">{gift.message}</p></>}</div><div className="hidden rounded-xl border border-current/15 p-3 sm:block"><LockKeyhole size={19} style={{ color: design.accent }}/></div></div>
          </div>
          <div className="p-6 pt-2 text-center sm:p-8 sm:pt-3">
            {gift.status === "redeemed" ? <p className="rounded-xl bg-[var(--soft)] px-4 py-3 text-sm text-[var(--muted)]">{copy.redeem.alreadyRedeemed}</p> : <>
              <p className="mx-auto max-w-md text-sm leading-6 text-[var(--muted)]">{user ? copy.redeem.previewHelp : copy.redeem.accountNeeded}</p>
              {error && <p role="alert" className="mt-4 text-sm text-[var(--red)]">{error}</p>}
              {user ? <button type="button" onClick={() => void claim()} disabled={claiming} className="gold-button mt-6 w-full sm:w-auto">{claiming ? copy.redeem.claiming : copy.redeem.action}<ArrowRight size={16}/></button>
                : <Link href={`/login?next=${encodeURIComponent(`/redeem/${code}`)}`} className="gold-button mt-6 w-full sm:w-auto">{copy.redeem.loginAction}<ArrowRight size={16}/></Link>}
            </>}
          </div>
        </article>
      </div>}
  </main>;
}

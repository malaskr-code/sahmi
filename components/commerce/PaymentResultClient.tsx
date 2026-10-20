"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, RefreshCw } from "lucide-react";
import { useCommerce, LoadingPanel, responseError } from "./shared";
import type { GiftRecord } from "./shared";
import { GiftDeliveryCard } from "./GiftDeliveryCard";

type Result = {
  kind: "gift" | "topup";
  giftId: string | null;
  orderId?: string;
  gift?: (Omit<GiftRecord, "code" | "direction"> & { code: string }) | null;
};

export function SuccessClient({ tapId, orderId }: { tapId: string; orderId: string }) {
  const { copy, currency } = useCommerce();
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");

  const verify = useCallback(async () => {
    setChecking(true); setFailed(false); setError("");
    try {
      const response = await fetch("/api/checkout/complete", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tapId: tapId || undefined, orderId: orderId || undefined }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.kind || (body.kind === "gift" && !body.gift)) throw new Error(body?.code || "sessionPending");
      setResult(body);
      window.sessionStorage.removeItem("sahmi-checkout-kind");
    } catch (reason) {
      setResult(null); setFailed(true);
      setError(responseError(copy, { code: reason instanceof Error ? reason.message : "" }, copy.success.unavailable));
    } finally { setChecking(false); }
  }, [tapId, orderId, copy]);

  useEffect(() => { void verify(); }, [verify, attempt]);

  if (checking) {
    const verificationText = tapId ? copy.success.verifying : copy.success.verifyingGift;
    return <main className="page-shell min-h-[65vh] py-12 md:py-16"><LoadingPanel text={verificationText}/><p className="mx-auto mt-4 max-w-xl text-center text-sm text-[var(--muted)]">{verificationText}</p></main>;
  }

  return <main className="page-shell flex min-h-[65vh] items-center justify-center py-12 md:py-16">
    <section className="card w-full max-w-2xl overflow-hidden">
      <div className={`h-1.5 ${result ? "bg-[var(--green)]" : "bg-[var(--red)]"}`}/>
      <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${result ? "bg-[var(--green)]/10 text-[var(--green)]" : "bg-[var(--red)]/10 text-[var(--red)]"}`}>{result ? <Check size={27}/> : <CircleAlert size={26}/>}</span>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{copy.checkout.eyebrow}</p>
        <h1 className="font-display mt-3 text-4xl font-semibold">{result ? result.kind === "topup" ? copy.success.topupTitle : copy.success.giftTitle : copy.success.failedTitle}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">{result ? result.kind === "topup" ? copy.success.topupBody : copy.success.giftBody : error}</p>
        {failed && <p role="alert" className="mt-5 rounded-xl border border-[var(--red)]/25 bg-[var(--red)]/5 p-4 text-xs leading-6 text-[var(--red)]">{copy.success.unavailable}</p>}
        {result?.kind === "gift" && result.gift && <div className="mx-auto mt-6 flex max-w-md items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-start">
          <span className="text-sm text-[var(--muted)]">{copy.gifts.purchaseValue}</span>
          <span dir="ltr" className="font-semibold">{currency(result.gift.priceAtPurchase)}</span>
        </div>}
        {result ? <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={result.kind === "topup" ? "/wallet" : "/gifts"} className="gold-button">{result.kind === "topup" ? copy.success.showWallet : copy.success.showGift}<ArrowRight size={16}/></Link>
          {result.kind === "gift" && <Link href="/gifts" className="outline-button">{copy.success.viewCard}</Link>}
        </div> : <button type="button" onClick={() => setAttempt(value => value + 1)} className="gold-button mt-8"><RefreshCw size={15}/>{copy.success.retry}</button>}
        {result?.kind === "gift" && result.gift && <GiftDeliveryCard gift={result.gift}/>}
      </div>
    </section>
  </main>;
}

export function CancelClient({ isTopup }: { isTopup: boolean }) {
  const { copy } = useCommerce();
  const [topup, setTopup] = useState(isTopup);
  useEffect(() => {
    if (window.sessionStorage.getItem("sahmi-checkout-kind") === "topup") {
      setTopup(true);
      window.sessionStorage.removeItem("sahmi-checkout-kind");
    }
  }, []);
  const fallback = topup ? "/wallet" : "/cart";
  return <main className="page-shell flex min-h-[65vh] items-center justify-center py-12 md:py-16">
    <section className="card w-full max-w-2xl overflow-hidden">
      <div className="h-1.5 bg-[var(--gold)]"/>
      <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><CircleAlert size={26}/></span>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{copy.checkout.eyebrow}</p>
        <h1 className="font-display mt-3 text-4xl font-semibold">{copy.cancel.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">{topup ? copy.cancel.topupBody : copy.cancel.body}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={fallback} className="gold-button">{topup ? copy.cancel.wallet : copy.cancel.gift}<ArrowRight size={16}/></Link>
          <Link href={fallback} className="outline-button">{copy.cancel.retry}</Link>
        </div>
      </div>
    </section>
  </main>;
}

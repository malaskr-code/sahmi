"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Bell, CircleDollarSign, WalletCards } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCommerce, PageIntro, LoadingPanel, ErrorPanel, responseError } from "./shared";

type WalletData = {
  balance: number; reserved: number; available: number;
  transactions: { id: string; type: "topup" | "gift_payment" | "sale" | "fee"; amount: number; reference: string; createdAt: string }[];
  notifications: { id: string; text: string; read: boolean; createdAt: string }[];
};
type Filter = "all" | "topup" | "gift_payment" | "sale" | "fee";

export default function WalletClient() {
  const { copy, currency, lang } = useCommerce();
  const { t } = useStore();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [amount, setAmount] = useState("10");
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const response = await fetch(`/api/wallet?type=${filter}`, { credentials: "same-origin", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw { code: body.code };
      setData(body);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, [filter, attempt]);
  useEffect(() => { void load(); }, [load]);

  async function beginTopup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError("");
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 1 || Math.abs(parsed * 100 - Math.round(parsed * 100)) > 1e-7) {
      setActionError(copy.errors.minimumTopup); return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({ action: "topup", amount: parsed }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseError(copy, body, copy.wallet.error));
      if (body?.url) { window.sessionStorage.setItem("sahmi-checkout-kind", "topup"); window.location.assign(body.url); }
      else throw new Error(copy.wallet.error);
    } catch (error) { setActionError(error instanceof Error ? error.message : copy.wallet.error); setPending(false); }
  }

  const filters: Filter[] = ["all", "topup", "gift_payment", "sale", "fee"];
  return <main className="page-shell min-h-[65vh] py-10 md:py-16">
    <PageIntro eyebrow={copy.wallet.eyebrow} title={copy.wallet.title} subtitle={copy.wallet.subtitle}/>
    {loading ? <LoadingPanel text={copy.wallet.loading}/> : failed || !data ? <ErrorPanel text={copy.wallet.error} retry={() => setAttempt(x => x + 1)}/> : <>
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="relative isolate overflow-hidden rounded-[26px] bg-[#183b38] p-6 text-[#f6f1df] shadow-[var(--shadow)] sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -end-12 -top-20 -z-10 h-72 w-72 rounded-full border border-[#dbbd67]/25"/>
          <div aria-hidden="true" className="pointer-events-none absolute -end-2 -top-10 -z-10 h-52 w-52 rounded-full border border-[#dbbd67]/25"/>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-sm text-[#c9d5c8]"><WalletCards size={17}/>{copy.wallet.balance}</span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[.17em] text-[#d8c67e]">{copy.walletMark}</span>
          </div>
          <p className="font-display mt-8 text-4xl font-semibold tracking-tight md:text-5xl">{currency(data.balance)}</p>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-5">
            <div><p className="text-xs text-[#c9d5c8]">{copy.wallet.available}</p><p className="mt-1 text-lg font-semibold">{currency(data.available)}</p></div>
            <div className="text-end"><p className="text-xs text-[#c9d5c8]">{copy.wallet.reserved}</p><p className="mt-1 text-sm font-semibold">{currency(data.reserved)}</p></div>
          </div>
        </div>
        <section className="card p-5 sm:p-7">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><CircleDollarSign size={19}/></span><div><h2 className="font-display text-xl font-semibold">{copy.wallet.topupTitle}</h2><p className="mt-1 text-xs text-[var(--muted)]">{copy.wallet.minimumTopup}</p></div></div>
          <form className="mt-6" onSubmit={beginTopup}>
            <fieldset disabled={pending}>
              <legend className="mb-2 text-xs font-semibold text-[var(--muted)]">{copy.wallet.presets}</legend>
              <div className="grid grid-cols-4 gap-2">{[5, 10, 20, 50].map(value => <button key={value} type="button" aria-pressed={amount === String(value)} onClick={() => setAmount(String(value))} className={`rounded-xl border px-2 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] ${amount === String(value) ? "border-[var(--gold-dark)] bg-[var(--soft)] text-[var(--gold-dark)]" : "border-[var(--line)] hover:bg-[var(--soft)]"}`}>{value} {t.common.kwd}</button>)}</div>
              <label htmlFor="topup-amount" className="mb-2 mt-5 block text-xs font-semibold">{copy.wallet.customAmount}</label>
              <div className="flex items-center rounded-xl border border-[var(--line)] bg-[var(--cream)] px-4 focus-within:border-[var(--gold-dark)]"><input id="topup-amount" type="number" inputMode="decimal" min="1" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 outline-none" aria-describedby="topup-min"/><span className="text-xs font-semibold text-[var(--muted)]">{t.common.kwd}</span></div>
              <p id="topup-min" className="mt-2 text-xs text-[var(--muted)]">{copy.wallet.minimumTopup}</p>
            </fieldset>
            {actionError && <p role="alert" className="mt-3 text-sm text-[var(--red)]">{actionError}</p>}
            <button type="submit" disabled={pending} className="gold-button mt-5 w-full disabled:cursor-wait disabled:opacity-60">{pending ? copy.wallet.topupLoading : copy.wallet.topupAction}<ArrowUpRight size={16}/></button>
          </form>
        </section>
      </section>
      <aside className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--gold)]/35 bg-[var(--gold)]/10 p-4 text-sm text-[var(--muted)]"><Bell size={17} className="mt-0.5 shrink-0 text-[var(--gold-dark)]"/><p>{copy.wallet.accountNotice}</p></aside>
      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_310px]">
        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--gold-dark)]">{copy.wallet.activity}</p><h2 className="font-display mt-2 text-2xl font-semibold">{copy.wallet.activity}</h2></div><label className="flex items-center gap-3 text-xs text-[var(--muted)]"><span>{copy.wallet.filter}</span><select value={filter} onChange={event => setFilter(event.target.value as Filter)} className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--gold)]">{filters.map(value => <option key={value} value={value}>{value === "all" ? copy.wallet.allTypes : copy.wallet.types[value]}</option>)}</select></label></div>
          {!data.transactions.length ? <div className="card flex min-h-48 flex-col items-center justify-center p-8 text-center"><span className="text-[var(--gold-dark)]"><ArrowDownLeft size={24}/></span><p className="mt-4 text-sm text-[var(--muted)]">{copy.wallet.empty}</p><Link href="/products" className="mt-4 text-sm font-semibold text-[var(--gold-dark)] underline underline-offset-4">{copy.checkout.browse}</Link></div> :
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
              <div className="hidden grid-cols-[1.2fr_1fr_1.4fr_1fr] gap-4 bg-[var(--soft)] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted)] sm:grid"><span>{copy.wallet.date}</span><span>{copy.wallet.types.topup}</span><span>{copy.wallet.reference}</span><span className="text-end">{copy.wallet.amount}</span></div>
              {data.transactions.map((row, index) => <div key={row.id} className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[1.2fr_1fr_1.4fr_1fr] sm:gap-4 sm:px-5 ${index ? "border-t border-[var(--line)]" : ""}`}>
                <time className="text-xs text-[var(--muted)]" dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleDateString(lang === "ar" ? "ar-KW" : "en-KW", { day: "numeric", month: "short", year: "numeric" })}</time>
                <span className="text-sm font-semibold">{copy.wallet.types[row.type]}</span><span className="col-span-2 truncate text-xs text-[var(--muted)] sm:col-span-1">{row.reference}</span>
                <strong className={`text-end text-sm ${row.amount < 0 ? "text-[var(--red)]" : "text-[var(--green)]"}`}>{row.amount > 0 ? "+" : ""}{currency(row.amount)}</strong>
              </div>)}
            </div>}
        </section>
        <section><h2 className="font-display text-2xl font-semibold">{copy.wallet.recentNotifications}</h2><div className="mt-5 space-y-3">{data.notifications.length ? data.notifications.slice(0, 6).map(note => <article key={note.id} className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm leading-6">{note.text === "wallet_topup_succeeded" ? copy.wallet.topupSucceeded : note.text}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${note.read ? "bg-[var(--soft)] text-[var(--muted)]" : "bg-[var(--gold)]/20 text-[var(--gold-dark)]"}`}>{note.read ? copy.wallet.read : copy.wallet.unread}</span></div><time className="mt-2 block text-[10px] text-[var(--muted)]" dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString(lang === "ar" ? "ar-KW" : "en-KW")}</time></article>) : <p className="rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm leading-6 text-[var(--muted)]">{copy.wallet.noNotifications}</p>}</div></section>
      </div>
    </>}
  </main>;
}

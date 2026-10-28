"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { sectorLabel } from "@/data/sectors";
import { formatKwd } from "@/lib/products";
import { useStore } from "@/lib/store";

type PortfolioData = {
  holdings: Array<{
    product: { id: string; ticker: string; name: string; nameAr: string; image: string; logoBg: string; price: number; sectorKey: string };
    shares: number; costBasis: number; currentValue: number; gain: number;
  }>;
  totalCostBasis: number;
  totalCurrentValue: number;
  totalGain: number;
};

export default function PortfolioClient() {
  const { lang } = useStore();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isArabic = lang === "ar";
  const text = isArabic ? {
    eyebrow: "استثماراتك", title: "محفظة الأسهم", subtitle: "الأسهم التي أُضيفت إلى محفظتك عند قبول الهدايا.",
    empty: "لا توجد أسهم في محفظتك بعد.", browse: "تصفح الشركات", shares: "الأسهم",
    cost: "القيمة عند الاستلام", current: "القيمة الحالية", gain: "التغير منذ الاستلام",
    retry: "حاول مرة أخرى", error: "تعذر تحميل المحفظة. يرجى المحاولة مرة أخرى.",
  } : {
    eyebrow: "YOUR INVESTMENTS", title: "Your portfolio", subtitle: "Shares added to your portfolio when you accept gifts.",
    empty: "No shares in your portfolio yet.", browse: "Browse companies", shares: "Shares",
    cost: "Value when received", current: "Current value", gain: "Change since received",
    retry: "Try again", error: "Your portfolio could not be loaded. Please try again.",
  };
  const currency = (value: number) => formatKwd(value, lang);

  async function load() {
    setLoading(true); setError(false);
    try {
      const response = await fetch("/api/portfolio", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !Array.isArray(body?.holdings)) throw new Error();
      setData(body);
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <main className="page-shell min-h-[65vh] py-10 md:py-16">
    <header className="mb-8 max-w-3xl">
      <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[var(--gold-dark)]">{text.eyebrow}</p>
      <h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">{text.title}</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{text.subtitle}</p>
    </header>
    {loading ? <div className="card p-6" role="status"><div className="h-8 w-44 animate-pulse rounded bg-[var(--soft)]"/><div className="mt-5 h-20 animate-pulse rounded-xl bg-[var(--soft)]"/></div>
      : error ? <section className="card p-7 text-center" role="alert"><p>{text.error}</p><button type="button" onClick={() => void load()} className="outline-button mt-5">{text.retry}</button></section>
        : !data?.holdings.length ? <section className="card flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><BriefcaseBusiness size={24}/></span><h2 className="font-display mt-5 text-2xl font-semibold">{text.empty}</h2><Link href="/products" className="gold-button mt-6">{text.browse}<ArrowRight size={15}/></Link></section>
          : <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-3">
              {[[text.cost, data.totalCostBasis], [text.current, data.totalCurrentValue], [text.gain, data.totalGain]].map(([label, value]) => <article key={String(label)} className="card p-5"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 font-display text-2xl font-semibold">{currency(Number(value))}</p></article>)}
            </section>
            <section className="space-y-3">
              {data.holdings.map(holding => {
                const companyName = isArabic ? holding.product.nameAr : holding.product.name;
                return <article key={holding.product.id} className="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
                  <CompanyLogo src={holding.product.image} name={companyName} logoBg={holding.product.logoBg} className="h-14 w-14 rounded-xl"/>
                  <div className="min-w-0 flex-1"><p className="font-semibold">{companyName}</p><p className="mt-1 text-xs text-[var(--muted)]">{holding.product.ticker} · {sectorLabel(holding.product.sectorKey, lang)}</p></div>
                  <div className="grid w-full grid-cols-3 gap-3 border-t border-[var(--line)] pt-4 text-sm sm:w-auto sm:min-w-[440px] sm:border-t-0 sm:pt-0">
                    <div><p className="text-[10px] text-[var(--muted)]">{text.shares}</p><p className="mt-1 font-semibold">{holding.shares}</p></div>
                    <div><p className="text-[10px] text-[var(--muted)]">{text.cost}</p><p className="mt-1 font-semibold">{currency(holding.costBasis)}</p></div>
                    <div><p className="text-[10px] text-[var(--muted)]">{text.current}</p><p className="mt-1 font-semibold">{currency(holding.currentValue)}</p></div>
                  </div>
                  <p className={`w-full border-t border-[var(--line)] pt-3 text-xs sm:border-0 sm:pt-0 ${holding.gain >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>{text.gain}: {currency(holding.gain)}</p>
                </article>;
              })}
            </section>
          </div>}
  </main>;
}

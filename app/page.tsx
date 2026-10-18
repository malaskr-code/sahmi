"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Gift, Heart, Sparkles, Wallet } from "lucide-react";
import { getProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
const stepsIcons=[Wallet,Gift,Heart];
const occasionMarks=["✦","✧","◌","⌂","◇","＋"];
export default function HomePage(){
 const {t}=useStore(), products=getProducts().slice(0,4);
 return <div>
  <section className="page-shell pt-8 md:pt-12">
   <div className="relative overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper)] px-7 py-14 shadow-[var(--shadow)] md:px-16 md:py-20">
    <div className="pointer-events-none absolute -right-24 -top-28 h-[360px] w-[360px] rounded-full border border-[var(--gold)]/25 md:right-[-30px] md:top-[-90px] md:h-[510px] md:w-[510px]"></div>
    <div className="pointer-events-none absolute -right-12 -top-16 h-[270px] w-[270px] rounded-full border border-[var(--gold)]/15 md:right-[20px] md:top-[-30px] md:h-[390px] md:w-[390px]"></div>
    <div className="pointer-events-none absolute right-[10%] top-[34%] hidden h-2 w-2 rounded-full bg-[var(--gold)] md:block"></div>
    <div className="relative max-w-[630px] fade-up">
     <span className="pill !bg-[var(--gold)]/15 !text-[var(--gold-dark)]">{t.home.eyebrow}</span>
     <h1 className="font-display mt-6 max-w-[620px] text-5xl font-semibold leading-[1.08] tracking-[-.04em] md:text-[72px]">{t.home.title}</h1>
     <p className="mt-5 max-w-[480px] text-base leading-7 text-[var(--muted)] md:text-lg">{t.home.subtitle}</p>
     <Link className="gold-button mt-8" href="/products">{t.home.browse}<ArrowRight size={17}/></Link>
     <div className="mt-10 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><Sparkles size={15}/></span>{t.home.disclaimer}</div>
    </div>
   </div>
  </section>
  <section className="page-shell pt-20 md:pt-28">
   <div className="mb-8 max-w-xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.home.how}</p><h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">{t.home.howSub}</h2></div>
   <div className="grid gap-4 md:grid-cols-3">{t.home.steps.map((step,i)=>{const Icon=stepsIcons[i];return <article key={step} className="relative border-t border-[var(--line)] py-6 md:py-8"><div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[var(--gold-dark)]"><Icon size={20}/></span><span className="font-display text-4xl text-[var(--gold)]">0{i+1}</span></div><h3 className="mt-5 text-lg font-semibold">{step}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{t.home.stepDesc[i]}</p></article>})}</div>
  </section>
  <section className="page-shell pt-16 md:pt-24">
   <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.home.occasions}</p><h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">{t.home.occasionSub}</h2></div></div>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">{t.home.occasionsList.map((occasion,i)=><Link key={occasion} href="/products" className="group flex min-h-[118px] flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 transition hover:-translate-y-1 hover:border-[var(--gold)]"><span className="text-2xl text-[var(--gold-dark)]">{occasionMarks[i]}</span><span className="text-sm font-semibold">{occasion}</span></Link>)}</div>
  </section>
  <section className="page-shell pt-20 md:pt-28">
   <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.home.featured}</p><h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">{t.home.featuredSub}</h2></div><Link href="/products" className="outline-button">{t.home.all}<ArrowUpRight size={16}/></Link></div>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>
  </section>
  <section className="page-shell pt-20"><div className="flex flex-col items-start justify-between gap-6 rounded-[16px] bg-[var(--soft)] p-7 md:flex-row md:items-center md:px-10 md:py-9"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--gold-dark)]">{t.home.confidence}</p><p className="font-display mt-3 max-w-xl text-2xl leading-snug md:text-3xl">{t.home.confidenceText}</p></div><Link className="gold-button shrink-0" href="/products">{t.home.browse}<ArrowRight size={16}/></Link></div></section>
 </div>
}

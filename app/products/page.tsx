"use client";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { getProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
export default function ProductsPage(){
 const {t,lang}=useStore(),[query,setQuery]=useState(""),[sector,setSector]=useState("all");
 const all=getProducts(),sectors=Array.from(new Set(all.map(p=>p.sector)));
 const filtered=useMemo(()=>all.filter(p=>(sector==="all"||p.sector===sector)&&(`${p.name} ${p.nameAr} ${p.sector} ${p.sectorAr}`.toLowerCase().includes(query.toLowerCase()))),[all,query,sector]);
 return <div className="page-shell min-h-[60vh] pt-12 md:pt-16">
  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.store.fictional}</p><h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">{t.store.title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">{t.store.subtitle}</p></div><span className="pill">{all.length} <span className="ml-1">{t.common.companies}</span></span></div>
  <div className="mt-8 flex flex-col gap-3 md:flex-row">
   <label className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17}/><input className="h-12 w-full rounded-full border border-[var(--line)] bg-[var(--paper)] pl-11 pr-4 text-sm outline-none transition focus:border-[var(--gold)]" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.store.search}/></label>
   <label className="relative flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4"><SlidersHorizontal size={16} className="text-[var(--gold-dark)]"/><select className="h-12 min-w-[155px] bg-transparent text-sm outline-none" value={sector} onChange={e=>setSector(e.target.value)}><option value="all">{t.store.all}</option>{sectors.map(s=><option key={s} value={s}>{lang==="ar"?all.find(p=>p.sector===s)?.sectorAr:s}</option>)}</select></label>
  </div>
  {filtered.length?<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="card mt-8 flex min-h-56 flex-col items-center justify-center text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><Search size={19}/></div><p className="font-semibold">{t.store.empty}</p><button className="mt-3 text-sm font-semibold text-[var(--gold-dark)] underline underline-offset-4" onClick={()=>{setQuery("");setSector("all")}}>{t.store.clear}</button></div>}
 </div>
}

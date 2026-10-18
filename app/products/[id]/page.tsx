"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import { getProduct, formatKwd, SERVICE_FEE } from "@/lib/products";
import { useStore } from "@/lib/store";
export default function ProductDetailPage(){
 const params=useParams<{id:string}>(),product=getProduct(params.id),{t,lang,gift,setGift}=useStore();
 const [mode,setMode]=useState<"shares"|"budget">("shares"),[shares,setShares]=useState(10),[custom,setCustom]=useState(""),[budget,setBudget]=useState(""),[confirm,setConfirm]=useState(false),[added,setAdded]=useState(false);
 const count=mode==="shares"?(custom?Math.max(0,Math.floor(Number(custom)||0)):shares):product?Math.max(0,Math.floor((Number(budget)||0)/product.price)):0;
 const subtotal=product?count*product.price:0,total=subtotal+SERVICE_FEE;
 const name=product?(lang==="ar"?product.nameAr:product.name):"";
 const currency=(amount:number)=>formatKwd(amount,lang);
 const add=()=>{if(!product||count<1)return;if(gift){setConfirm(true);return}setGift({product,shares:count});setAdded(true)};
 const finishReplace=()=>{if(product)setGift({product,shares:count});setConfirm(false);setAdded(true)};
 if(!product)return <div className="page-shell min-h-[55vh] pt-16"><Link href="/products" className="outline-button"><ArrowLeft size={16}/>{t.product.back}</Link><div className="card mt-8 p-8 text-center">{t.common.error} <Link className="text-[var(--gold-dark)] underline" href="/products">{t.product.back}</Link></div></div>;
 return <div className="page-shell min-h-[60vh] pt-8 md:pt-12">
  <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--gold-dark)]"><ArrowLeft size={16}/>{t.product.back}</Link>
  <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_420px]">
   <div>
    <div className="card overflow-hidden p-7 md:p-10">
     <div className="flex items-start justify-between gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-[var(--soft)] font-display text-lg font-bold text-[var(--gold-dark)]">{product.name.split(/\s+/).map(w=>w[0]).slice(0,3).join("")}</div><span className="pill">{t.product.demo}</span></div>
     <p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[var(--gold-dark)]">{lang==="ar"?product.sectorAr:product.sector}</p>
     <h1 className="font-display mt-3 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">{name}</h1>
     <p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">{lang==="ar"?product.descriptionAr:product.description}</p>
     <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-[var(--line)] pt-6"><div><p className="text-xs text-[var(--muted)]">{t.common.samplePrice}</p><p className="mt-1 text-2xl font-bold">{currency(product.price)}</p></div><p className={`text-sm font-semibold ${product.change>=0?"text-[var(--green)]":"text-[var(--red)]"}`}>{product.change>=0?"+":""}{product.change.toFixed(2)}% <span className="text-[var(--muted)]">{t.common.change}</span></p></div>
     <div className="mt-6 rounded-lg bg-[var(--soft)] p-4 text-xs leading-5 text-[var(--muted)]">{t.store.fictional} · {t.footer.simulation}</div>
    </div>
   </div>
   <aside className="card h-fit p-6 md:p-7">
    <h2 className="font-display text-2xl font-semibold">{t.product.calculator}</h2>
    <div className="mt-5 grid grid-cols-2 rounded-full bg-[var(--soft)] p-1"><button onClick={()=>setMode("shares")} className={`rounded-full px-3 py-2 text-sm font-semibold transition ${mode==="shares"?"bg-[var(--paper)] shadow-sm":""}`}>{t.product.byShares}</button><button onClick={()=>setMode("budget")} className={`rounded-full px-3 py-2 text-sm font-semibold transition ${mode==="budget"?"bg-[var(--paper)] shadow-sm":""}`}>{t.product.byBudget}</button></div>
    {mode==="shares"?<div className="mt-5"><label className="text-sm font-semibold">{t.product.quantity}</label><div className="mt-3 flex gap-2">{[10,50,100].map(n=><button key={n} onClick={()=>{setShares(n);setCustom("")}} className={`flex-1 rounded-full border px-2 py-2.5 text-sm font-semibold ${shares===n&&!custom?"border-[var(--gold)] bg-[var(--gold)]/15":"border-[var(--line)]"}`}>{n}</button>)}</div><label className="mt-4 block text-xs text-[var(--muted)]">{t.product.custom}</label><div className="mt-2 flex items-center rounded-lg border border-[var(--line)] px-3"><button aria-label={t.common.decrease} onClick={()=>{setCustom("");setShares(v=>Math.max(1,v-1))}}><Minus size={15}/></button><input type="number" min="1" value={custom||shares} onChange={e=>{setCustom(e.target.value);if(!e.target.value)setShares(10)}} className="w-full bg-transparent p-3 text-center outline-none"/><button aria-label={t.common.increase} onClick={()=>{setCustom("");setShares(v=>v+1)}}><Plus size={15}/></button></div></div>:<div className="mt-5"><label className="text-sm font-semibold">{t.product.budget}</label><div className="mt-2 flex items-center rounded-lg border border-[var(--line)] px-3"><input type="number" min="0" step="0.001" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="0.000" className="w-full bg-transparent p-3 outline-none"/><span className="text-xs text-[var(--muted)]">{t.common.kwd}</span></div><p className="mt-2 text-xs text-[var(--muted)]">{t.product.shares}: <strong className="text-[var(--ink)]">{count}</strong></p></div>}
    <div className="mt-6 space-y-3 border-t border-[var(--line)] pt-5 text-sm"><div className="flex justify-between"><span className="text-[var(--muted)]">{t.product.shares}</span><span>{count}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">{t.product.subtotal}</span><span>{currency(subtotal)}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">{t.product.fee}</span><span>{currency(SERVICE_FEE)}</span></div><div className="flex justify-between border-t border-[var(--line)] pt-3 text-base font-bold"><span>{t.product.total}</span><span>{currency(total)}</span></div></div>
    {count<1&&(custom!==""||budget!=="")&&<p role="alert" className="mt-3 text-xs font-medium text-[var(--red)]">{t.product.outOfRange}</p>}
    <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{t.product.feeNote}</p>
    <button disabled={count<1} onClick={add} className="gold-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">{added?<><Check size={17}/>{t.product.added}</>:t.product.add}</button>
   </aside>
  </div>
  {confirm&&<div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 p-5"><div className="card w-full max-w-md p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--gold-dark)]">{t.product.demo}</p><h2 className="font-display mt-3 text-2xl font-semibold">{t.product.replaceTitle}</h2><p className="mt-3 leading-6 text-[var(--muted)]">{t.product.replaceText}</p><div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={()=>setConfirm(false)} className="outline-button">{t.product.cancel}</button><button onClick={finishReplace} className="gold-button">{t.product.replace}</button></div></div></div>}
 </div>
}

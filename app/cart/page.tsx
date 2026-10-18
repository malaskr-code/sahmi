"use client";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { formatKwd, SERVICE_FEE } from "@/lib/products";
import { useStore } from "@/lib/store";
export default function CartPage(){
 const {t,lang,gift,setGift}=useStore();
 const currency=(amount:number)=>formatKwd(amount,lang);
 if(!gift)return <div className="page-shell min-h-[55vh] pt-12 md:pt-16"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.cart.title}</p><h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">{t.cart.emptyTitle}</h1><p className="mt-3 text-[var(--muted)]">{t.cart.emptyText}</p><div className="card mt-8 flex min-h-72 flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><ShoppingBag size={24}/></div><p className="mt-5 max-w-sm leading-6 text-[var(--muted)]">{t.cart.emptyText}</p><Link href="/products" className="gold-button mt-6">{t.cart.browse}<ArrowRight size={16}/></Link></div></div>;
 const product=gift.product,name=lang==="ar"?product.nameAr:product.name;
 return <div className="page-shell min-h-[55vh] pt-12 md:pt-16">
  <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.cart.title}</p><h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">{t.cart.title}</h1><p className="mt-3 text-[var(--muted)]">{t.cart.subtitle}</p>
  <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
   <section className="card p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5"><div className="flex gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-[var(--soft)] font-display text-sm font-bold text-[var(--gold-dark)]">{product.name.split(/\s+/).map(w=>w[0]).slice(0,3).join("")}</div><div><span className="pill">{lang==="ar"?product.sectorAr:product.sector}</span><h2 className="mt-2 font-semibold">{name}</h2></div></div><button onClick={()=>setGift(null)} className="outline-button !px-3 !py-2 text-xs text-[var(--red)]"><Trash2 size={14}/>{t.cart.remove}</button></div>
    <div className="grid gap-5 pt-5 sm:grid-cols-3"><div><p className="text-xs text-[var(--muted)]">{t.cart.price}</p><p className="mt-1 font-semibold">{currency(product.price)}</p></div><div><p className="text-xs text-[var(--muted)]">{t.cart.shares}</p><div className="mt-1 flex w-fit items-center gap-4 rounded-full border border-[var(--line)] px-2 py-1"><button aria-label={t.common.decrease} onClick={()=>setGift({product,shares:Math.max(1,gift.shares-1)})}><Minus size={14}/></button><span className="min-w-5 text-center font-semibold">{gift.shares}</span><button aria-label={t.common.increase} onClick={()=>setGift({product,shares:gift.shares+1})}><Plus size={14}/></button></div></div><div><p className="text-xs text-[var(--muted)]">{t.cart.subtotal}</p><p className="mt-1 font-semibold">{currency(gift.shares*product.price)}</p></div></div>
   </section>
   <aside className="card h-fit p-6"><h2 className="font-display text-2xl font-semibold">{t.cart.title}</h2><div className="mt-5 space-y-4 border-b border-[var(--line)] pb-5 text-sm"><div className="flex justify-between"><span className="text-[var(--muted)]">{t.cart.subtotal}</span><span>{currency(gift.shares*product.price)}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">{t.cart.fee}</span><span>{currency(SERVICE_FEE)}</span></div></div><div className="flex justify-between py-5 text-base font-bold"><span>{t.cart.total}</span><span>{currency(gift.shares*product.price+SERVICE_FEE)}</span></div><button disabled className="gold-button w-full cursor-not-allowed opacity-55">{t.cart.checkout}<span className="pill !bg-black/10 !text-[10px]">{t.cart.coming}</span></button><p className="mt-4 text-center text-xs leading-5 text-[var(--muted)]">{t.cart.demo}</p></aside>
  </div>
 </div>
}

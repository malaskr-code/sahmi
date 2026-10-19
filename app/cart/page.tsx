"use client";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { formatKwd, SERVICE_FEE } from "@/lib/products";
import { CardThemePreview } from "@/components/CardThemePreview";
import { useStore } from "@/lib/store";
import { useProducts } from "@/lib/use-products";
import { ProductFeedback } from "@/components/ProductFeedback";
import { CompanyLogo } from "@/components/CompanyLogo";
export default function CartPage(){
 const {t,lang,gift,setGift}=useStore();
 const {product:currentProduct,loading,error,notFound,retry}=useProducts(gift?.product.id??null);
 const currency=(amount:number)=>formatKwd(amount,lang);
 if(!gift)return <div className="page-shell min-h-[55vh] pt-12 md:pt-16"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.cart.title}</p><h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">{t.cart.emptyTitle}</h1><p className="mt-3 text-[var(--muted)]">{t.cart.emptyText}</p><div className="card mt-8 flex min-h-72 flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><ShoppingBag size={24}/></div><p className="mt-5 max-w-sm leading-6 text-[var(--muted)]">{t.cart.emptyText}</p><Link href="/products" className="gold-button mt-6">{t.cart.browse}<ArrowRight size={16}/></Link></div></div>;
 if(loading||error||!currentProduct)return <div className="page-shell min-h-[55vh] pt-12 md:pt-16"><h1 className="font-display text-4xl font-semibold">{t.cart.title}</h1><ProductFeedback loading={loading||(!error&&!currentProduct)} error={error} notFound={notFound} retry={retry}/>{notFound&&<button onClick={()=>setGift(null)} className="outline-button">{t.cart.remove}</button>}</div>;
 const product=currentProduct,name=lang==="ar"?product.nameAr:product.name;
 return <div className="page-shell min-h-[55vh] pt-12 md:pt-16">
  <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.cart.title}</p><h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">{t.cart.title}</h1><p className="mt-3 text-[var(--muted)]">{t.cart.subtitle}</p>
  <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
   <section className="card p-5 md:p-7">
     <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5"><div className="flex gap-4"><CompanyLogo src={product.image} name={name} className="h-14 w-14 rounded-xl"/><div><span className="pill">{lang==="ar"?product.sectorAr:product.sector}</span><h2 className="mt-2 font-semibold">{name}</h2></div></div><button onClick={()=>setGift(null)} className="outline-button !px-3 !py-2 text-xs text-[var(--red)]"><Trash2 size={14}/>{t.cart.remove}</button></div>
     <div className="grid gap-5 pt-5 sm:grid-cols-3"><div><p className="text-xs text-[var(--muted)]">{t.cart.price}</p><p className="mt-1 font-semibold">{currency(product.price)}</p></div><div><p className="text-xs text-[var(--muted)]">{t.cart.shares}</p><div className="mt-1 flex w-fit items-center gap-4 rounded-full border border-[var(--line)] px-2 py-1"><button aria-label={t.common.decrease} onClick={()=>setGift({...gift,shares:Math.max(1,gift.shares-1)})}><Minus size={14}/></button><span className="min-w-5 text-center font-semibold">{gift.shares}</span><button aria-label={t.common.increase} onClick={()=>setGift({...gift,shares:gift.shares+1})}><Plus size={14}/></button></div></div><div><p className="text-xs text-[var(--muted)]">{t.cart.subtotal}</p><p className="mt-1 font-semibold">{currency(gift.shares*product.price)}</p></div></div>
     <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-5">
      <div className="w-24 shrink-0"><CardThemePreview theme={gift.theme}/></div>
      <div><p className="text-xs text-[var(--muted)]">{t.cart.theme}</p><p className="mt-1 font-semibold">{t.product.themeNames[gift.theme]}</p></div>
      <Link href={`/products/${product.id}#gift-builder`} className="ms-auto text-sm font-semibold text-[var(--gold-dark)] underline underline-offset-4">{t.cart.changeTheme}</Link>
     </div>
   </section>
     <aside className="card h-fit p-6"><h2 className="font-display text-2xl font-semibold">{t.cart.title}</h2><div className="mt-5 space-y-4 border-b border-[var(--line)] pb-5 text-sm"><div className="flex justify-between"><span className="text-[var(--muted)]">{t.cart.subtotal}</span><span>{currency(gift.shares*product.price)}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">{t.cart.fee}</span><span>{currency(SERVICE_FEE)}</span></div></div><div className="flex justify-between py-5 text-base font-bold"><span>{t.cart.total}</span><span>{currency(gift.shares*product.price+SERVICE_FEE)}</span></div><Link href="/checkout" className="gold-button w-full">{t.cart.checkout}<ArrowRight size={16}/></Link></aside>
  </div>
 </div>
}

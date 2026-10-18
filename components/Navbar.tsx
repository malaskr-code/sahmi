"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Moon, Sun, ShoppingBag } from "lucide-react";
export function Navbar(){
 const {t,lang,setLang,dark,toggleTheme,gift}=useStore();
 return <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--cream)]/95 backdrop-blur">
  <div className="page-shell">
   <div className="flex min-h-[72px] items-center justify-between gap-3">
    <Link href="/" aria-label={`${t.nav.home} — Sahmi`} className="leading-none"><span className="font-display text-[26px] font-bold tracking-tight text-[var(--gold-dark)]">Sahmi</span><span className="arabic mt-1 block text-center text-[12px] font-semibold text-[var(--ink)]">سهمي</span></Link>
    <nav className="hidden items-center gap-7 text-sm font-medium md:flex"><Link className="hover:text-[var(--gold-dark)]" href="/">{t.nav.home}</Link><Link className="hover:text-[var(--gold-dark)]" href="/products">{t.nav.store}</Link></nav>
    <div className="flex items-center gap-2">
     <div className="hidden rounded-full bg-[var(--soft)] px-3 py-2 text-[10px] font-semibold text-[var(--muted)] lg:block">{t.nav.demo}</div>
     <button onClick={()=>setLang(lang==="en"?"ar":"en")} aria-label={t.nav.language} className="outline-button !px-3 !py-2 text-xs">{t.nav.language}</button>
     <button onClick={toggleTheme} aria-label={dark?t.nav.light:t.nav.dark} className="outline-button !p-2.5">{dark?<Sun size={16}/>:<Moon size={16}/>}</button>
     <Link href="/cart" aria-label={t.nav.cart} className="relative rounded-full border border-[var(--line)] p-2.5 transition hover:border-[var(--gold)]"><ShoppingBag size={17}/>{gift&&<span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-[#241f13]">1</span>}</Link>
     <Link className="hidden pl-1 text-sm font-semibold md:inline" href="/login">{t.nav.login}</Link>
    </div>
   </div>
   <div className="flex justify-center gap-8 pb-3 text-xs font-semibold md:hidden"><Link href="/">{t.nav.home}</Link><Link href="/products">{t.nav.store}</Link><Link href="/login">{t.nav.login}</Link></div>
   <div className="border-t border-[var(--line)] py-2 text-center text-[10px] font-semibold text-[var(--muted)] lg:hidden">{t.nav.demo}</div>
  </div>
 </header>
}

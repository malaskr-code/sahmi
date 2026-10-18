"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/product-types";
import { formatKwd } from "@/lib/products";
import { useStore } from "@/lib/store";
export function ProductCard({product}:{product:Product}){
  const {lang,t}=useStore(), name=lang==="ar"?product.nameAr:product.name, sector=t.common.sectors[product.sector as keyof typeof t.common.sectors]??product.sector;
 return <Link href={`/products/${product.id}`} className="card group block p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--gold)]">
   <div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--gold)]/35 bg-[var(--soft)] font-display text-sm font-bold text-[var(--gold-dark)]">{product.name.split(/\s+/).map(w=>w[0]).slice(0,3).join("")}</div><span className="pill">{lang==="ar"?product.sectorAr:sector}</span></div>
  <div className="mt-5 flex items-start justify-between gap-2"><h3 className="min-h-[48px] text-[16px] font-semibold leading-6">{name}</h3><ArrowUpRight size={16} className="mt-1 shrink-0 text-[var(--muted)] transition group-hover:text-[var(--gold-dark)]"/></div>
  <p className="mt-3 text-lg font-bold tracking-tight">{formatKwd(product.price,lang)}</p>
  <p className={`mt-1 text-xs font-semibold ${product.change>=0?"text-[var(--green)]":"text-[var(--red)]"}`}>{product.change>=0?"+":""}{product.change.toFixed(2)}% <span className="font-normal text-[var(--muted)]">{t.common.change}</span></p>
 </Link>
}

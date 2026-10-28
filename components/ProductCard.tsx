"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { Product } from "@/lib/product-types";
import { formatKwd } from "@/lib/products";
import { useStore } from "@/lib/store";
import { sectorLabel } from "@/data/sectors";
import { ExchangeRateAttribution } from "@/components/ExchangeRateAttribution";
export function ProductCard({product}:{product:Product}){
  const {lang,t}=useStore(), name=lang==="ar"?product.nameAr:product.name, sector=sectorLabel(product.sectorKey,lang);
 return <article className="card group block p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--gold)]">
    <Link href={`/products/${product.id}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)]">
      <div className="flex items-start justify-between"><CompanyLogo src={product.image} name={name} logoBg={product.logoBg} className="h-14 w-14 rounded-xl"/><span className="pill">{sector}</span></div>
      <div className="mt-5 flex items-start justify-between gap-2"><h3 className="min-h-[48px] text-[16px] font-semibold leading-6">{name}</h3><ArrowUpRight size={16} className="mt-1 shrink-0 text-[var(--muted)] transition group-hover:text-[var(--gold-dark)]"/></div>
      <p className="mt-3 text-lg font-bold tracking-tight">{formatKwd(product.price,lang)}{product.type === "metal" && <span dir="ltr" className="ms-1 text-xs font-medium text-[var(--muted)]">{lang === "ar" ? "/ غ" : "/ g"}</span>}</p>
      {product.type !== "metal" && <p className={`mt-1 text-xs font-semibold ${product.change>=0?"text-[var(--green)]":"text-[var(--red)]"}`}>{product.change>=0?"+":""}{product.change.toFixed(2)}% <span className="font-normal text-[var(--muted)]">{t.common.change}</span></p>}
    </Link>
    {product.type === "metal" && <ExchangeRateAttribution />}
  </article>
}

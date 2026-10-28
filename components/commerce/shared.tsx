"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ArrowUpRight, RefreshCw } from "lucide-react";
import { commerceCopy } from "@/data/commerce-copy";
import { formatKwd } from "@/lib/products";
import { useStore } from "@/lib/store";

export type Lang = "en" | "ar";
export type Copy = (typeof commerceCopy)[keyof typeof commerceCopy];
export type GiftCompanyItem = {
  company: { ticker: string; type: "share" | "metal"; name: string; nameAr: string; image: string; logoBg: string };
  shares: number;
  priceAtPurchase: number;
  currentValue: number;
};
export type GiftRecord = {
  id: string;
  direction: "sent" | "received";
  items: GiftCompanyItem[];
  company: { ticker: string; type: "share" | "metal"; name: string; nameAr: string; image: string; logoBg: string };
  shares: number;
  priceAtPurchase: number;
  currentValue: number;
  recipientName: string;
  message: string;
  occasion: string;
  theme: "eid" | "graduation" | "birthday" | "newborn" | "wedding" | "general";
  status: string;
  redeemedAt: string | null;
  createdAt: string;
  code: string | null;
};

export function useCommerce() {
  const { lang, dark } = useStore();
  const copy = commerceCopy[lang];
  const currency = (amount: number) => formatKwd(amount, lang);
  return { lang, dark, copy, currency };
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[var(--gold-dark)]">{children}</p>;
}

export function LoadingPanel({ text }: { text: string }) {
  return <div className="card mx-auto mt-8 max-w-3xl p-6 md:p-8" role="status" aria-live="polite">
    <span className="sr-only">{text}</span>
    <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--soft)]" />
    <div className="mt-5 h-8 max-w-sm animate-pulse rounded-lg bg-[var(--soft)]" />
    <div className="mt-4 h-4 max-w-xl animate-pulse rounded-full bg-[var(--soft)]" />
    <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="h-28 animate-pulse rounded-xl bg-[var(--soft)]" /><div className="h-28 animate-pulse rounded-xl bg-[var(--soft)]" /></div>
  </div>;
}

export function ErrorPanel({ text, retry }: { text: string; retry?: () => void }) {
  const { copy } = useCommerce();
  return <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--red)]/30 bg-[var(--red)]/5 p-4 text-sm" role="alert">
    <AlertCircle className="mt-0.5 shrink-0 text-[var(--red)]" size={18} />
    <div className="flex-1 text-[var(--ink)]">{text}</div>
    {retry && <button type="button" onClick={retry} className="outline-button !px-3 !py-2 text-xs"><RefreshCw size={14}/>{copy.wallet.retry}</button>}
  </div>;
}

export function PageIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <header className="fade-up mb-8 max-w-3xl"><Eyebrow>{eyebrow}</Eyebrow><h1 className="font-display mt-3 text-4xl font-semibold leading-[1.08] md:text-5xl">{title}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">{subtitle}</p></header>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold-dark)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
    {children}<ArrowUpRight size={15} aria-hidden="true"/>
  </Link>;
}

export function responseError(copy: (typeof commerceCopy)[keyof typeof commerceCopy], data: { code?: string } | null, fallback: string) {
  const code = data?.code;
  const errors = copy.errors as Record<string, string>;
  return code && errors[code] ? errors[code] : fallback;
}

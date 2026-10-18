"use client";

import Link from "next/link";
import { ArrowLeft, Gift, ShieldCheck, WalletCards } from "lucide-react";
import { accountCopy, type AccountKind } from "@/data/account-copy";
import { useStore } from "@/lib/store";

const icons = {
  wallet: WalletCards,
  gifts: Gift,
  portfolio: WalletCards,
  checkout: Gift,
  admin: ShieldCheck,
};

export function AccountEmpty({ kind }: { kind: AccountKind }) {
  const { lang } = useStore();
  const content = accountCopy[lang].empty[kind];
  const Icon = icons[kind];
  return (
    <div className="page-shell py-12 md:py-20">
      <section className="card fade-up mx-auto max-w-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-[var(--gold)]" />
        <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]">
            <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-dark)]">{content.eyebrow}</p>
          <h1 className="font-display mt-3 text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">{content.title}</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">{content.body}</p>
          <Link href={content.href} className="gold-button mt-8">
            <ArrowLeft size={16} aria-hidden="true" />
            {content.action}
          </Link>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { useStore } from "@/lib/store";

export default function RedeemPage() {
  const { t } = useStore();

  return (
    <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="card w-full max-w-xl px-6 py-12 text-center md:p-16">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[var(--gold-dark)]">
          <Gift size={28} />
        </span>
        <h1 className="font-display mt-6 text-4xl font-semibold">{t.redeem.title}</h1>
        <p className="mt-4 text-[var(--muted)]">{t.redeem.subtitle}</p>
        <Link href="/products" className="gold-button mt-8">
          {t.redeem.back}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

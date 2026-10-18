"use client";

import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { accountCopy } from "@/data/account-copy";
import { useStore } from "@/lib/store";

export default function Forbidden() {
  const { lang } = useStore();
  const copy = accountCopy[lang].forbidden;
  return (
    <div className="page-shell flex min-h-[70dvh] items-center justify-center py-12">
      <section className="card fade-up w-full max-w-2xl px-6 py-10 text-center sm:px-12 sm:py-14">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]">
          <ShieldAlert size={25} strokeWidth={1.7} aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-dark)]">{copy.eyebrow}</p>
        <h1 className="font-display mt-3 text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">{copy.body}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="gold-button"><ArrowLeft size={16} aria-hidden="true" />{copy.home}</Link>
          <Link href="/login" className="outline-button">{copy.login}</Link>
        </div>
      </section>
    </div>
  );
}

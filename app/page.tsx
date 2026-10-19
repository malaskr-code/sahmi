"use client";

import Link from "next/link";
import {
  ArrowRight,
  Gift,
  Heart,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";

const stepIcons = [Wallet, Gift, Heart];

export default function HomePage() {
  const { t } = useStore();

  return (
    <div>
      <section className="page-shell home-hero">
        <div className="relative flex min-h-[540px] items-center overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper)] px-7 py-16 shadow-[var(--shadow)] md:min-h-[640px] md:px-16 md:py-24">
          <div className="pointer-events-none absolute -right-24 -top-28 h-[360px] w-[360px] rounded-full border border-[var(--gold)]/25 md:right-[-30px] md:top-[-90px] md:h-[510px] md:w-[510px]" />
          <div className="pointer-events-none absolute -right-12 -top-16 h-[270px] w-[270px] rounded-full border border-[var(--gold)]/15 md:right-[20px] md:top-[-30px] md:h-[390px] md:w-[390px]" />
          <div className="pointer-events-none absolute right-[10%] top-[34%] hidden h-2 w-2 rounded-full bg-[var(--gold)] md:block" />
          <div className="relative max-w-[630px] fade-up">
            <h1 className="font-display max-w-[620px] text-5xl font-semibold leading-[1.08] tracking-[-.04em] md:text-[72px]">
              {t.home.title}
            </h1>
            <p className="mt-6 max-w-[480px] text-base leading-7 text-[var(--muted)] md:text-lg">
              {t.home.subtitle}
            </p>
            <Link className="gold-button mt-10" href="/products">
              {t.home.browse}
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="page-shell home-section">
        <div className="mb-8 max-w-xl">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">{t.home.howSub}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {t.home.steps.map((step, index) => {
            const Icon = stepIcons[index];
            return (
              <article key={step} className="relative border-t border-[var(--line)] py-6 md:py-8">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[var(--gold-dark)]">
                    <Icon size={20} />
                  </span>
                  <span className="font-display text-4xl text-[var(--gold)]">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{t.home.stepDesc[index]}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

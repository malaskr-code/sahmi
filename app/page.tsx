"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Gift,
  Heart,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";

const stepIcons = [Wallet, Gift, Heart];
const ScrollMorphHero = dynamic(() => import("@/components/ui/scroll-morph-hero"), {
  ssr: false,
  loading: () => <div className="aspect-square w-full" aria-hidden="true" />,
});

export default function HomePage() {
  const { t, lang, dark } = useStore();

  return (
    <div>
      <section className="page-shell home-hero">
        <div className="relative grid min-h-[540px] items-center gap-4 overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper)] px-7 py-16 shadow-[var(--shadow)] md:min-h-[640px] md:grid-cols-[1fr_.85fr] md:gap-2 md:px-16 md:py-24">
          <div className="relative z-10 max-w-[630px] fade-up">
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
          <div className="relative mx-auto mt-5 w-full max-w-[300px] md:mt-0 md:max-w-[480px]">
            <ScrollMorphHero lang={lang} dark={dark} />
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

"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Gift,
  Heart,
  Landmark,
  Monitor,
  Radio,
  Truck,
  Wallet,
} from "lucide-react";
import { useProducts } from "@/lib/use-products";
import { ProductFeedback } from "@/components/ProductFeedback";
import { useStore } from "@/lib/store";
import { SECTOR_GROUPS } from "@/data/sectorGroups";

const stepIcons = [Wallet, Gift, Heart];
const sectorIcons = {
  banks: Landmark,
  telecom: Radio,
  "real-estate": Building2,
  "logistics-industry": Truck,
  "technology-services": Monitor,
};

export default function HomePage() {
  const { t } = useStore();
  const { products, loading, error, retry } = useProducts();

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
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.home.how}</p>
          <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">{t.home.howSub}</h2>
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

      <section className="page-shell home-section">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{t.explore.eyebrow}</p>
          <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">{t.explore.title}</h2>
        </div>
        <ProductFeedback loading={loading} error={error} retry={retry} />
        {!loading && !error && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {SECTOR_GROUPS.map((group) => {
            const Icon = sectorIcons[group.id];
            const count = products.filter((product) =>
              (group.sectors as readonly string[]).includes(product.sector),
            ).length;
            return (
              <Link
                key={group.id}
                href={`/products?sector=${group.id}`}
                className="group flex min-h-[150px] flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 transition hover:-translate-y-1 hover:border-[var(--gold)] md:p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)] transition group-hover:bg-[var(--gold)]/15">
                  <Icon size={19} />
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-5">{t.explore.sectors[group.id]}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {count} {t.explore.companyCount}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="card flex flex-col items-start justify-between gap-6 p-6 md:p-8 xl:flex-row xl:items-center">
            <div>
              <h3 className="font-display text-2xl font-semibold">{t.explore.receivedTitle}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{t.explore.receivedText}</p>
            </div>
            <Link href="/redeem" className="gold-button shrink-0">
              {t.explore.redeem}
              <ArrowRight size={16} />
            </Link>
          </article>
          <article className="card flex flex-col items-start justify-between gap-6 p-6 md:p-8 xl:flex-row xl:items-center">
            <div>
              <h3 className="font-display text-2xl font-semibold">{t.explore.browseTitle}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{t.explore.browseText}</p>
            </div>
            <Link href="/products" className="outline-button shrink-0">
              {t.explore.browse}
              <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}

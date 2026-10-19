"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Landmark,
  Monitor,
  Radio,
  Search,
  Truck,
} from "lucide-react";
import { useProducts } from "@/lib/use-products";
import { ProductFeedback } from "@/components/ProductFeedback";
import { PricesAsOf } from "@/components/PricesAsOf";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import { SECTOR_GROUPS, type SectorGroupId } from "@/data/sectorGroups";

const sectorIcons = {
  banks: Landmark,
  telecom: Radio,
  "real-estate": Building2,
  "logistics-industry": Truck,
  "technology-services": Monitor,
};

function isSectorGroup(value: string | null): value is SectorGroupId {
  return SECTOR_GROUPS.some(group => group.id === value);
}

function ProductsContent() {
  const { t } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const { products: all, loading, error, retry } = useProducts();
  const requestedSector = searchParams.get("sector");
  const sector: SectorGroupId | "all" = isSectorGroup(requestedSector) ? requestedSector : "all";

  const filtered = useMemo(() => {
    const group = SECTOR_GROUPS.find(item => item.id === sector);
    const normalizedQuery = query.toLowerCase();
    return all.filter(product =>
      (sector === "all" || (group?.sectors as readonly string[] | undefined)?.includes(product.sector))
      && `${product.name} ${product.nameAr} ${product.sector} ${product.sectorAr}`.toLowerCase().includes(normalizedQuery),
    );
  }, [all, query, sector]);

  function updateSector(value: SectorGroupId | "all") {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === "all") nextParams.delete("sector");
    else nextParams.set("sector", value);
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  const chips = [
    { id: "all" as const, label: t.store.all, Icon: Building2, count: all.length },
    ...SECTOR_GROUPS.map(group => ({
      id: group.id,
      label: t.explore.sectors[group.id],
      Icon: sectorIcons[group.id],
      count: all.filter(product => (group.sectors as readonly string[]).includes(product.sector)).length,
    })),
  ];

  return (
    <div className="page-shell min-h-[60vh] pt-12 md:pt-16">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">{t.store.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">{t.store.subtitle}</p>
        </div>
        <span className="pill">{filtered.length} <span className="ms-1">{t.common.companies}</span></span>
      </div>

      <PricesAsOf products={all} />

      <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label={t.store.title}>
        {chips.map(({ id, label, Icon, count }) => {
          const selected = sector === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => updateSector(id)}
              className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-start text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                selected
                  ? "border-[var(--gold)] bg-[var(--gold)] text-[#241f13]"
                  : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--gold)] hover:bg-[var(--soft)]"
              }`}
            >
              <Icon size={16} aria-hidden="true" className="shrink-0" />
              <span>{label}</span>
              <span className="shrink-0 tabular-nums" aria-label={`${count} ${t.common.companies}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <label className="relative mt-5 block">
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} aria-hidden="true" />
        <input
          aria-label={t.store.search}
          className="h-12 w-full rounded-full border border-[var(--line)] bg-[var(--paper)] ps-11 pe-4 text-sm outline-none transition focus:border-[var(--gold)]"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t.store.search}
        />
      </label>

      <ProductFeedback loading={loading} error={error} retry={retry} />
      {!loading && !error && (filtered.length
        ? <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(product => <ProductCard key={product.id} product={product} />)}</div>
        : <div className="card mt-8 flex min-h-56 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]"><Search size={19} /></div>
          <p className="font-semibold">{t.store.empty}</p>
          <button className="mt-3 text-sm font-semibold text-[var(--gold-dark)] underline underline-offset-4" onClick={() => { setQuery(""); updateSector("all"); }}>{t.store.clear}</button>
        </div>
      )}
    </div>
  );
}

function ProductsFallback() {
  const { t } = useStore();
  return <div className="page-shell min-h-[60vh] pt-12 md:pt-16" role="status" aria-label={t.common.loading} />;
}

export default function ProductsPage() {
  return <Suspense fallback={<ProductsFallback />}><ProductsContent /></Suspense>;
}

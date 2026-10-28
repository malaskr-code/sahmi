"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Coins,
  ChevronDown,
  Filter,
  Landmark,
  Monitor,
  Radio,
  Search,
  Truck,
  X,
} from "lucide-react";
import { useProducts } from "@/lib/use-products";
import { ProductFeedback } from "@/components/ProductFeedback";
import { MarketStatus } from "@/components/MarketStatus";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import { isSectorKey, SECTORS, sectorLabel, type SectorKey } from "@/data/sectors";

const sectorIcons = {
  banks: Landmark,
  telecom: Radio,
  "real-estate": Building2,
  "logistics-industry": Truck,
  "technology-services": Monitor,
  "gold-silver": Coins,
};

function ProductsContent() {
  const { t, lang } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const { products: all, loading, error, retry } = useProducts();
  const requestedSector = searchParams.get("sector");
  const sector: SectorKey | "all" = isSectorKey(requestedSector) ? requestedSector : "all";

  useEffect(() => {
    if (!categoryOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) setCategoryOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoryOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [categoryOpen]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    return all.filter(product =>
      (sector === "all" || product.sectorKey === sector)
      && `${product.name} ${product.nameAr} ${product.ticker} ${product.type === "metal" ? "gold silver metal metals ذهب فضة معدن معادن" : ""} ${sectorLabel(product.sectorKey, "en")} ${sectorLabel(product.sectorKey, "ar")}`.toLowerCase().includes(normalizedQuery),
    );
  }, [all, query, sector]);

  function updateSector(value: SectorKey | "all") {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === "all") nextParams.delete("sector");
    else nextParams.set("sector", value);
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  const chips = [
    { id: "all" as const, label: t.store.all, Icon: Building2, count: all.length },
    ...SECTORS.map(group => ({
      id: group.id,
      label: lang === "ar" ? group.labelAr : group.labelEn,
      Icon: sectorIcons[group.id],
      count: all.filter(product => product.sectorKey === group.id).length,
    })),
  ];
  const selectedChip = chips.find(chip => chip.id === sector) ?? chips[0];
  const matchedCompanies = filtered.filter(product => product.type !== "metal").length;
  const matchedMetals = filtered.filter(product => product.type === "metal").length;
  const formatCount = (count: number, kind: "company" | "metal") => kind === "company"
    ? lang === "ar" ? `${count} شركة` : `${count} ${count === 1 ? "company" : "companies"}`
    : lang === "ar" ? `${count} معادن` : `${count} ${count === 1 ? "metal" : "metals"}`;
  const resultCount = `${formatCount(matchedCompanies, "company")} · ${formatCount(matchedMetals, "metal")}`;
  const categoryButtonText = sector === "all"
    ? t.store.chooseCategory
    : `${selectedChip.label} (${selectedChip.count})`;

  return (
    <div className="page-shell min-h-[60vh] pt-12 md:pt-16">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">{t.store.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">{t.store.subtitle}</p>
        </div>
        <span className="pill">{resultCount}</span>
      </div>

      <MarketStatus products={all} stacked />

      <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
        <div ref={categoryMenuRef} className="relative w-full md:w-auto">
          <div className="flex min-h-12 w-full">
            <button
              type="button"
              aria-expanded={categoryOpen}
              aria-controls="store-category-panel"
              onClick={() => setCategoryOpen(open => !open)}
              className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--gold)] hover:bg-[var(--soft)] md:flex-none md:justify-start"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Filter size={17} aria-hidden="true" className="shrink-0 text-[var(--gold-dark)]" />
                <span className="truncate">{categoryButtonText}</span>
              </span>
              <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform ${categoryOpen ? "rotate-180" : ""}`} />
            </button>
            {sector !== "all" && <button
              type="button"
              aria-label={lang === "ar" ? "إزالة الفئة المختارة" : "Clear selected category"}
              onClick={() => { updateSector("all"); setCategoryOpen(false); }}
              className="ms-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] transition hover:border-[var(--gold)] hover:text-[var(--ink)]"
            ><X size={16} aria-hidden="true" /></button>}
          </div>
          {categoryOpen && <div id="store-category-panel" className="absolute start-0 top-full z-30 mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3 shadow-xl md:w-[30rem]" role="group" aria-label={t.store.chooseCategory}>
            <div className="flex flex-wrap gap-2">
              {chips.map(({ id, label, Icon, count }) => {
                const selected = sector === id;
                const accessibleCount = id === "all" ? `${count} ${lang === "ar" ? "عنصر" : "items"}` : formatCount(count, all.find(product => product.sectorKey === id)?.type === "metal" ? "metal" : "company");
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${label}, ${accessibleCount}`}
                    onClick={() => { updateSector(id); setCategoryOpen(false); }}
                    className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-start text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                      selected
                        ? "border-[var(--gold)] bg-[var(--gold)] text-[#241f13]"
                        : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--gold)] hover:bg-[var(--soft)]"
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" className="shrink-0" />
                    <span>{label}</span>
                    <span dir="ltr" className="shrink-0 tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>}
        </div>
        <label className="relative block min-w-0">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} aria-hidden="true" />
          <input
            aria-label={t.store.search}
            className="h-12 w-full rounded-full border border-[var(--line)] bg-[var(--paper)] ps-11 pe-4 text-sm outline-none transition focus:border-[var(--gold)]"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t.store.search}
          />
        </label>
      </div>

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

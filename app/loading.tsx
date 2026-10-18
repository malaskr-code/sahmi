"use client";

import { useStore } from "@/lib/store";

export default function Loading() {
  const { t } = useStore();

  return (
    <div className="page-shell min-h-[55vh] pt-12" role="status" aria-live="polite">
      <span className="sr-only">{t.common.loading}</span>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-[var(--soft)]" />
      <div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded bg-[var(--soft)]" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="card h-56 animate-pulse bg-[var(--paper)] p-5">
            <div className="h-12 w-12 rounded-full bg-[var(--soft)]" />
            <div className="mt-6 h-5 w-3/4 rounded bg-[var(--soft)]" />
            <div className="mt-3 h-4 w-1/3 rounded bg-[var(--soft)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useStore } from "@/lib/store";

export function ProductFeedback({ loading, error, retry, notFound = false }: {
  loading: boolean; error: boolean; retry: () => void; notFound?: boolean;
}) {
  const { t } = useStore();
  if (!loading && !error) return null;
  return <div className="card my-7 p-7 text-center" role={error ? "alert" : "status"} aria-live="polite">
    <p className="text-sm text-[var(--muted)]">{loading ? t.common.loading : notFound ? t.common.notFound : t.common.error}</p>
    {error && <button type="button" onClick={retry} className="outline-button mt-4">{t.common.retry}</button>}
  </div>;
}

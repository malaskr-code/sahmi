"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminPricesData } from "@/lib/admin-types";
import {
  AdminError,
  AdminLoading,
  AdminNotice,
  adminGet,
  adminSend,
  formatAdminDate,
  formatAdminNumber,
  useAdminCopy,
} from "./admin-ui";

type RefreshResponse = { result: "refreshed" | "fresh" | "cooldown" | "failed"; prices: AdminPricesData };

export function AdminPrices() {
  const { lang, copy } = useAdminCopy();
  const [data, setData] = useState<AdminPricesData>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingMetals, setRefreshingMetals] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await adminGet<AdminPricesData>("/api/admin?view=prices"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "serverError");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, reload]);

  async function refresh() {
    setRefreshing(true);
    setNotice(undefined);
    setError(undefined);
    try {
      const result = await adminSend<RefreshResponse>("POST", { action: "refreshPrices" });
      setData(result.prices);
      setNotice(
        result.result === "refreshed" ? copy.prices.refreshDone
          : result.result === "fresh" ? copy.prices.stillFresh
            : result.result === "cooldown" ? copy.prices.coolingDown
              : copy.prices.refreshFailed,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "serverError");
    } finally {
      setRefreshing(false);
    }
  }

  async function refreshMetals() {
    setRefreshingMetals(true);
    setNotice(undefined);
    setError(undefined);
    try {
      const result = await adminSend<RefreshResponse>("POST", { action: "refreshMetalPrices" });
      setData(result.prices);
      setNotice(
        result.result === "refreshed" ? copy.prices.metalsRefreshDone
          : result.result === "fresh" ? copy.prices.metalsStillFresh
            : result.result === "cooldown" ? copy.prices.metalsCoolingDown
              : copy.prices.metalsRefreshFailed,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "serverError");
    } finally {
      setRefreshingMetals(false);
    }
  }

  if (loading && !data) return <AdminLoading />;
  if (error && !data) return <AdminError error={error} onRetry={() => setReload(value => value + 1)} />;

  const percentage = data ? Math.min(100, Math.max(0, data.callsThisMonth / Math.max(1, data.monthlyLimit) * 100)) : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--ink)]">{copy.prices.title}</h2>
      {notice && <AdminNotice>{notice}</AdminNotice>}
      {error && <AdminError error={error} onRetry={() => setReload(value => value + 1)} />}
      {data && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-sm text-[var(--muted)]">{copy.prices.lastUpdated}</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{data.lastUpdatedAt ? formatAdminDate(data.lastUpdatedAt, lang) : copy.prices.neverUpdated}</p>
            </article>
            <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-sm text-[var(--muted)]">{copy.prices.metalLastUpdated}</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{data.metalLastUpdatedAt ? formatAdminDate(data.metalLastUpdatedAt, lang) : copy.prices.metalNeverUpdated}</p>
            </article>
            <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-sm text-[var(--muted)]">{copy.prices.market}</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${data.marketStatus === "open" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                {data.marketStatus === "open" ? copy.prices.open : copy.prices.closed}
              </span>
            </article>
            <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:col-span-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[var(--ink)]">{copy.prices.calls}</p>
                <p className="text-sm text-[var(--muted)]">{formatAdminNumber(data.callsThisMonth, lang)} / {formatAdminNumber(data.monthlyLimit, lang)} · {copy.prices.limit}</p>
              </div>
              <div
                className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]"
                role="progressbar"
                aria-label={copy.prices.calls}
                aria-valuemin={0}
                aria-valuemax={data.monthlyLimit}
                aria-valuenow={Math.min(data.callsThisMonth, data.monthlyLimit)}
              >
                <div className="h-full rounded-full bg-[var(--gold-dark)] transition-[width]" style={{ width: `${percentage}%` }} />
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">{copy.prices.activeCompanies}: {formatAdminNumber(data.activeCompanies, lang)}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{copy.prices.trackingNote}</p>
            </article>
          </section>
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="min-h-12 rounded-xl bg-[var(--gold-dark)] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
            {refreshing ? copy.prices.refreshing : copy.prices.refresh}
          </button>
          <button type="button" onClick={() => void refreshMetals()} disabled={refreshingMetals} className="ms-2 min-h-12 rounded-xl border border-[var(--gold-dark)] px-5 text-sm font-semibold text-[var(--gold-dark)] transition hover:bg-[var(--soft)] disabled:cursor-wait disabled:opacity-60">
            {refreshingMetals ? copy.prices.refreshingMetals : copy.prices.refreshMetals}
          </button>
        </>
      )}
    </div>
  );
}

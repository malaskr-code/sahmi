"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminOverviewData } from "@/lib/admin-types";
import {
  AdminError,
  AdminLoading,
  adminGet,
  formatAdminDay,
  formatAdminKwd,
  formatAdminNumber,
  useAdminCopy,
} from "./admin-ui";

export function AdminOverview() {
  const { lang, copy } = useAdminCopy();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await adminGet<AdminOverviewData>("/api/admin?view=overview"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "serverError");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <AdminLoading />;
  if (error || !data) return <AdminError error={error} onRetry={() => void load()} />;

  const metrics = [
    { label: copy.overview.totalUsers, value: formatAdminNumber(data.totalUsers, lang) },
    { label: copy.overview.giftsSent, value: formatAdminNumber(data.giftsSent, lang) },
    { label: copy.overview.giftsRedeemed, value: formatAdminNumber(data.giftsRedeemed, lang) },
    { label: copy.overview.giftsWaiting, value: formatAdminNumber(data.giftsWaiting, lang) },
    { label: copy.overview.sharesGifted, value: formatAdminNumber(data.sharesGifted, lang) },
    { label: copy.overview.feesEarned, value: formatAdminKwd(data.feesEarnedKwd, lang) },
    { label: copy.overview.walletTopups, value: formatAdminKwd(data.walletTopupsKwd, lang) },
    { label: copy.overview.demoOrders, value: formatAdminNumber(data.demoOrders, lang), note: copy.overview.demoNote },
  ];
  const companies = data.topCompanies.map(company => ({
    ...company,
    label: (lang === "ar" ? company.nameAr : company.name) || company.ticker,
  }));
  const occasions = data.occasions.map(row => ({
    ...row,
    label: copy.themes[row.theme as keyof typeof copy.themes] ?? row.theme,
  }));
  const tooltipStyle = {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "12px",
    color: "var(--ink)",
    fontSize: 12,
  };

  return (
    <div className="space-y-5">
      <section aria-label={copy.overview.title} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <article key={metric.label} className="min-h-28 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{metric.label}</p>
            <p className="mt-3 break-words text-2xl font-semibold text-[var(--ink)]">{metric.value}</p>
            {"note" in metric && <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{metric.note}</p>}
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--ink)]">{copy.overview.giftsPerDay}</h2>
          {data.giftsPerDay.every(row => row.count === 0)
            ? <p className="py-16 text-center text-sm text-[var(--muted)]">{copy.overview.noChartData}</p>
            : (
              <div className="h-64 min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.giftsPerDay} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" interval={4} tickFormatter={value => formatAdminDay(String(value), lang)} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={value => formatAdminDay(String(value), lang)}
                      formatter={value => [formatAdminNumber(Number(value), lang), copy.overview.gifts]}
                    />
                    <Bar dataKey="count" fill="#c5a65b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--ink)]">{copy.overview.topCompanies}</h2>
          {companies.length === 0
            ? <p className="py-16 text-center text-sm text-[var(--muted)]">{copy.overview.noChartData}</p>
            : (
              <div className="h-64 min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companies} layout="vertical" margin={{ top: 4, right: 14, left: 12, bottom: 4 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={125} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={value => [formatAdminNumber(Number(value), lang), copy.overview.gifts]} />
                    <Bar dataKey="gifts" fill="#c5a65b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 xl:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-[var(--ink)]">{copy.overview.occasions}</h2>
          {occasions.every(row => row.count === 0)
            ? <p className="py-12 text-center text-sm text-[var(--muted)]">{copy.overview.noChartData}</p>
            : (
              <div className="h-64 min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occasions} margin={{ top: 4, right: 12, left: -20, bottom: 4 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={value => [formatAdminNumber(Number(value), lang), copy.overview.gifts]} />
                    <Bar dataKey="count" fill="#c5a65b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
        </article>
      </section>
    </div>
  );
}

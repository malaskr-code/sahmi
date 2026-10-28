"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminCompany, AdminOrderDetail, AdminOrderRow } from "@/lib/admin-types";
import {
  AdminError,
  AdminLoading,
  adminGet,
  formatAdminDate,
  formatAdminKwd,
  formatAdminNumber,
  themeLabel,
  useAdminCopy,
} from "./admin-ui";

type OrdersResponse = { orders: AdminOrderRow[]; total: number; page: number; pageCount: number };

function statusClass(status: string) {
  if (status === "paid" || status === "redeemed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200";
  if (status === "pending" || status === "active") return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export function AdminOrders() {
  const { lang, copy } = useAdminCopy();
  const [filters, setFilters] = useState({ q: "", status: "", payment: "", company: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<OrdersResponse>();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailId, setDetailId] = useState<string>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();

  const query = useMemo(() => {
    const params = new URLSearchParams({ view: "orders", page: String(page) });
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return params.toString();
  }, [filters, page]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    void adminGet<OrdersResponse>(`/api/admin?${query}`)
      .then(result => { if (active) setData(result); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "serverError"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, reload]);

  useEffect(() => {
    let active = true;
    void adminGet<{ companies: AdminCompany[] }>("/api/admin?view=companies")
      .then(result => { if (active) setCompanies(result.companies); })
      .catch(() => { if (active) setCompanies([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!detail) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detail]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function openDetails(id: string) {
    setDetailId(id);
    setDetail(null);
    setDetailError(undefined);
    setDetailLoading(true);
    try {
      setDetail(await adminGet<AdminOrderDetail>(`/api/admin?view=order&id=${encodeURIComponent(id)}`));
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : "serverError");
    } finally {
      setDetailLoading(false);
    }
  }

  function methodLabel(method: AdminOrderRow["paymentMethod"]) {
    if (method === "wallet") return copy.orders.paymentWallet;
    if (method === "both") return copy.orders.paymentBoth;
    if (method === "demo") return copy.orders.paymentDemo;
    return copy.orders.paymentCard;
  }

  function Row({ order }: { order: AdminOrderRow }) {
    const companyNames = order.companies.map(company => (lang === "ar" ? company.nameAr : company.name) || company.ticker);
    const activate = () => { void openDetails(order.id); };
    return (
      <tr
        tabIndex={0}
        role="button"
        aria-label={`${copy.orders.actions}: ${order.buyer.name || order.buyer.email}`}
        onClick={activate}
        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } }}
        className="cursor-pointer border-t border-[var(--line)] text-sm text-[var(--ink)] hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-dark)]"
      >
        <td className="whitespace-nowrap px-3 py-3">{formatAdminDate(order.createdAt, lang)}</td>
        <td className="min-w-40 px-3 py-3"><span className="block font-medium">{order.buyer.name || "—"}</span><span className="text-xs text-[var(--muted)]">{order.buyer.email}</span></td>
        <td className="px-3 py-3">{companyNames.length ? <div className="space-y-1">{order.companies.map((company, index) => <p key={`${company.ticker}-${index}`}>{companyNames[index]} <span dir="ltr" className="text-xs text-[var(--muted)]">({company.ticker})</span></p>)}</div> : copy.orders.topupOrder}</td>
        <td className="px-3 py-3">{order.companies.length ? <div className="space-y-1">{order.companies.map((company, index) => <p key={`${company.ticker}-${index}`}>{formatAdminNumber(company.shares, lang)}</p>)}</div> : "—"}</td>
        <td className="px-3 py-3">{order.recipientName || "—"}</td>
        <td className="whitespace-nowrap px-3 py-3">{themeLabel(order.theme, copy)}</td>
        <td className="whitespace-nowrap px-3 py-3">{formatAdminKwd(order.total, lang)}</td>
        <td className="whitespace-nowrap px-3 py-3">{methodLabel(order.paymentMethod)}</td>
        <td className="whitespace-nowrap px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>{copy.orders[`status${order.status[0].toUpperCase()}${order.status.slice(1)}` as "statusPaid" | "statusPending" | "statusCancelled"]}</span></td>
        <td className="whitespace-nowrap px-3 py-3">{order.giftStatus ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.giftStatus)}`}>{order.giftStatus === "redeemed" ? copy.orders.giftRedeemed : copy.orders.giftActive}</span> : "—"}</td>
        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs" dir="ltr">{order.giftCodeLast4 ? `•••• ${order.giftCodeLast4}` : "—"}</td>
      </tr>
    );
  }

  const detailCompanies = detail?.companies.map(company => `${(lang === "ar" ? company.nameAr : company.name) || company.ticker} (${company.ticker}) · ${formatAdminNumber(company.shares, lang)} ${copy.orders.shares}`).join(", ");
  const detailFields = detail ? [
    [copy.orders.buyer, `${detail.buyer.name}${detail.buyer.email ? ` · ${detail.buyer.email}` : ""}`],
    [copy.orders.type, detail.type === "gift" ? copy.orders.giftOrder : copy.orders.topupOrder],
    ...(detailCompanies ? [[copy.orders.company, detailCompanies]] : []),
    ...(detail.recipientName ? [[copy.orders.recipient, detail.recipientName]] : []),
    ...(detail.theme ? [[copy.orders.occasion, themeLabel(detail.theme, copy)]] : []),
    [copy.orders.total, formatAdminKwd(detail.total, lang)],
    [copy.orders.fee, formatAdminKwd(detail.fee, lang)],
    [copy.orders.method, methodLabel(detail.paymentMethod)],
    [copy.orders.walletPart, formatAdminKwd(detail.paidFromWallet, lang)],
    [copy.orders.cardPart, formatAdminKwd(detail.paidByCard, lang)],
    [copy.orders.status, copy.orders[`status${detail.status[0].toUpperCase()}${detail.status.slice(1)}` as "statusPaid" | "statusPending" | "statusCancelled"]],
    ...(detail.giftStatus ? [[copy.orders.gift, detail.giftStatus === "redeemed" ? copy.orders.giftRedeemed : copy.orders.giftActive]] : []),
    ...(detail.priceAtPurchase !== null ? [[copy.orders.priceAtPurchase, formatAdminKwd(detail.priceAtPurchase, lang)]] : []),
    ...(detail.redeemedAt ? [[copy.orders.redeemedAt, formatAdminDate(detail.redeemedAt, lang)]] : []),
  ] as Array<[string, string]> : [];

  if (loading && !data) return <AdminLoading />;
  if (error && !data) return <AdminError error={error} onRetry={() => setReload(value => value + 1)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">{copy.orders.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{formatAdminNumber(data?.total ?? 0, lang)}</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2 xl:grid-cols-6">
        <label className="sm:col-span-2 xl:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{copy.orders.search}</span>
          <input className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]" value={filters.q} onChange={event => updateFilter("q", event.target.value)} placeholder={copy.orders.search} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{copy.orders.status}</span>
          <select className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]" value={filters.status} onChange={event => updateFilter("status", event.target.value)}>
            <option value="">{copy.orders.statusAll}</option>
            <option value="pending">{copy.orders.statusPending}</option>
            <option value="paid">{copy.orders.statusPaid}</option>
            <option value="cancelled">{copy.orders.statusCancelled}</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{copy.orders.payment}</span>
          <select className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]" value={filters.payment} onChange={event => updateFilter("payment", event.target.value)}>
            <option value="">{copy.common.all}</option>
            <option value="card">{copy.orders.paymentCard}</option>
            <option value="wallet">{copy.orders.paymentWallet}</option>
            <option value="both">{copy.orders.paymentBoth}</option>
            <option value="demo">{copy.orders.paymentDemo}</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{copy.orders.company}</span>
          <select className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]" value={filters.company} onChange={event => updateFilter("company", event.target.value)}>
            <option value="">{copy.common.all}</option>
            {companies.map(company => <option key={company.id} value={company.ticker}>{company.ticker} · {lang === "ar" ? company.nameAr : company.name}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{copy.orders.from}</span>
          <input type="date" className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]" value={filters.from} onChange={event => updateFilter("from", event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{copy.orders.to}</span>
          <input type="date" className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]" value={filters.to} onChange={event => updateFilter("to", event.target.value)} />
        </label>
      </section>

      {error && <AdminError error={error} onRetry={() => setReload(value => value + 1)} />}
      {loading ? <AdminLoading /> : !data?.orders.length ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">{copy.orders.noOrders}</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] md:block">
            <table className="w-full min-w-[1260px] border-collapse text-start">
              <thead className="bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
                <tr>{[copy.orders.date, copy.orders.buyer, copy.orders.company, copy.orders.shares, copy.orders.recipient, copy.orders.occasion, copy.orders.total, copy.orders.method, copy.orders.status, copy.orders.gift, copy.orders.code].map(label => <th key={label} className="px-3 py-3 text-start font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody>{data.orders.map(order => <Row key={order.id} order={order} />)}</tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {data.orders.map(order => (
              <button key={order.id} type="button" onClick={() => void openDetails(order.id)} className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-start text-[var(--ink)] shadow-sm">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0"><span className="block truncate font-semibold">{order.buyer.name || order.buyer.email}</span><span className="mt-1 block text-xs text-[var(--muted)]">{formatAdminDate(order.createdAt, lang)}</span></span>
                  <span className="shrink-0 text-sm font-semibold">{formatAdminKwd(order.total, lang)}</span>
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                  <span>{order.companies.length ? order.companies.map(company => `${company.ticker} · ${formatAdminNumber(company.shares, lang)}`).join(" / ") : copy.orders.topupOrder}</span>
                  {order.recipientName && <span>· {order.recipientName}</span>}
                  {order.giftCodeLast4 && <span dir="ltr">· •••• {order.giftCodeLast4}</span>}
                </span>
                <span className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>{copy.orders[`status${order.status[0].toUpperCase()}${order.status.slice(1)}` as "statusPaid" | "statusPending" | "statusCancelled"]}</span>
                  {order.giftStatus && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.giftStatus)}`}>{order.giftStatus === "redeemed" ? copy.orders.giftRedeemed : copy.orders.giftActive}</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="min-h-10 rounded-xl border border-[var(--line)] px-4 disabled:opacity-45">{copy.common.previous}</button>
            <span className="text-[var(--muted)]">{copy.common.page} {formatAdminNumber(data.page, lang)} {copy.common.of} {formatAdminNumber(data.pageCount, lang)}</span>
            <button type="button" disabled={page >= data.pageCount} onClick={() => setPage(value => Math.min(data.pageCount, value + 1))} className="min-h-10 rounded-xl border border-[var(--line)] px-4 disabled:opacity-45">{copy.common.next}</button>
          </div>
        </>
      )}

      {(detailLoading || detailError || detail) && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) { setDetail(null); setDetailError(undefined); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="admin-order-detail-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] p-5 text-[var(--ink)] shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 id="admin-order-detail-title" className="text-xl font-semibold">{copy.orders.actions}</h2>
              <button type="button" aria-label={copy.common.close} onClick={() => { setDetail(null); setDetailError(undefined); }} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-lg">×</button>
            </div>
            {detailLoading ? <div className="py-10 text-center text-sm text-[var(--muted)]">{copy.common.loading}</div>
              : detailError ? <div className="py-6"><AdminError error={detailError} onRetry={() => detailId && void openDetails(detailId)} /></div>
                : detail && (
                  <div className="mt-5 space-y-5">
                    <p className="text-sm text-[var(--muted)]">{formatAdminDate(detail.createdAt, lang)} · {detailCompanies || copy.orders.topupOrder}</p>
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {detailFields.map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-[var(--line)] p-3">
                          <dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {detail.message && <div className="rounded-xl border border-[var(--line)] p-3"><p className="text-xs text-[var(--muted)]">{copy.orders.message}</p><p className="mt-1 whitespace-pre-wrap text-sm">{detail.message}</p></div>}
                    {detail.giftCode && <div className="rounded-xl border border-[var(--line)] p-3"><p className="text-xs text-[var(--muted)]">{copy.orders.code}</p><p className="mt-1 break-all font-mono text-sm" dir="ltr">{detail.giftCode}</p></div>}
                  </div>
                )}
          </section>
        </div>
      )}
    </div>
  );
}

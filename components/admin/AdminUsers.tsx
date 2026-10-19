"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUserRow } from "@/lib/admin-types";
import {
  AdminError,
  AdminLoading,
  adminGet,
  adminSend,
  formatAdminDate,
  formatAdminKwd,
  formatAdminNumber,
  useAdminCopy,
} from "./admin-ui";

type UsersResponse = {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageCount: number;
  currentAdminId: string;
};

export function AdminUsers() {
  const { lang, copy } = useAdminCopy();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await adminGet<UsersResponse>(`/api/admin?view=users&page=${page}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "serverError");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load, reload]);

  async function toggle(user: AdminUserRow) {
    setBusyId(user.id);
    setError(undefined);
    try {
      await adminSend("PATCH", { action: "setUserDisabled", id: user.id, disabled: !user.disabled });
      setReload(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "serverError");
    } finally {
      setBusyId(undefined);
    }
  }

  if (loading && !data) return <AdminLoading />;
  if (error && !data) return <AdminError error={error} onRetry={() => setReload(value => value + 1)} />;

  const actionButton = (user: AdminUserRow) => {
    const self = user.id === data?.currentAdminId;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={!user.disabled}
        aria-label={self ? copy.users.self : user.disabled ? copy.users.enable : copy.users.disable}
        title={self ? copy.users.self : undefined}
        disabled={self || busyId === user.id}
        onClick={() => void toggle(user)}
        className={`min-h-10 rounded-xl px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${user.disabled ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"}`}
      >
        {user.disabled ? copy.users.enable : copy.users.disable}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">{copy.users.title}</h2>
        <span className="text-sm text-[var(--muted)]">{formatAdminNumber(data?.total ?? 0, lang)}</span>
      </div>
      {error && <AdminError error={error} onRetry={() => setReload(value => value + 1)} />}
      {loading ? <AdminLoading /> : !data?.users.length ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">{copy.users.noUsers}</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] md:block">
            <table className="w-full min-w-[900px] border-collapse text-start">
              <thead className="bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
                <tr>
                  {[copy.users.name, copy.users.email, copy.users.joined, copy.users.giftsSent, copy.users.wallet, copy.users.role, copy.users.status].map(label => <th key={label} className="px-4 py-3 text-start font-semibold">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.users.map(user => (
                  <tr key={user.id} className="border-t border-[var(--line)] text-sm text-[var(--ink)]">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatAdminDate(user.createdAt, lang)}</td>
                    <td className="px-4 py-3">{formatAdminNumber(user.giftsSent, lang)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatAdminKwd(user.walletBalance, lang)}</td>
                    <td className="px-4 py-3">{user.role === "admin" ? copy.users.admin : copy.users.user}</td>
                    <td className="px-4 py-3">{actionButton(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {data.users.map(user => (
              <article key={user.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--ink)]">{user.name}</p>
                    <p className="mt-1 break-all text-xs text-[var(--muted)]">{user.email}</p>
                  </div>
                  {actionButton(user)}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-[var(--muted)]">{copy.users.joined}</dt><dd className="mt-1">{formatAdminDate(user.createdAt, lang)}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">{copy.users.role}</dt><dd className="mt-1">{user.role === "admin" ? copy.users.admin : copy.users.user}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">{copy.users.giftsSent}</dt><dd className="mt-1">{formatAdminNumber(user.giftsSent, lang)}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">{copy.users.wallet}</dt><dd className="mt-1">{formatAdminKwd(user.walletBalance, lang)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="min-h-10 rounded-xl border border-[var(--line)] px-4 disabled:opacity-45">{copy.common.previous}</button>
            <span className="text-[var(--muted)]">{copy.common.page} {formatAdminNumber(data.page, lang)} {copy.common.of} {formatAdminNumber(data.pageCount, lang)}</span>
            <button type="button" disabled={page >= data.pageCount} onClick={() => setPage(value => Math.min(data.pageCount, value + 1))} className="min-h-10 rounded-xl border border-[var(--line)] px-4 disabled:opacity-45">{copy.common.next}</button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AdminManagementRow } from "@/lib/admin-types";
import {
  AdminLoading,
  AdminNotice,
  adminButtonClass,
  adminInputClass,
  formatAdminDate,
  useAdminCopy,
} from "./admin-ui";

type AdminsResponse = { admins: AdminManagementRow[] };

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : fallback);
  }
  return body as T;
}

export function AdminAdmins() {
  const { lang, copy } = useAdminCopy();
  const [admins, setAdmins] = useState<AdminManagementRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/admins", {
        cache: "no-store",
        headers: { "Accept-Language": lang },
      });
      const result = await readResponse<AdminsResponse>(response, copy.errors.serverError);
      setAdmins(result.admins);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.errors.serverError);
    } finally {
      setLoading(false);
    }
  }, [copy.errors.serverError, lang]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  async function send(method: "POST" | "DELETE", body: unknown) {
    const response = await fetch("/api/admin/admins", {
      method,
      headers: { "Content-Type": "application/json", "Accept-Language": lang },
      body: JSON.stringify(body),
    });
    return readResponse<{ ok: true }>(response, copy.errors.serverError);
  }

  async function addAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      await send("POST", { email });
      setEmail("");
      setNotice(copy.admins.addSuccess);
      await loadAdmins();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : copy.errors.serverError);
    } finally {
      setAdding(false);
    }
  }

  async function removeAdmin(admin: AdminManagementRow) {
    if (admin.owner || !window.confirm(copy.admins.confirmRemove.replace("{email}", admin.email))) return;
    setRemoving(admin.email);
    setError(null);
    setNotice(null);
    try {
      await send("DELETE", { email: admin.email });
      setNotice(copy.admins.removeSuccess);
      await loadAdmins();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : copy.errors.serverError);
    } finally {
      setRemoving(null);
    }
  }

  const grantorLabel = (admin: AdminManagementRow) =>
    admin.adminGrantedBy?.name || admin.adminGrantedBy?.email || "—";
  const roleBadge = (admin: AdminManagementRow) => admin.owner
    ? <span className="inline-flex rounded-full bg-[var(--gold-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--gold-dark)]">{copy.admins.owner}</span>
    : null;
  const removeButton = (admin: AdminManagementRow) => admin.owner ? null : (
    <button
      type="button"
      onClick={() => void removeAdmin(admin)}
      disabled={removing !== null}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--line)] px-3 text-sm font-medium text-[var(--ink)] transition hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-55 dark:hover:text-red-300"
    >
      {removing === admin.email ? copy.common.saving : copy.admins.remove}
    </button>
  );

  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"} className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold text-[var(--ink)]">{copy.admins.title}</h2>
      </header>

      <form onSubmit={event => void addAdmin(event)} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <label className="block min-w-0 text-sm font-medium text-[var(--ink)]">
          <span className="mb-1.5 block text-xs text-[var(--muted)]">{copy.admins.email}</span>
          <input
            className={adminInputClass}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            dir="ltr"
          />
        </label>
        <button type="submit" className={adminButtonClass} disabled={adding || !email.trim()}>
          {adding ? copy.admins.adding : copy.admins.add}
        </button>
      </form>

      {notice && <AdminNotice>{notice}</AdminNotice>}
      {error && (
        <div className="space-y-3">
          <AdminNotice tone="error">{error}</AdminNotice>
          {admins === null && (
            <button type="button" onClick={() => void loadAdmins()} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
              {copy.admins.retry}
            </button>
          )}
        </div>
      )}

      {loading && admins === null ? <AdminLoading /> : admins && admins.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
          {copy.admins.noAdmins}
        </div>
      ) : admins && (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] md:block">
            <table className="w-full min-w-[680px] text-start text-sm text-[var(--ink)]">
              <thead className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{copy.users.name}</th>
                  <th className="px-4 py-3 text-start font-semibold">{copy.admins.dateAdded}</th>
                  <th className="px-4 py-3 text-start font-semibold">{copy.admins.addedBy}</th>
                  <th className="px-4 py-3 text-end font-semibold">{copy.admins.remove}</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        <span>{admin.name}</span>
                        {roleBadge(admin)}
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]" dir="ltr">{admin.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{formatAdminDate(admin.adminGrantedAt, lang)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{grantorLabel(admin)}</td>
                    <td className="px-4 py-3 text-end">{removeButton(admin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {admins.map(admin => (
              <li key={admin.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{admin.name}</span>
                  {roleBadge(admin)}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]" dir="ltr">{admin.email}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                  <div>
                    <dt className="text-[var(--muted)]">{copy.admins.dateAdded}</dt>
                    <dd className="mt-1">{formatAdminDate(admin.adminGrantedAt, lang)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">{copy.admins.addedBy}</dt>
                    <dd className="mt-1">{grantorLabel(admin)}</dd>
                  </div>
                </dl>
                {!admin.owner && <div className="mt-4">{removeButton(admin)}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

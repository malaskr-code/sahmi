"use client";

import { useCallback, useEffect, useState } from "react";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { AdminCompany } from "@/lib/admin-types";
import { SECTORS, sectorLabel } from "@/data/sectors";
import {
  AdminError,
  AdminLoading,
  AdminNotice,
  adminGet,
  adminInputClass,
  adminSend,
  formatAdminKwd,
  useAdminCopy,
} from "./admin-ui";

type Draft = Pick<AdminCompany, "id" | "ticker" | "name" | "nameAr" | "description" | "descriptionAr" | "sectorKey" | "image" | "logoBg">;

function draftFrom(company: AdminCompany): Draft {
  return {
    id: company.id,
    ticker: company.ticker,
    name: company.name,
    nameAr: company.nameAr,
    description: company.description,
    descriptionAr: company.descriptionAr,
    sectorKey: company.sectorKey,
    image: company.image,
    logoBg: company.logoBg,
  };
}

export function AdminCompanies() {
  const { lang, copy } = useAdminCopy();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [notice, setNotice] = useState<{ key: string; tone: "success" | "error" }>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await adminGet<{ companies: AdminCompany[] }>("/api/admin?view=companies");
      setCompanies(result.companies);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "serverError");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, reload]);

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.name.trim() || !draft.nameAr.trim() || !draft.description.trim() || !draft.descriptionAr.trim() || !/^#[0-9a-f]{6}$/i.test(draft.logoBg)) {
      setNotice({ key: "invalidCompany", tone: "error" });
      return;
    }
    setSaving(true);
    setNotice(undefined);
    try {
      await adminSend("PATCH", { action: "updateCompany", company: draft });
      setDraft(null);
      setNotice({ key: "saved", tone: "success" });
      setReload(value => value + 1);
    } catch (cause) {
      setNotice({ key: cause instanceof Error ? cause.message : "serverError", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function setActive(company: AdminCompany) {
    setBusyId(company.id);
    setNotice(undefined);
    try {
      await adminSend("PATCH", { action: "setCompanyActive", id: company.id, active: !company.active });
      setNotice({ key: "activated", tone: "success" });
      setReload(value => value + 1);
    } catch (cause) {
      setNotice({ key: cause instanceof Error ? cause.message : "serverError", tone: "error" });
    } finally {
      setBusyId(undefined);
    }
  }

  if (loading && !companies.length) return <AdminLoading />;
  if (error && !companies.length) return <AdminError error={error} onRetry={() => setReload(value => value + 1)} />;

  const noticeText = notice
    ? notice.key === "saved" ? copy.companies.saved
      : notice.key === "activated" ? copy.companies.activated
        : notice.key === "tickerTaken" ? copy.companies.tickerTaken
          : notice.key === "invalidCompany" ? copy.companies.invalid
            : copy.errors[notice.key as keyof typeof copy.errors] ?? copy.common.loadError
    : "";

  const input = (label: string, key: keyof Draft, multiline = false) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">{label}</span>
      {multiline
        ? <textarea className={`${adminInputClass} min-h-24 resize-y`} value={String(draft?.[key] ?? "")} onChange={event => setDraft(current => current ? { ...current, [key]: event.target.value } : current)} />
        : <input className={adminInputClass} value={String(draft?.[key] ?? "")} onChange={event => setDraft(current => current ? { ...current, [key]: event.target.value } : current)} />}
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">{copy.companies.title}</h2>
        <span className="text-sm text-[var(--muted)]">{companies.length}</span>
      </div>
      {notice && <AdminNotice tone={notice.tone}>{noticeText}</AdminNotice>}
      {error && <AdminError error={error} onRetry={() => setReload(value => value + 1)} />}
      {companies.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">{copy.companies.noCompanies}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <div className="divide-y divide-[var(--line)]">
            {companies.map(company => (
              <article key={company.id} className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
                <CompanyLogo src={company.image} name={`${company.name} ${company.ticker}`} logoBg={company.logoBg} className="h-14 w-14 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--ink)]">{lang === "ar" ? company.nameAr : company.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{company.ticker} · {sectorLabel(company.sectorKey, lang)}</p>
                  <p className="mt-1 text-sm text-[var(--ink)]">{formatAdminKwd(company.price, lang)}</p>
                </div>
                <button type="button" onClick={() => setDraft(draftFrom(company))} className="min-h-10 rounded-xl border border-[var(--line)] px-3 text-sm font-medium text-[var(--ink)] hover:border-[var(--gold-dark)]">{copy.common.edit}</button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={company.active}
                  aria-label={`${company.active ? copy.companies.active : copy.companies.inactive}: ${company.name}`}
                  disabled={busyId === company.id}
                  onClick={() => void setActive(company)}
                  className={`min-h-10 rounded-xl px-3 text-sm font-semibold disabled:opacity-50 ${company.active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                >
                  {company.active ? copy.companies.active : copy.companies.inactive}
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setDraft(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="admin-company-edit-title" className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] p-5 text-[var(--ink)] shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 id="admin-company-edit-title" className="text-xl font-semibold">{copy.companies.change}</h2>
              <button type="button" aria-label={copy.common.close} onClick={() => setDraft(null)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-lg">×</button>
            </div>
            {notice && notice.tone === "error" && <div className="mb-4"><AdminNotice tone="error">{noticeText}</AdminNotice></div>}
            <form onSubmit={event => void saveCompany(event)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {input(copy.companies.ticker, "ticker")}
                {input(copy.companies.logoBg, "logoBg")}
                {input(copy.companies.name, "name")}
                {input(copy.companies.nameAr, "nameAr")}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">{copy.companies.sector}</span>
                  <select className={adminInputClass} value={draft.sectorKey} onChange={event => setDraft(current => current ? { ...current, sectorKey: event.target.value as AdminCompany["sectorKey"] } : current)}>
                    {SECTORS.map(sector => <option key={sector.id} value={sector.id}>{lang === "ar" ? sector.labelAr : sector.labelEn}</option>)}
                  </select>
                </label>
                <div className="sm:col-span-2">{input(copy.companies.logo, "image")}</div>
                <div className="sm:col-span-2">{input(copy.companies.description, "description", true)}</div>
                <div className="sm:col-span-2">{input(copy.companies.descriptionAr, "descriptionAr", true)}</div>
              </div>
              <div className="flex items-center gap-3">
                <CompanyLogo src={draft.image} name={`${draft.name} ${draft.ticker}`} logoBg={draft.logoBg} className="h-14 w-14 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{copy.companies.logoBg}</label>
                  <input type="color" aria-label={copy.companies.logoBg} value={/^#[0-9a-f]{6}$/i.test(draft.logoBg) ? draft.logoBg : "#ffffff"} onChange={event => setDraft(current => current ? { ...current, logoBg: event.target.value } : current)} className="h-10 w-20 rounded-lg border border-[var(--line)] bg-transparent p-1" />
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-4">
                <button type="button" disabled={saving} onClick={() => setDraft(null)} className="min-h-10 rounded-xl border border-[var(--line)] px-4 text-sm disabled:opacity-50">{copy.common.cancel}</button>
                <button type="submit" disabled={saving} className="min-h-10 rounded-xl bg-[var(--gold-dark)] px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? copy.common.saving : copy.common.save}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

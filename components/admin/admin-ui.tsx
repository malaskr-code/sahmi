"use client";

import { useStore } from "@/lib/store";
import { adminDashboardCopy } from "@/data/admin-dashboard-copy";

export function useAdminCopy() {
  const { lang } = useStore();
  return { lang, copy: adminDashboardCopy[lang] };
}

export function adminGet<T>(url: string): Promise<T> {
  return fetch(url, { cache: "no-store" }).then(async response => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "serverError");
    return body as T;
  });
}

export async function adminSend<T>(method: "PATCH" | "POST", body: unknown): Promise<T> {
  const response = await fetch("/api/admin", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "serverError");
  return result as T;
}

export function formatAdminNumber(value: number, lang: "en" | "ar") {
  return new Intl.NumberFormat(lang === "ar" ? "ar-KW" : "en-KW", { maximumFractionDigits: 0 }).format(value);
}

export function formatAdminKwd(value: number, lang: "en" | "ar") {
  return new Intl.NumberFormat(lang === "ar" ? "ar-KW" : "en-KW", {
    style: "currency",
    currency: "KWD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatAdminDate(value: string | null | undefined, lang: "en" | "ar") {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-KW" : "en-KW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuwait",
  }).format(date);
}

export function formatAdminDay(key: string, lang: "en" | "ar") {
  const date = new Date(`${key}T12:00:00+03:00`);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-KW" : "en-KW", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kuwait",
  }).format(date);
}

export function themeLabel(theme: string | null | undefined, copy: { themes: object }) {
  if (!theme) return "—";
  return (copy.themes as Record<string, string>)[theme] ?? theme;
}

export function AdminLoading() {
  const { copy } = useAdminCopy();
  return <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">{copy.common.loading}</div>;
}

export function AdminError({ error, onRetry }: { error?: string; onRetry: () => void }) {
  const { copy } = useAdminCopy();
  const message = error ? copy.errors[error as keyof typeof copy.errors] ?? copy.common.loadError : copy.common.loadError;
  return (
    <div role="alert" className="rounded-2xl border border-red-300/60 bg-red-50/60 p-5 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-200">
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded-full border border-current px-4 py-2 font-semibold">{copy.common.retry}</button>
    </div>
  );
}

export function AdminNotice({ children, tone = "success" }: { children: React.ReactNode; tone?: "success" | "error" }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${
      tone === "error"
        ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200"
        : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
    }`}>
      {children}
    </p>
  );
}

export const adminInputClass = "min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--gold-dark)]";
export const adminButtonClass = "inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--gold-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55";

"use client";

import { useState, type CSSProperties } from "react";
import {
  Building2,
  ChartColumnIncreasing,
  LayoutDashboard,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import type { AdminTab } from "@/lib/admin-types";
import { AdminOverview } from "./admin/AdminOverview";
import { AdminOrders } from "./admin/AdminOrders";
import { AdminCompanies } from "./admin/AdminCompanies";
import { AdminPrices } from "./admin/AdminPrices";
import { AdminUsers } from "./admin/AdminUsers";
import { useAdminCopy } from "./admin/admin-ui";

const tabs: Array<{ id: AdminTab; icon: typeof LayoutDashboard }> = [
  { id: "overview", icon: LayoutDashboard },
  { id: "orders", icon: ShoppingBag },
  { id: "companies", icon: Building2 },
  { id: "prices", icon: ChartColumnIncreasing },
  { id: "users", icon: UsersRound },
];

export function AdminDashboardClient() {
  const { lang, copy } = useAdminCopy();
  const [active, setActive] = useState<AdminTab>("overview");
  const panel = {
    overview: <AdminOverview />,
    orders: <AdminOrders />,
    companies: <AdminCompanies />,
    prices: <AdminPrices />,
    users: <AdminUsers />,
  }[active];
  const themeVariables = {
    "--surface": "var(--paper)",
    "--surface-muted": "var(--soft)",
    "--gold-soft": "var(--soft)",
  } as CSSProperties;

  return (
    <main dir={lang === "ar" ? "rtl" : "ltr"} style={themeVariables} className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-dark)]">Sahmi</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--ink)] sm:text-3xl">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy.subtitle}</p>
      </header>

      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start">
        <nav aria-label={copy.title} className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 md:w-56 md:shrink-0 md:flex-col md:overflow-visible">
          {tabs.map(({ id, icon: Icon }) => {
            const selected = active === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => setActive(id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition md:w-full ${
                  selected
                    ? "bg-[var(--gold-soft)] text-[var(--gold-dark)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{copy.tabs[id]}</span>
              </button>
            );
          })}
        </nav>
        <section aria-live="polite" className="min-w-0 flex-1">
          {panel}
        </section>
      </div>
    </main>
  );
}

"use client";

import { accountCopy } from "@/data/account-copy";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useStore } from "@/lib/store";

export type AdminOrder = {
  id: string;
  type: "gift" | "topup";
  company: { ticker: string; name: string; nameAr: string; image: string; logoBg: string } | null;
  paymentMethod: "wallet" | "card" | "both" | "demo";
  status: "pending" | "paid" | "cancelled";
  total: number;
  createdAt: string;
};

type AdminOrdersLabels = {
  title: string;
  empty: string;
  columns: { order: string; type: string; payment: string; status: string; total: string; date: string };
  types: { gift: string; topup: string };
  payments: { wallet: string; card: string; both: string; demo: string };
  statuses: { pending: string; paid: string; cancelled: string };
};

export function AdminOrdersClient({ orders }: { orders: AdminOrder[] }) {
  const { lang } = useStore();
  const account = accountCopy[lang] as typeof accountCopy[typeof lang] & { adminOrders: AdminOrdersLabels };
  const labels = account.adminOrders;
  const companyName = (order: AdminOrder) => order.company ? lang === "ar" ? order.company.nameAr : order.company.name : "";

  function money(value: number) {
    return new Intl.NumberFormat(lang === "ar" ? "ar-KW" : "en-KW", {
      style: "currency",
      currency: "KWD",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  }

  function date(value: string) {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-KW" : "en-KW", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  const paymentLabel = (method: AdminOrder["paymentMethod"]) => labels.payments[method];
  const orderTypeLabel = (type: AdminOrder["type"]) => labels.types[type];
  const statusClass: Record<AdminOrder["status"], string> = {
    pending: "bg-[var(--gold)]/20 text-[var(--gold-dark)]",
    paid: "bg-[var(--green)]/10 text-[var(--green)]",
    cancelled: "bg-[var(--red)]/10 text-[var(--red)]",
  };

  return (
    <section className="page-shell min-h-[60vh] py-10 md:py-14" aria-labelledby="admin-orders-title">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="admin-orders-title" className="font-display mt-2 text-3xl font-semibold md:text-4xl">{labels.title}</h1>
        </div>
        <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
          {orders.length}
        </span>
      </header>
      {!orders.length ? (
        <div className="card flex min-h-56 items-center justify-center p-8 text-center">
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">{labels.empty}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow)]">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-[var(--soft)] text-xs text-[var(--muted)]">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold">{labels.columns.order}</th>
                  <th scope="col" className="px-5 py-4 font-semibold">{labels.columns.type}</th>
                  <th scope="col" className="px-5 py-4 font-semibold">{labels.columns.payment}</th>
                  <th scope="col" className="px-5 py-4 font-semibold">{labels.columns.status}</th>
                  <th scope="col" className="px-5 py-4 font-semibold">{labels.columns.total}</th>
                  <th scope="col" className="px-5 py-4 font-semibold">{labels.columns.date}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {orders.map(order => (
                  <tr key={order.id} className="transition-colors hover:bg-[var(--soft)]/60">
                    <td dir="ltr" className="px-5 py-4 font-mono text-xs">{order.id}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {order.company && <CompanyLogo src={order.company.image} name={companyName(order)} logoBg={order.company.logoBg} className="h-10 w-10 rounded-lg"/>}
                        <div>
                          <p>{orderTypeLabel(order.type)}</p>
                          {order.company && <p className="mt-0.5 text-xs text-[var(--muted)]">{companyName(order)}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{paymentLabel(order.paymentMethod)}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[order.status]}`}>{labels.statuses[order.status]}</span></td>
                    <td dir="ltr" className="px-5 py-4 font-semibold">{money(order.total)}</td>
                    <td className="px-5 py-4 text-[var(--muted)]"><time dateTime={order.createdAt}>{date(order.createdAt)}</time></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[var(--line)] md:hidden">
            {orders.map(order => (
              <article key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted)]">{labels.columns.order}</p>
                    <p dir="ltr" className="mt-1 truncate text-xs font-mono">{order.id}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass[order.status]}`}>{labels.statuses[order.status]}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <p className="text-[var(--muted)]">{labels.columns.type}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {order.company && <CompanyLogo src={order.company.image} name={companyName(order)} logoBg={order.company.logoBg} className="h-9 w-9 rounded-lg"/>}
                      <div className="min-w-0">
                        <p className="font-medium">{orderTypeLabel(order.type)}</p>
                        {order.company && <p className="truncate text-[10px] text-[var(--muted)]">{companyName(order)}</p>}
                      </div>
                    </div>
                  </div>
                  <div><p className="text-[var(--muted)]">{labels.columns.payment}</p><p className="mt-1 font-medium">{paymentLabel(order.paymentMethod)}</p></div>
                  <div><p className="text-[var(--muted)]">{labels.columns.total}</p><p dir="ltr" className="mt-1 text-start font-semibold">{money(order.total)}</p></div>
                  <div><p className="text-[var(--muted)]">{labels.columns.date}</p><time className="mt-1 block font-medium" dateTime={order.createdAt}>{date(order.createdAt)}</time></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

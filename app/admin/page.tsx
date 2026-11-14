import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { forbidden } from "next/navigation";
import { isOwner, requireAdmin } from "@/lib/auth";
import type { AdminTab } from "@/lib/admin-types";

const ADMIN_TABS: AdminTab[] = ["overview", "orders", "companies", "prices", "users", "admins"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await requireAdmin();
  const requestedTab = (await searchParams).tab;
  const tab = Array.isArray(requestedTab) ? requestedTab[0] : requestedTab;
  const initialTab = ADMIN_TABS.includes(tab as AdminTab) ? tab as AdminTab : "overview";
  const owner = await isOwner(user);
  if (initialTab === "admins" && !owner) forbidden();
  return <AdminDashboardClient isOwner={owner} initialTab={initialTab} />;
}

import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  await requireAdmin();
  return <AdminDashboardClient />;
}

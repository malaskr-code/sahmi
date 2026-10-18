import { requireAdmin } from "@/lib/auth";
import { AccountEmpty } from "@/components/AccountEmpty";

export default async function AdminPage() {
  await requireAdmin();
  return <AccountEmpty kind="admin" />;
}

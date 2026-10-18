import { requireUser } from "@/lib/auth";
import { AccountEmpty } from "@/components/AccountEmpty";

export default async function WalletPage() {
  await requireUser("/wallet");
  return <AccountEmpty kind="wallet" />;
}

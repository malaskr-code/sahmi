import { requireUser } from "@/lib/auth";
import WalletClient from "@/components/commerce/WalletClient";

export default async function WalletPage() {
  await requireUser("/wallet");
  return <WalletClient />;
}

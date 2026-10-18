import { requireUser } from "@/lib/auth";
import { AccountEmpty } from "@/components/AccountEmpty";

export default async function CheckoutPage() {
  await requireUser("/checkout");
  return <AccountEmpty kind="checkout" />;
}

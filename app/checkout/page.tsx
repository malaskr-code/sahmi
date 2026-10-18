import { requireUser } from "@/lib/auth";
import CheckoutClient from "@/components/commerce/CheckoutClient";

export default async function CheckoutPage() {
  await requireUser("/checkout");
  return <CheckoutClient />;
}

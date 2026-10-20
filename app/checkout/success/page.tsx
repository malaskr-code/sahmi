import { requireUser } from "@/lib/auth";
import { SuccessClient } from "@/components/commerce/PaymentResultClient";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const tapId = first(params.tap_id);
  const orderId = first(params.order_id);
  await requireUser(`/checkout/success?${new URLSearchParams({
    ...(tapId ? { tap_id: tapId } : {}),
    ...(orderId ? { order_id: orderId } : {}),
  }).toString()}`);
  return <SuccessClient tapId={tapId} orderId={orderId} />;
}

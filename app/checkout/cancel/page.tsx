import { requireUser } from "@/lib/auth";
import { CancelClient } from "@/components/commerce/PaymentResultClient";

export default async function CheckoutCancelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const kind = first(params.kind) === "topup" ? "topup" : "";
  await requireUser(`/checkout/cancel?${new URLSearchParams({
    ...(kind ? { kind } : {}),
  }).toString()}`);
  return <CancelClient isTopup={kind === "topup"} />;
}

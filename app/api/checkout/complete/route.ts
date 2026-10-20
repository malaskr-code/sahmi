import { requestUser } from "@/lib/auth";
import { readAuthBody, sameOrigin } from "@/lib/auth-response";
import { completeCheckoutOrder, completePaidTapOrder } from "@/lib/checkout-service";
import { readGiftCardForBuyer } from "@/lib/gift-service";
import { PaymentError, paymentJson, paymentServerError } from "@/lib/payment-errors";
import { TapConfigurationError } from "@/lib/tap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return paymentJson(request, 403, "invalidRequest");
  const user = await requestUser(request);
  if (!user) return paymentJson(request, 401, "unauthorized");
  const body = await readAuthBody(request);
  if (!body) return paymentJson(request, 400, "invalidRequest");
  const tapId = typeof body.tapId === "string" ? body.tapId : "";
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!tapId && !orderId) return paymentJson(request, 400, "invalidRequest");

  try {
    const result = tapId
      ? await completePaidTapOrder(tapId, user.id, orderId || undefined)
      : await completeCheckoutOrder(orderId, user.id);
    const gift = result.giftId ? await readGiftCardForBuyer(result.giftId, user.id) : null;
    if (result.giftId && !gift) throw new PaymentError("sessionInvalid", 404);
    return Response.json({ ...result, gift }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson(request, error.status, error.code);
    if (error instanceof TapConfigurationError) return paymentJson(request, 503, "tapError");
    console.error("Unable to verify checkout completion.", error instanceof Error ? error.name : "unknown");
    return paymentServerError(request);
  }
}

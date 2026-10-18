import { requestUser } from "@/lib/auth";
import { readAuthBody, sameOrigin } from "@/lib/auth-response";
import { completePaidStripeOrder, completeWalletOnlyOrder } from "@/lib/checkout-service";
import { readGiftCardForBuyer } from "@/lib/gift-service";
import { PaymentError, paymentJson, paymentServerError } from "@/lib/payment-errors";
import { StripeConfigurationError } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return paymentJson(request, 403, "invalidRequest");
  const user = await requestUser(request);
  if (!user) return paymentJson(request, 401, "unauthorized");
  const body = await readAuthBody(request);
  if (!body) return paymentJson(request, 400, "invalidRequest");
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (Boolean(sessionId) === Boolean(orderId)) return paymentJson(request, 400, "invalidRequest");

  try {
    const result = sessionId
      ? await completePaidStripeOrder(sessionId, user.id)
      : await completeWalletOnlyOrder(orderId, user.id);
    const gift = result.giftId ? await readGiftCardForBuyer(result.giftId, user.id) : null;
    if (result.giftId && !gift) throw new PaymentError("sessionInvalid", 404);
    return Response.json({ ...result, gift }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson(request, error.status, error.code);
    if (error instanceof StripeConfigurationError) return paymentJson(request, 503, "checkoutUnavailable");
    console.error("Unable to verify checkout completion.", error instanceof Error ? error.name : "unknown");
    return paymentServerError(request);
  }
}

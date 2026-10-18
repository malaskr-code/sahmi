import { requestUser } from "@/lib/auth";
import { readAuthBody, sameOrigin } from "@/lib/auth-response";
import { cancelStripeOrder } from "@/lib/checkout-service";
import { PaymentError, paymentJson, paymentServerError } from "@/lib/payment-errors";
import { StripeConfigurationError } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return paymentJson(request, 403, "invalidRequest");
  const user = await requestUser(request);
  if (!user) return paymentJson(request, 401, "unauthorized");
  const body = await readAuthBody(request);
  if (!body || typeof body.sessionId !== "string" || !body.sessionId) {
    return paymentJson(request, 400, "invalidRequest");
  }
  try {
    const status = await cancelStripeOrder(body.sessionId, user.id);
    return Response.json({ ok: true, status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson(request, error.status, error.code);
    if (error instanceof StripeConfigurationError) return paymentJson(request, 503, "checkoutUnavailable");
    console.error("Unable to cancel checkout.", error instanceof Error ? error.name : "unknown");
    return paymentServerError(request);
  }
}

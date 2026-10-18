import mongoose from "mongoose";
import { requestUser } from "@/lib/auth";
import { readAuthBody, sameOrigin } from "@/lib/auth-response";
import { connectDB } from "@/lib/db";
import { prepareGiftPriceQuote, startGiftCheckout, startTopupCheckout } from "@/lib/checkout-service";
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

  try {
    await connectDB();
    const origin = new URL(request.url).origin;
    if (body.action === "quote") {
      return Response.json(
        { ok: true, ...await prepareGiftPriceQuote(user.id, body) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (body.action === "topup") {
      const result = await startTopupCheckout(user, body.amount, origin);
      return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "gift") {
      const result = await startGiftCheckout(user, body, origin);
      return Response.json({
        ok: true,
        ...result,
        successUrl: result.url === null ? `/checkout/success?order_id=${encodeURIComponent(result.orderId)}` : null,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    return paymentJson(request, 400, "invalidRequest");
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson(request, error.status, error.code);
    if (error instanceof StripeConfigurationError) return paymentJson(request, 503, "stripeError");
    console.error("Unable to create a checkout session.", error instanceof Error ? error.name : "unknown");
    if (error instanceof mongoose.Error.ValidationError) return paymentJson(request, 400, "invalidRequest");
    return paymentServerError(request);
  }
}

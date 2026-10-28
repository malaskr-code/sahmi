import { requestUser } from "@/lib/auth";
import { readAuthBody, sameOrigin } from "@/lib/auth-response";
import { PaymentError, paymentJson, paymentServerError } from "@/lib/payment-errors";
import { sellMetalToWallet } from "@/lib/metal-sale-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return paymentJson(request, 403, "invalidRequest");
  const user = await requestUser(request);
  if (!user) return paymentJson(request, 401, "unauthorized");
  const body = await readAuthBody(request);
  if (!body) return paymentJson(request, 400, "invalidRequest");
  try {
    const result = await sellMetalToWallet(user.id, body.productId, body.grams);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson(request, error.status, error.code);
    console.error("Metal sale could not be completed.", error instanceof Error ? error.name : "unknown");
    return paymentServerError(request);
  }
}

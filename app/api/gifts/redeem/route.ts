import { requestUser } from "@/lib/auth";
import { readAuthBody, sameOrigin } from "@/lib/auth-response";
import { redeemGift } from "@/lib/gift-service";
import { PaymentError, paymentJson, paymentServerError } from "@/lib/payment-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return paymentJson(request, 403, "invalidRequest");
  const user = await requestUser(request);
  if (!user) return paymentJson(request, 401, "unauthorized");
  const body = await readAuthBody(request);
  if (!body || typeof body.code !== "string") return paymentJson(request, 400, "invalidRequest");
  try {
    return Response.json(await redeemGift(body.code, user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson(request, error.status, error.code);
    return paymentServerError(request);
  }
}

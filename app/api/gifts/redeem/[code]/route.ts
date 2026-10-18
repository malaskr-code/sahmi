import { readGiftForRedemption } from "@/lib/gift-service";
import { PaymentError, paymentJson, paymentServerError } from "@/lib/payment-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  try {
    return Response.json({ ok: true, gift: await readGiftForRedemption(code) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentError) return Response.json({ ok: false, code: error.code, error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return Response.json({ ok: false, code: "giftUnavailable" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

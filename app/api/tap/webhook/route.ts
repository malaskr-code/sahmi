import { processTapWebhookCharge } from "@/lib/checkout-service";
import { PaymentError } from "@/lib/payment-errors";
import { TapConfigurationError, verifyTapWebhookHash, type TapChargeResponse } from "@/lib/tap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 64_000) return Response.json({ ok: false }, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const charge = payload as { id?: unknown };
  if (
    typeof charge.id !== "string" ||
    !verifyTapWebhookHash(payload as TapChargeResponse, request.headers.get("hashstring"))
  ) {
    return Response.json({ ok: false }, { status: 401 });
  }

  try {
    await processTapWebhookCharge(charge.id);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TapConfigurationError) return Response.json({ ok: false }, { status: 503 });
    if (error instanceof PaymentError) return Response.json({ ok: false }, { status: error.status });
    console.error("Unable to process Tap webhook.", error instanceof Error ? error.name : "unknown");
    return Response.json({ ok: false }, { status: 500 });
  }
}

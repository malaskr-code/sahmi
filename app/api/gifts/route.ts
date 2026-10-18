import { requestUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { readMyGifts } from "@/lib/gift-service";
import { paymentJson, paymentServerError } from "@/lib/payment-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return paymentJson(request, 401, "unauthorized");
  try {
    await connectDB();
    return Response.json({ ok: true, gifts: await readMyGifts(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load gifts.", error instanceof Error ? error.name : "unknown");
    return paymentServerError(request);
  }
}

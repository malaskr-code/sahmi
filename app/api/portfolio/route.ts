import { requestUser } from "@/lib/auth";
import { readPortfolio } from "@/lib/portfolio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    return Response.json({ ok: true, ...await readPortfolio(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, code: "serverError" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

import { requestUser } from "@/lib/auth";
import { authError, authSuccess } from "@/lib/auth-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user || user.role !== "admin") return authError("forbidden", 403, request);
    // No administrative operations or other users' data in this step.
    return authSuccess({ user, items: [] });
  } catch { return authError("serverError", 500, request); }
}

import { requestUser } from "@/lib/auth";
import { authError, authSuccess } from "@/lib/auth-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user) return authError("unauthorized", 401, request);
    return authSuccess({ user });
  } catch {
    return authError("serverError", 500, request);
  }
}

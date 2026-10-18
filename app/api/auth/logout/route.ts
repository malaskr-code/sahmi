import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { authError, authSuccess, sameOrigin } from "@/lib/auth-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return authError("forbidden", 403, request);
  const response = authSuccess({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0, expires: new Date(0) });
  return response;
}

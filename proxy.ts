import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let user;
  try {
    user = await userFromToken(request.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    user = null;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user || user.role !== "admin") {
      // Rewrite a branded forbidden page while preserving a real HTTP 403 status.
      return NextResponse.rewrite(new URL("/access-denied", request.url), { status: 403 });
    }
    return NextResponse.next();
  }
  if (!user) {
    const next = `${pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/wallet/:path*", "/gifts/:path*", "/portfolio/:path*", "/checkout/:path*", "/admin/:path*"],
};

import { NextResponse } from "next/server";
import { authMessage, type AuthErrorCode } from "./auth-validation";

export function authError(code: AuthErrorCode, status: number, request?: Request) {
  const lang = request?.headers.get("accept-language")?.toLowerCase().startsWith("ar") ? "ar" : "en";
  return NextResponse.json({ error: authMessage(code, lang), code }, { status, headers: { "Cache-Control": "no-store" } });
}

export function authSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function sameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === new URL(request.url).host || originHost === request.headers.get("host");
  } catch { return false; }
}

export async function readAuthBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  // Keep password hashing and JSON parsing inputs bounded.
  const text = await request.text();
  if (text.length > 8192) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch { return null; }
}

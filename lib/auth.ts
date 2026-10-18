import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect, forbidden } from "next/navigation";
import { cache } from "react";
import mongoose from "mongoose";
import { connectDB } from "./db";
import User from "../models/User";
import type { AuthUser } from "./auth-validation";

export const SESSION_COOKIE = "__Host-sahmi-session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const sessionCookieOptions = {
  httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: SESSION_SECONDS,
};

function signingKey() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing.");
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("sahmi")
    .setAudience("sahmi-account")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(signingKey());
}

export function publicUser(user: { _id: unknown; name: string; email: string; phone?: string; role: string }): AuthUser {
  return {
    id: String(user._id), name: user.name, email: user.email,
    phone: user.phone ?? "", role: user.role === "admin" ? "admin" : "user",
  };
}

export async function userFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const key = signingKey();
  let subject: string | undefined;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"], issuer: "sahmi", audience: "sahmi-account" });
    subject = payload.sub;
  } catch { return null; }
  if (!subject || !mongoose.isValidObjectId(subject)) return null;
  await connectDB();
  // Never trust a role, email or user ID sent by the client; re-read the account.
  const user = await User.findById(subject).select("name email phone role").lean();
  return user ? publicUser(user) : null;
}

export async function requestUser(request: Request) {
  const entry = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${SESSION_COOKIE}=`));
  return userFromToken(entry?.slice(SESSION_COOKIE.length + 1));
}

// React cache is scoped to a server render, not shared between visitors.
export const currentUser = cache(async () => {
  const cookieStore = await cookies();
  return userFromToken(cookieStore.get(SESSION_COOKIE)?.value);
});

export async function requireUser(returnTo: string) {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "admin") forbidden();
  return user;
}

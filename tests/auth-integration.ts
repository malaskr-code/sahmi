// Explicit integration check against the running development app.
// Creates only uniquely named test accounts and removes them in finally.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { decodeJwt } from "jose";
import { connectDB } from "../lib/db";
import User from "../models/User";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const suffix = randomUUID();
const email = `sahmi-auth-${suffix}@example.invalid`;
const secondEmail = `sahmi-second-${suffix}@example.invalid`;
const password = randomUUID() + "!";
const signup = { name: "Account Check", email, phone: "00000000", password };

async function post(path: string, body: unknown, lang = "en") {
  return fetch(base + path, {
    method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": lang, Origin: base },
    body: JSON.stringify(body),
  });
}

async function main() {
 const db = await connectDB();
 try {
  for (const lang of ["en", "ar"]) {
    for (const [body, code] of [
      [{}, "required"], [{ ...signup, email: "invalid" }, "emailInvalid"],
      [{ ...signup, password: "short" }, "passwordShort"],
    ] as const) {
      const response = await post("/api/auth/signup", body, lang);
      assert.equal(response.status, 400);
      const data = await response.json();
      assert.equal(data.code, code);
      assert.equal(/[ء-ي]/.test(data.error), lang === "ar");
    }
  }
  const signupResponse = await post("/api/auth/signup", { ...signup, role: "admin" });
  assert.equal(signupResponse.status, 201);
  const first = (await signupResponse.json()).user;
  assert.equal(first.role, "user", "Request body cannot assign an admin role");
  assert.equal("passwordHash" in first, false);
  assert.equal("password" in first, false);
  const stored = await User.findById(first.id).select("+passwordHash").lean();
  assert.ok(stored.passwordHash !== password && stored.passwordHash.startsWith("$2"));
  assert.ok(await bcrypt.compare(password, stored.passwordHash));
  const duplicate = await post("/api/auth/signup", { ...signup, email: email.toUpperCase() }, "ar");
  assert.equal(duplicate.status, 400);
  assert.equal((await duplicate.json()).code, "emailTaken");
  console.log("STEP 5 PASS: validation EN/AR, bcrypt storage, safe response, duplicate 400, client role escalation rejected.");

  const wrong = await post("/api/auth/login", { email, password: "wrong-password" }, "ar");
  assert.equal(wrong.status, 401);
  assert.equal((await wrong.json()).code, "invalidCredentials");
  const loginResponse = await post("/api/auth/login", { email, password });
  assert.equal(loginResponse.status, 200);
  const setCookie = loginResponse.headers.get("set-cookie") ?? "";
  const attributes = setCookie.split(";").slice(1).map(value => value.trim().toLowerCase());
  console.log("Session cookie attributes:", attributes.join("; "));
  assert.ok(attributes.includes("httponly") && attributes.includes("secure") && attributes.includes("samesite=lax") && attributes.includes("max-age=604800"));
  const cookie = setCookie.split(";")[0];
  const claims = decodeJwt(cookie.slice(cookie.indexOf("=") + 1));
  assert.equal(claims.exp! - claims.iat!, 604800);
  const meResponse = await fetch(base + "/api/auth/me", { headers: { cookie } });
  assert.equal(meResponse.status, 200);
  const me = (await meResponse.json()).user;
  assert.equal(me.id, first.id);
  assert.equal("passwordHash" in me, false);
  console.log("STEP 6 PASS: wrong details 401, seven-day JWT, secure httpOnly SameSite cookie, safe current-user response.");

  const secondResponse = await post("/api/auth/signup", { ...signup, name: "Second Check", email: secondEmail });
  assert.equal(secondResponse.status, 201);
  const second = (await secondResponse.json()).user;
  const secondLogin = await post("/api/auth/login", { email: secondEmail, password });
  const secondCookie = (secondLogin.headers.get("set-cookie") ?? "").split(";")[0];
  const ownOnly = await (await fetch(base + `/api/auth/me?userId=${first.id}`, { headers: { cookie: secondCookie } })).json();
  assert.equal(ownOnly.user.id, second.id);
  for (const path of ["/wallet", "/gifts", "/portfolio", "/checkout"]) {
    const guest = await fetch(base + path, { redirect: "manual" });
    assert.ok(guest.status === 307 || guest.status === 303, `Guest redirect ${path}: ${guest.status}`);
    const destination = new URL(guest.headers.get("location")!, base);
    assert.equal(destination.pathname, "/login");
    assert.equal(destination.searchParams.get("next"), path);
    const signedIn = await fetch(base + path, { headers: { cookie }, redirect: "manual" });
    assert.equal(signedIn.status, 200, `Signed-in access ${path}`);
  }
  for (const path of ["/admin", "/api/admin"]) {
    assert.equal((await fetch(base + path, { redirect: "manual" })).status, 403, `Anonymous admin access ${path}`);
    assert.equal((await fetch(base + path, { headers: { cookie }, redirect: "manual" })).status, 403, `User admin access ${path}`);
  }
  // Only this temporary test account is changed; existing accounts are untouched.
  await User.updateOne({ _id: first.id, email }, { $set: { role: "admin" } });
  for (const path of ["/admin", "/api/admin"]) {
    assert.equal((await fetch(base + path, { headers: { cookie }, redirect: "manual" })).status, 200, `Admin access ${path}`);
  }
  await User.updateOne({ _id: first.id, email }, { $set: { role: "user" } });
  assert.equal((await fetch(base + "/api/admin", { headers: { cookie } })).status, 403, "Role changes checked from DB on every request");
  console.log("STEP 8 PASS: all four protected redirects preserve destination, admin pages/API enforce role, sessions cannot choose another user.");

  const logout = await post("/api/auth/logout", {});
  assert.equal(logout.status, 200);
  assert.ok((logout.headers.get("set-cookie") ?? "").includes("Max-Age=0"));
  assert.equal((await fetch(base + "/api/auth/me")).status, 401);
  assert.equal((await fetch(base + "/api/auth/me", { headers: { cookie: "__Host-sahmi-session=forged" } })).status, 401);
  console.log("STEP 7 API PASS: logout expires cookie; anonymous/forged sessions rejected.");
 } finally {
  await User.deleteMany({ email: { $in: [email, secondEmail] } });
  await db.disconnect();
  console.log("Temporary integration accounts removed.");
 }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { decodeJwt, SignJWT } from "jose";
import mongoose from "mongoose";
import { validateCredentials, authMessage, safeReturnTo, signupRole } from "../lib/auth-validation";
import { createSessionToken, publicUser, userFromToken, SESSION_SECONDS, sessionCookieOptions } from "../lib/auth";
import { sameOrigin } from "../lib/auth-response";
import User from "../models/User";

const credentials = { name: "Test User", email: "person@example.invalid", phone: "12345678", password: "ValidPass123!" };
test("signup validates every required field, email, minimum length and bcrypt byte limit in both languages", () => {
  assert.equal(validateCredentials(credentials, true), null);
  for (const field of Object.keys(credentials)) {
    assert.equal(validateCredentials({ ...credentials, [field]: "  " }, true), "required");
  }
  assert.equal(validateCredentials({ ...credentials, email: "wrong" }, true), "emailInvalid");
  assert.equal(validateCredentials({ ...credentials, password: "1234567" }, true), "passwordShort");
  assert.equal(validateCredentials({ ...credentials, password: "س".repeat(37) }, true), "passwordLong");
  for (const code of ["required", "emailInvalid", "passwordShort", "emailTaken", "invalidCredentials"]) {
    assert.notEqual(authMessage(code, "en"), authMessage(code, "ar"));
    assert.ok(authMessage(code, "ar").length > 5);
  }
});

test("admin assignment is normalized and only matches the configured address", () => {
  assert.equal(signupRole(" Owner@Example.invalid ", "owner@example.invalid"), "admin");
  assert.equal(signupRole("other@example.invalid", "owner@example.invalid"), "user");
});

test("only safe internal return destinations are allowed", () => {
  assert.equal(safeReturnTo("/checkout"), "/checkout");
  assert.equal(safeReturnTo("/gifts?tab=received"), "/gifts?tab=received");
  for (const value of ["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/%2f/evil.invalid", "/login", "/api/auth/me", "javascript:alert(1)"]) {
    assert.equal(safeReturnTo(value), "/wallet");
  }
});

test("public users omit hashes and arbitrary private fields", () => {
  const user = publicUser({ _id: "abc", ...credentials, role: "user" });
  assert.deepEqual(Object.keys(user).sort(), ["email", "id", "name", "phone", "role"]);
  assert.equal(JSON.stringify(user).includes("ValidPass123!"), false);
});

test("JWT lasts exactly seven days and cookie is httpOnly, secure and sameSite", async () => {
  const token = await createSessionToken(new mongoose.Types.ObjectId().toString());
  const claims = decodeJwt(token);
  assert.equal(claims.exp! - claims.iat!, SESSION_SECONDS);
  assert.equal(claims.iss, "sahmi");
  assert.equal(claims.aud, "sahmi-account");
  assert.equal(sessionCookieOptions.httpOnly, true);
  assert.equal(sessionCookieOptions.secure, true);
  assert.equal(sessionCookieOptions.sameSite, "none");
  assert.equal(sessionCookieOptions.maxAge, 604800);
});

test("forged and expired sessions are rejected without querying user data", async () => {
  assert.equal(await userFromToken(undefined), null);
  assert.equal(await userFromToken("invalid.token.value"), null);
  const expired = await new SignJWT({}).setProtectedHeader({ alg: "HS256" })
    .setSubject(new mongoose.Types.ObjectId().toString()).setIssuer("sahmi").setAudience("sahmi-account")
    .setExpirationTime(1).sign(new TextEncoder().encode("not-the-real-signing-key"));
  assert.equal(await userFromToken(expired), null);
});

test("valid session reads current role from the database, not token or request data", async () => {
  mock.method(mongoose, "connect", async () => mongoose);
  const id = new mongoose.Types.ObjectId().toString();
  mock.method(User, "findById", (subject: string) => {
    assert.equal(subject, id);
    return { select: () => ({ lean: async () => ({ _id: id, ...credentials, role: "admin" }) }) };
  });
  try {
    const user = await userFromToken(await createSessionToken(id));
    assert.equal(user?.role, "admin");
    assert.equal(user?.id, id);
  } finally { mock.restoreAll(); }
});

test("cross-site auth mutations are rejected", () => {
  assert.equal(sameOrigin(new Request("https://sahmi.test/api/auth/login", { headers: { origin: "https://sahmi.test" } })), true);
  assert.equal(sameOrigin(new Request("https://sahmi.test/api/auth/login", { headers: { origin: "https://evil.test" } })), false);
  assert.equal(sameOrigin(new Request("https://sahmi.test/api/auth/login", { headers: { "sec-fetch-site": "cross-site" } })), false);
});

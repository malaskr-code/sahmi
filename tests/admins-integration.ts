// Run with `npx tsx tests/admins-integration.ts`; all temporary accounts are removed.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import { createSessionToken, SESSION_COOKIE } from "../lib/auth";
import User from "../models/User";
import { POST as login } from "../app/api/auth/login/route";
import { DELETE as removeAdmin, GET as listAdmins, POST as addAdmin } from "../app/api/admin/admins/route";

const suffix = randomUUID();
const ownerEmail = `owner-${suffix}@example.invalid`;
const adminEmail = `admin-${suffix}@example.invalid`;
const ordinaryEmail = `user-${suffix}@example.invalid`;
const disabledEmail = `disabled-${suffix}@example.invalid`;
const addedEmail = `added-${suffix}@example.invalid`;
const password = `Test-${randomUUID()}!`;
const originalAdminEmail = process.env.ADMIN_EMAIL;
const originalJwtSecret = process.env.JWT_SECRET;
const origin = "https://sahmi-admin-test.invalid";

function apiRequest(path: string, cookie: string, method = "GET", body?: unknown, lang = "en") {
  const headers = new Headers({ cookie, "Accept-Language": lang });
  if (method !== "GET") {
    headers.set("Origin", origin);
    headers.set("Content-Type", "application/json");
  }
  return new Request(`${origin}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function main() {
  process.env.ADMIN_EMAIL = ` ${ownerEmail.toUpperCase()} `;
  process.env.JWT_SECRET = `temporary-test-key-${randomUUID()}`;
  const db = await connectDB();
  const emails = [ownerEmail, adminEmail, ordinaryEmail, disabledEmail, addedEmail];
  try {
    const passwordHash = await bcrypt.hash(password, 4);
    const [owner, admin, ordinary] = await User.create([
      { name: "Temporary Owner", email: ownerEmail, phone: "00000000", passwordHash, role: "user" },
      { name: "Temporary Admin", email: adminEmail, phone: "00000000", passwordHash, role: "admin" },
      { name: "Temporary User", email: ordinaryEmail, phone: "00000000", passwordHash, role: "user" },
      { name: "Temporary Disabled", email: disabledEmail, phone: "00000000", passwordHash, role: "user", disabled: true },
      { name: "Temporary Candidate", email: addedEmail, phone: "00000000", passwordHash, role: "user" },
    ]);

    const loginResponse = await login(new Request(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: ownerEmail, password }),
    }));
    assert.equal(loginResponse.status, 200);
    const loggedInOwner = await User.findById(owner._id).select("role").lean();
    assert.equal(loggedInOwner?.role, "admin", "Owner role is restored during login");
    const ownerCookie = loginResponse.headers.get("set-cookie")!.split(";")[0];
    assert.ok(ownerCookie.startsWith(`${SESSION_COOKIE}=`));

    const ownerId = String(owner._id);
    const adminCookie = `${SESSION_COOKIE}=${await createSessionToken(String(admin._id))}`;
    const userCookie = `${SESSION_COOKIE}=${await createSessionToken(String(ordinary._id))}`;
    const methods = [
      (cookie: string) => listAdmins(apiRequest("/api/admin/admins", cookie)),
      (cookie: string) => addAdmin(apiRequest("/api/admin/admins", cookie, "POST", { email: addedEmail })),
      (cookie: string) => removeAdmin(apiRequest("/api/admin/admins", cookie, "DELETE", { email: addedEmail })),
    ];
    for (const cookie of [adminCookie, userCookie]) {
      for (const call of methods) assert.equal((await call(cookie)).status, 403);
    }

    const invalidEmail = await addAdmin(apiRequest("/api/admin/admins", ownerCookie, "POST", { email: "invalid" }));
    assert.equal(invalidEmail.status, 400);
    const missingEnglish = await addAdmin(apiRequest("/api/admin/admins", ownerCookie, "POST", { email: "missing@example.invalid" }));
    assert.equal(missingEnglish.status, 404);
    assert.equal((await missingEnglish.json()).error, "No account uses this email. Ask them to sign up first.");
    const missingArabic = await addAdmin(apiRequest("/api/admin/admins", ownerCookie, "POST", { email: "missing@example.invalid" }, "ar"));
    assert.equal((await missingArabic.json()).error, "لا يوجد حساب بهذا البريد. اطلب منه التسجيل أولاً.");
    const disabledResult = await addAdmin(apiRequest("/api/admin/admins", ownerCookie, "POST", { email: disabledEmail }));
    assert.equal(disabledResult.status, 400);
    const alreadyAdmin = await addAdmin(apiRequest("/api/admin/admins", ownerCookie, "POST", { email: adminEmail }));
    assert.equal(alreadyAdmin.status, 409);

    const grant = await addAdmin(apiRequest("/api/admin/admins", ownerCookie, "POST", { email: ` ${addedEmail.toUpperCase()} ` }));
    assert.equal(grant.status, 200);
    const added = await User.findOne({ email: addedEmail }).select("role adminGrantedBy adminGrantedAt").lean();
    assert.equal(added?.role, "admin");
    assert.equal(String(added?.adminGrantedBy), ownerId);
    assert.ok(added?.adminGrantedAt);
    const list = await listAdmins(apiRequest("/api/admin/admins", ownerCookie));
    const listData = await list.json();
    const ownerRow = listData.admins.find((row: { email: string }) => row.email === ownerEmail);
    const addedRow = listData.admins.find((row: { email: string }) => row.email === addedEmail);
    assert.equal(ownerRow.owner, true);
    assert.equal(addedRow.adminGrantedBy.email, ownerEmail);
    assert.ok(addedRow.adminGrantedAt);
    assert.equal((await addAdmin(apiRequest("/api/admin/admins", ownerCookie, "POST", { email: addedEmail }))).status, 409);

    const ownerRemoval = await removeAdmin(apiRequest("/api/admin/admins", ownerCookie, "DELETE", { email: ownerEmail }));
    assert.equal(ownerRemoval.status, 400);
    assert.equal((await ownerRemoval.json()).error, "The owner can't be removed.");
    const ownerRemovalArabic = await removeAdmin(apiRequest("/api/admin/admins", ownerCookie, "DELETE", { email: ownerEmail }, "ar"));
    assert.equal((await ownerRemovalArabic.json()).error, "لا يمكن إزالة المالك.");

    const removal = await removeAdmin(apiRequest("/api/admin/admins", ownerCookie, "DELETE", { email: addedEmail }));
    assert.equal(removal.status, 200);
    const removed = await User.findOne({ email: addedEmail }).select("role adminGrantedBy adminGrantedAt").lean();
    assert.equal(removed?.role, "user");
    assert.equal(removed?.adminGrantedBy ?? null, null);
    assert.equal(removed?.adminGrantedAt ?? null, null);
    console.log("Admin integration checks passed: owner recovery, localized errors, grant/remove metadata, and 403 for admins and users.");
  } finally {
    await User.deleteMany({ email: { $in: emails } });
    await db.disconnect();
    if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalAdminEmail;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

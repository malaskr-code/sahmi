import { authError, sameOrigin } from "@/lib/auth-response";
import { isOwner, requestUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const NO_STORE = { "Cache-Control": "no-store" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminErrorCode = "invalidEmail" | "noAccount" | "alreadyAdmin" | "disabledAccount" | "ownerCannotRemove" | "notAdmin" | "serverError";

const ERROR_MESSAGES: Record<"en" | "ar", Record<AdminErrorCode, string>> = {
  en: {
    invalidEmail: "Enter a valid email address.",
    noAccount: "No account uses this email. Ask them to sign up first.",
    alreadyAdmin: "This account is already an admin.",
    disabledAccount: "A disabled account cannot be made an admin.",
    ownerCannotRemove: "The owner can't be removed.",
    notAdmin: "This account is not an admin.",
    serverError: "Something went wrong. Please try again.",
  },
  ar: {
    invalidEmail: "أدخل بريداً إلكترونياً صحيحاً.",
    noAccount: "لا يوجد حساب بهذا البريد. اطلب منه التسجيل أولاً.",
    alreadyAdmin: "هذا الحساب مشرف بالفعل.",
    disabledAccount: "لا يمكن منح صلاحية المشرف لحساب معطّل.",
    ownerCannotRemove: "لا يمكن إزالة المالك.",
    notAdmin: "هذا الحساب ليس مشرفاً.",
    serverError: "حدث خطأ. يرجى المحاولة مرة أخرى.",
  },
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}

function errorResponse(request: Request, code: AdminErrorCode, status: number) {
  const lang = request.headers.get("accept-language")?.toLowerCase().startsWith("ar") ? "ar" : "en";
  return json({ code, error: ERROR_MESSAGES[lang][code] }, status);
}

function normalizedEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

async function ownerFor(request: Request) {
  const user = await requestUser(request);
  return user && await isOwner(user) ? user : null;
}

export async function GET(request: Request) {
  try {
    const owner = await ownerFor(request);
    if (!owner) return authError("forbidden", 403, request);
    await connectDB();
    const rows = await User.find({ role: "admin" })
      .select("name email adminGrantedAt adminGrantedBy")
      .sort({ email: 1, _id: 1 })
      .lean();
    const grantorIds = rows.flatMap(admin => admin.adminGrantedBy ? [admin.adminGrantedBy] : []);
    const grantors = grantorIds.length
      ? await User.find({ _id: { $in: grantorIds } }).select("name email").lean()
      : [];
    const grantorsById = new Map(grantors.map(grantor => [String(grantor._id), { name: grantor.name, email: grantor.email }]));
    const configuredOwner = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    return json({
      admins: rows.map(admin => ({
        id: String(admin._id),
        name: admin.name,
        email: admin.email,
        adminGrantedAt: admin.adminGrantedAt?.toISOString() ?? null,
        adminGrantedBy: admin.adminGrantedBy ? grantorsById.get(String(admin.adminGrantedBy)) ?? null : null,
        owner: Boolean(configuredOwner && admin.email.trim().toLowerCase() === configuredOwner),
      })),
    });
  } catch {
    return errorResponse(request, "serverError", 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return authError("forbidden", 403, request);
  try {
    const owner = await ownerFor(request);
    if (!owner) return authError("forbidden", 403, request);
    const body = await request.json().catch(() => null);
    const email = normalizedEmail(body && typeof body === "object" && !Array.isArray(body) ? body.email : null);
    if (!email) return errorResponse(request, "invalidEmail", 400);

    await connectDB();
    const account = await User.findOne({ email }).select("_id email role disabled").lean();
    if (!account) return errorResponse(request, "noAccount", 404);
    if (account.disabled) return errorResponse(request, "disabledAccount", 400);
    if (account.role === "admin" || email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
      return errorResponse(request, "alreadyAdmin", 409);
    }

    const result = await User.updateOne(
      { _id: account._id, role: "user", disabled: { $ne: true } },
      { $set: { role: "admin", adminGrantedBy: owner.id, adminGrantedAt: new Date() } },
    );
    if (result.modifiedCount !== 1) {
      const latest = await User.findById(account._id).select("role disabled").lean();
      if (!latest) return errorResponse(request, "noAccount", 404);
      if (latest.disabled) return errorResponse(request, "disabledAccount", 400);
      if (latest.role === "admin") return errorResponse(request, "alreadyAdmin", 409);
      return errorResponse(request, "serverError", 500);
    }
    return json({ ok: true });
  } catch {
    return errorResponse(request, "serverError", 500);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return authError("forbidden", 403, request);
  try {
    const owner = await ownerFor(request);
    if (!owner) return authError("forbidden", 403, request);
    const body = await request.json().catch(() => null);
    const email = normalizedEmail(body && typeof body === "object" && !Array.isArray(body) ? body.email : null);
    if (!email) return errorResponse(request, "invalidEmail", 400);
    if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
      return errorResponse(request, "ownerCannotRemove", 400);
    }

    await connectDB();
    const account = await User.findOne({ email }).select("_id role").lean();
    if (!account) return errorResponse(request, "noAccount", 404);
    if (account.role !== "admin") return errorResponse(request, "notAdmin", 409);

    const result = await User.updateOne(
      { _id: account._id, role: "admin", email: { $ne: process.env.ADMIN_EMAIL?.trim().toLowerCase() } },
      { $set: { role: "user" }, $unset: { adminGrantedBy: 1, adminGrantedAt: 1 } },
    );
    if (result.modifiedCount !== 1) {
      const latest = await User.findById(account._id).select("role").lean();
      if (!latest) return errorResponse(request, "noAccount", 404);
      if (latest.role !== "admin") return errorResponse(request, "notAdmin", 409);
      return errorResponse(request, "ownerCannotRemove", 400);
    }
    return json({ ok: true });
  } catch {
    return errorResponse(request, "serverError", 500);
  }
}

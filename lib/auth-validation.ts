export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "user" | "admin";
};

export type AuthErrorCode =
  | "required" | "emailInvalid" | "passwordShort" | "passwordLong"
  | "inputTooLong" | "emailTaken" | "invalidCredentials" | "unauthorized"
  | "forbidden" | "serverError" | "invalidRequest";

const messages: Record<"en" | "ar", Record<AuthErrorCode, string>> = {
  en: {
    required: "Please fill in all fields.",
    emailInvalid: "Please enter a valid email address.",
    passwordShort: "Your password must be at least 8 characters.",
    passwordLong: "Your password is too long. Please use no more than 72 bytes.",
    inputTooLong: "One of your entries is too long. Please shorten it.",
    emailTaken: "An account with this email already exists. Please log in.",
    invalidCredentials: "The email or password is incorrect.",
    unauthorized: "Please log in to continue.",
    forbidden: "You do not have permission to open this page.",
    serverError: "We couldn’t complete your request. Please try again.",
    invalidRequest: "The request is invalid. Please try again.",
  },
  ar: {
    required: "يرجى تعبئة جميع الحقول.",
    emailInvalid: "يرجى إدخال بريد إلكتروني صحيح.",
    passwordShort: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
    passwordLong: "كلمة المرور طويلة جداً. يرجى ألا تتجاوز 72 بايت.",
    inputTooLong: "أحد الحقول طويل جداً. يرجى تقصيره.",
    emailTaken: "يوجد حساب بهذا البريد الإلكتروني. يرجى تسجيل الدخول.",
    invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    unauthorized: "يرجى تسجيل الدخول للمتابعة.",
    forbidden: "ليس لديك صلاحية لفتح هذه الصفحة.",
    serverError: "تعذر إكمال طلبك. يرجى المحاولة مرة أخرى.",
    invalidRequest: "الطلب غير صالح. يرجى المحاولة مرة أخرى.",
  },
};

export function authMessage(code: string, lang: "en" | "ar") {
  return messages[lang][code as AuthErrorCode] ?? messages[lang].serverError;
}

export function signupRole(email: string, adminEmail: string): "user" | "admin" {
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase() ? "admin" : "user";
}

export function validateCredentials(input: Record<string, unknown>, signup: boolean): AuthErrorCode | null {
  const fields = signup ? ["name", "email", "phone", "password"] : ["email", "password"];
  if (fields.some(field => typeof input[field] !== "string" || !(input[field] as string).trim())) return "required";
  const email = (input.email as string).trim();
  const password = input.password as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "emailInvalid";
  if (signup && password.length < 8) return "passwordShort";
  if (new TextEncoder().encode(password).length > 72) return "passwordLong";
  if (email.length > 254 || (signup && ((input.name as string).length > 200 || (input.phone as string).length > 40))) return "inputTooLong";
  return null;
}

export function safeReturnTo(value: unknown, fallback = "/wallet") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f]/.test(decoded)) return fallback;
    const url = new URL(value, "https://sahmi.local");
    if (url.origin !== "https://sahmi.local" || /^\/(api|login|signup)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}

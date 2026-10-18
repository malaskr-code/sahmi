import { NextResponse } from "next/server";

export type PaymentErrorCode =
  | "invalidRequest"
  | "invalidAmount"
  | "minimumTopup"
  | "invalidGift"
  | "insufficientWallet"
  | "productUnavailable"
  | "checkoutUnavailable"
  | "sessionPending"
  | "sessionInvalid"
  | "giftUnavailable"
  | "giftRedeemed";

export class PaymentError extends Error {
  constructor(readonly code: PaymentErrorCode, readonly status = 400) {
    super(code);
    this.name = "PaymentError";
  }
}

const messages: Record<"en" | "ar", Record<PaymentErrorCode, string>> = {
  en: {
    invalidRequest: "The request is invalid. Please check the details and try again.",
    invalidAmount: "Enter a valid amount in KWD, in increments of 0.010 KWD.",
    minimumTopup: "The minimum wallet top-up is 1.000 KWD.",
    invalidGift: "Please check the recipient, message, share count, and card theme.",
    insufficientWallet: "Your available wallet balance is not enough for this gift.",
    productUnavailable: "That company is no longer available. Refresh the store and try again.",
    checkoutUnavailable: "Secure checkout is temporarily unavailable. Please try again.",
    sessionPending: "Payment is still being confirmed. Refresh this page shortly.",
    sessionInvalid: "We could not verify this payment. Please contact support before trying again.",
    giftUnavailable: "This gift code is invalid or has already been redeemed.",
    giftRedeemed: "This gift has already been redeemed.",
  },
  ar: {
    invalidRequest: "الطلب غير صالح. تحقق من البيانات وحاول مرة أخرى.",
    invalidAmount: "أدخل مبلغاً صحيحاً بالدينار، بزيادات قدرها 0.010 د.ك.",
    minimumTopup: "الحد الأدنى لشحن المحفظة هو 1.000 د.ك.",
    invalidGift: "تحقق من اسم المستلم والرسالة وعدد الأسهم وتصميم البطاقة.",
    insufficientWallet: "الرصيد المتاح في محفظتك لا يكفي لهذه الهدية.",
    productUnavailable: "هذه الشركة غير متاحة الآن. حدّث المتجر وحاول مرة أخرى.",
    checkoutUnavailable: "الدفع الآمن غير متاح مؤقتاً. يرجى المحاولة مرة أخرى.",
    sessionPending: "لا يزال الدفع قيد التأكيد. حدّث هذه الصفحة بعد قليل.",
    sessionInvalid: "تعذر التحقق من هذا الدفع. يرجى التواصل مع الدعم قبل المحاولة مجدداً.",
    giftUnavailable: "رمز الهدية غير صالح أو تم استرداده مسبقاً.",
    giftRedeemed: "تم استرداد هذه الهدية مسبقاً.",
  },
};

export function paymentJson(
  request: Request,
  status: number,
  code: PaymentErrorCode,
  extra: Record<string, unknown> = {},
) {
  const lang = request.headers.get("accept-language")?.toLowerCase().startsWith("ar") ? "ar" : "en";
  return NextResponse.json(
    { ok: false, code, error: messages[lang][code], ...extra },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function paymentServerError(request: Request) {
  const lang = request.headers.get("accept-language")?.toLowerCase().startsWith("ar") ? "ar" : "en";
  return NextResponse.json(
    { ok: false, code: "serverError", error: lang === "ar" ? "تعذر إكمال طلبك. يرجى المحاولة مرة أخرى." : "We couldn’t complete your request. Please try again." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

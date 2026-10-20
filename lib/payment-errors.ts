import { NextResponse } from "next/server";

export type PaymentErrorCode =
  | "invalidRequest"
  | "unauthorized"
  | "invalidAmount"
  | "minimumTopup"
  | "priceQuoteExpired"
  | "walletBalanceChanged"
  | "tapError"
  | "paymentNotCompleted"
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
    unauthorized: "Please log in to continue.",
    invalidAmount: "Enter a valid amount in KWD.",
    minimumTopup: "The minimum wallet top-up is 1.000 KWD.",
    priceQuoteExpired: "The price was updated. Please review the new total.",
    walletBalanceChanged: "Your wallet balance changed. Please review the payment.",
    tapError: "Payment couldn't start. Please try again.",
    paymentNotCompleted: "The payment was not completed. Please try again.",
    invalidGift: "Please check the recipient, message, share count, and card theme.",
    insufficientWallet: "Your wallet balance changed. Please review the payment.",
    productUnavailable: "This company isn't available right now.",
    checkoutUnavailable: "Secure checkout is temporarily unavailable. Please try again.",
    sessionPending: "Payment is still being confirmed. Refresh this page shortly.",
    sessionInvalid: "We could not verify this payment. Please contact support before trying again.",
    giftUnavailable: "This gift code is invalid or has already been redeemed.",
    giftRedeemed: "This gift has already been redeemed.",
  },
  ar: {
    invalidRequest: "الطلب غير صالح. تحقق من البيانات وحاول مرة أخرى.",
    unauthorized: "يرجى تسجيل الدخول للمتابعة.",
    invalidAmount: "أدخل مبلغاً صحيحاً بالدينار الكويتي.",
    minimumTopup: "الحد الأدنى لشحن المحفظة هو 1.000 د.ك.",
    priceQuoteExpired: "تم تحديث السعر. يرجى مراجعة الإجمالي الجديد.",
    walletBalanceChanged: "تغيّر رصيد محفظتك. يرجى مراجعة طريقة الدفع.",
    tapError: "تعذّر بدء الدفع. يرجى المحاولة مرة أخرى.",
    paymentNotCompleted: "لم يكتمل الدفع. يرجى المحاولة مرة أخرى.",
    invalidGift: "تحقق من اسم المستلم والرسالة وعدد الأسهم وتصميم البطاقة.",
    insufficientWallet: "تغيّر رصيد محفظتك. يرجى مراجعة طريقة الدفع.",
    productUnavailable: "هذه الشركة غير متاحة الآن.",
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

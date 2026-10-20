import { createHmac, timingSafeEqual } from "node:crypto";

const TAP_CHARGES_URL = "https://api.tap.company/v2/charges";

export class TapConfigurationError extends Error {
  constructor(message = "TAP_SECRET_KEY is missing or invalid.") {
    super(message);
    this.name = "TapConfigurationError";
  }
}

type TapCharge = {
  id?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
  transaction?: { url?: unknown; created?: unknown };
  reference?: {
    order?: unknown;
    gateway?: unknown;
    payment?: unknown;
  };
  metadata?: { udf1?: unknown };
};

function tapSecretKey() {
  const key = process.env.TAP_SECRET_KEY;
  if (!key || (!key.startsWith("sk_test_") && !key.startsWith("sk_live_"))) {
    throw new TapConfigurationError();
  }
  return key;
}

export function assertTapConfigured() {
  tapSecretKey();
}

async function tapRequest(url: string, init: RequestInit, langCode?: "en" | "ar") {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${tapSecretKey()}`,
      "Content-Type": "application/json",
      ...(langCode ? { lang_code: langCode } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok || !body || typeof body !== "object") {
    console.error("Tap API request failed.", { status: response.status });
    throw new Error("Tap API request failed.");
  }
  return body as TapCharge;
}

export async function createTapCharge(input: {
  orderId: string;
  amountFils: number;
  customerName: string;
  customerEmail: string;
  description: string;
  returnUrl: string;
  webhookUrl: string;
  langCode: "en" | "ar";
}) {
  const amount = input.amountFils / 1000;
  if (!Number.isSafeInteger(input.amountFils) || input.amountFils < 100) {
    throw new Error("Tap charges must be at least 0.100 KWD.");
  }

  const nameParts = input.customerName.trim().split(/\s+/).filter(Boolean);
  const charge = await tapRequest(TAP_CHARGES_URL, {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "KWD",
      customer_initiated: true,
      threeDSecure: true,
      description: input.description,
      metadata: { udf1: input.orderId },
      reference: {
        transaction: input.orderId,
        order: input.orderId,
        idempotent: `sahmi-${input.orderId}`,
      },
      customer: {
        first_name: (nameParts[0] || "Sahmi customer").slice(0, 100),
        ...(nameParts.length > 1 ? { last_name: nameParts.slice(1).join(" ").slice(0, 100) } : {}),
        email: input.customerEmail,
      },
      source: { id: "src_all" },
      redirect: { url: input.returnUrl },
      post: { url: input.webhookUrl },
    }),
  }, input.langCode);

  const id = typeof charge.id === "string" ? charge.id : "";
  const url = typeof charge.transaction?.url === "string" ? charge.transaction.url : "";
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    // A malformed checkout URL is treated like a provider error.
  }
  if (
    !id ||
    !parsedUrl ||
    parsedUrl.protocol !== "https:" ||
    !(parsedUrl.hostname === "tap.company" || parsedUrl.hostname.endsWith(".tap.company"))
  ) {
    console.error("Tap returned an invalid hosted checkout response.");
    throw new Error("Tap returned an invalid checkout response.");
  }
  return { id, url };
}

export function retrieveTapCharge(chargeId: string) {
  if (!/^chg_[A-Za-z0-9_-]{8,100}$/.test(chargeId)) {
    throw new Error("Invalid Tap charge ID.");
  }
  return tapRequest(`${TAP_CHARGES_URL}/${encodeURIComponent(chargeId)}`, { method: "GET" });
}

export function verifyTapWebhookHash(charge: TapCharge, providedHash: string | null) {
  if (!providedHash || !/^[a-f0-9]{64}$/i.test(providedHash)) return false;
  const amount = typeof charge.amount === "number" ? charge.amount : Number(charge.amount);
  const created = charge.transaction?.created;
  const id = charge.id;
  const currency = charge.currency;
  const status = charge.status;
  if (
    !Number.isFinite(amount) ||
    !Number.isSafeInteger(Math.round(amount * 1000)) ||
    typeof id !== "string" ||
    typeof currency !== "string" ||
    typeof status !== "string" ||
    (typeof created !== "string" && typeof created !== "number")
  ) return false;

  const fields = [
    `x_id${id}`,
    `x_amount${amount.toFixed(currency === "KWD" ? 3 : 2)}`,
    `x_currency${currency}`,
    `x_gateway_reference${typeof charge.reference?.gateway === "string" ? charge.reference.gateway : ""}`,
    `x_payment_reference${typeof charge.reference?.payment === "string" ? charge.reference.payment : ""}`,
    `x_status${status}`,
    `x_created${created}`,
  ].join("");
  const expected = createHmac("sha256", tapSecretKey()).update(fields).digest();
  const provided = Buffer.from(providedHash, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export type TapChargeResponse = TapCharge;

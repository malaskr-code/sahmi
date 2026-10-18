import { createHmac, timingSafeEqual } from "node:crypto";
import type { CardThemeId } from "@/data/cardThemes";

const PRICE_LOCK_MS = 10 * 60 * 1000;

type QuotePayload = {
  version: 1;
  userId: string;
  productId: string;
  shares: number;
  payment: "wallet" | "card" | "both";
  unitPriceFils: number;
  walletFils: number;
  issuedAt: number;
};

function quoteKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing.");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", quoteKey()).update(payload).digest();
}

export function signPriceQuote(input: Omit<QuotePayload, "version">) {
  const payload = Buffer.from(JSON.stringify({ ...input, version: 1 }), "utf8").toString("base64url");
  const digest = signature(payload).toString("base64url");
  return `${payload}.${digest}`;
}

export function verifyPriceQuote(
  token: unknown,
  expected: { userId: string; productId: string; shares: number; payment: "wallet" | "card" | "both" },
  now = Date.now(),
) {
  if (typeof token !== "string" || token.length > 2048) return null;
  const [payloadText, signatureText, extra] = token.split(".");
  if (!payloadText || !signatureText || extra !== undefined) return null;
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureText, "base64url");
  } catch {
    return null;
  }
  const expectedSignature = signature(payloadText);
  if (provided.length !== expectedSignature.length || !timingSafeEqual(provided, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadText, "base64url").toString("utf8")) as QuotePayload;
    if (
      payload.version !== 1 ||
      payload.userId !== expected.userId ||
      payload.productId !== expected.productId ||
      payload.shares !== expected.shares ||
      payload.payment !== expected.payment ||
      !Number.isSafeInteger(payload.unitPriceFils) ||
      payload.unitPriceFils <= 0 ||
      payload.unitPriceFils % 10 !== 0 ||
      !Number.isSafeInteger(payload.walletFils) ||
      payload.walletFils < 0 ||
      payload.walletFils % 10 !== 0 ||
      !Number.isSafeInteger(payload.issuedAt) ||
      payload.issuedAt > now + 30_000 ||
      now - payload.issuedAt >= PRICE_LOCK_MS
    ) return null;
    return {
      unitPriceFils: payload.unitPriceFils,
      walletFils: payload.walletFils,
      issuedAt: payload.issuedAt,
      expiresAt: payload.issuedAt + PRICE_LOCK_MS,
    };
  } catch {
    return null;
  }
}

export type GiftPriceQuote = {
  productId: string;
  shares: number;
  payment: "wallet" | "card" | "both";
  theme?: CardThemeId;
};

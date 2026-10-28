import { createHmac, timingSafeEqual } from "node:crypto";
import type { CardThemeId } from "@/data/cardThemes";

const PRICE_LOCK_MS = 10 * 60 * 1000;

export type QuoteItemPayload = {
  productId: string;
  shares: number;
  unitPriceFils: number;
};

type QuotePayload = {
  version: 5;
  userId: string;
  items: QuoteItemPayload[];
  payment: "wallet" | "card" | "demo";
  walletFils: number;
  cardChargeFils: number;
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
  const payload = Buffer.from(JSON.stringify({ ...input, version: 5 }), "utf8").toString("base64url");
  const digest = signature(payload).toString("base64url");
  return `${payload}.${digest}`;
}

export function verifyPriceQuote(
  token: unknown,
  expected: { userId: string; items: Array<{ productId: string; shares: number }>; payment: "wallet" | "card" | "demo" },
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
      payload.version !== 5 ||
      payload.userId !== expected.userId ||
      !Array.isArray(payload.items) ||
      payload.items.length < 1 || payload.items.length > 5 ||
      payload.payment !== expected.payment ||
      !Number.isSafeInteger(payload.walletFils) ||
      payload.walletFils < 0 ||
      !Number.isSafeInteger(payload.cardChargeFils) ||
      payload.cardChargeFils < 0 ||
      !Number.isSafeInteger(payload.issuedAt) ||
      payload.issuedAt > now + 30_000 ||
      now - payload.issuedAt >= PRICE_LOCK_MS
    ) return null;
    const seen = new Set<string>();
    if (payload.items.length !== expected.items.length || payload.items.some((item, index) => {
      if (!item || typeof item.productId !== "string" || !item.productId || item.productId.length > 100
        || !Number.isSafeInteger(item.shares) || item.shares < 1
        || !Number.isSafeInteger(item.unitPriceFils) || item.unitPriceFils <= 0
        || item.productId !== expected.items[index]?.productId
        || item.shares !== expected.items[index]?.shares
        || seen.has(item.productId)) return true;
      seen.add(item.productId);
      return false;
    })) return null;
    return {
      items: payload.items,
      walletFils: payload.walletFils,
      cardChargeFils: payload.cardChargeFils,
      issuedAt: payload.issuedAt,
      expiresAt: payload.issuedAt + PRICE_LOCK_MS,
    };
  } catch {
    return null;
  }
}

export type GiftPriceQuote = {
  items: Array<{ productId: string; shares: number }>;
  payment: "wallet" | "card" | "demo";
  theme?: CardThemeId;
};

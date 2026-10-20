import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  KWD_FILS_PER_UNIT,
  MIN_CARD_PAYMENT_FILS,
  SERVICE_FEE_FILS,
  filsToKwd,
  kwdToFils,
  parseTopupFils,
} from "../lib/money";
import { createGiftCode, decryptGiftCode, encryptGiftCode, hashGiftCode } from "../lib/gift-codes";
import { signPriceQuote, verifyPriceQuote } from "../lib/price-quote";
import { createTapCharge, verifyTapWebhookHash } from "../lib/tap";

test("Tap checkout amounts and Sahmi wallet accounting use KWD fils", () => {
  assert.equal(KWD_FILS_PER_UNIT, 1000);
  assert.equal(SERVICE_FEE_FILS, 250);
  assert.equal(MIN_CARD_PAYMENT_FILS, 100);
  assert.equal(kwdToFils(5), 5000);
  assert.equal(kwdToFils(0.01), 10);
  assert.equal(kwdToFils(0.813), 813);
  assert.equal(filsToKwd(250), 0.25);
  assert.equal(parseTopupFils(1), 1000);
  assert.equal(parseTopupFils(5), 5000);
  assert.equal(parseTopupFils(0.99), null);
  assert.equal(parseTopupFils(1.001), null);
  assert.equal(parseTopupFils(1.005), null);
  assert.equal(parseTopupFils("5"), null);
  assert.throws(() => kwdToFils(0.0009));
});

test("gift codes are readable, normalized before hashing, and only recoverable with encryption", () => {
  process.env.CODE_SECRET = "unit-test-encryption-secret";
  try {
    const code = createGiftCode("zain");
    assert.match(code, /^ZAIN-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    assert.equal(hashGiftCode(code), hashGiftCode(code.toLowerCase().replaceAll("-", " ")));
    const encrypted = encryptGiftCode(code);
    assert.notEqual(encrypted, code);
    assert.equal(decryptGiftCode(encrypted), code);
    assert.throws(() => decryptGiftCode(encrypted.replace(/.$/, "A")));
  } finally {
    delete process.env.CODE_SECRET;
  }
});

test("gift price quotes are signed to the user and expire after ten minutes", () => {
  process.env.JWT_SECRET = "unit-test-quote-signing-secret";
  try {
    const issuedAt = Date.now();
    const input = {
      userId: "user-123",
      productId: "zain",
      shares: 3,
      payment: "both" as const,
      unitPriceFils: 813,
      walletFils: 153,
      cardChargeFils: 824,
      issuedAt,
    };
    const token = signPriceQuote(input);
    const expected = { userId: "user-123", productId: "zain", shares: 3, payment: "both" as const };
    assert.deepEqual(verifyPriceQuote(token, expected, issuedAt + 599_999), {
      unitPriceFils: 813,
      walletFils: 153,
      cardChargeFils: 824,
      issuedAt,
      expiresAt: issuedAt + 600_000,
    });
    assert.equal(verifyPriceQuote(token, expected, issuedAt + 600_000), null);
    assert.equal(verifyPriceQuote(token, { ...expected, userId: "another-user" }, issuedAt + 1000), null);
    assert.equal(verifyPriceQuote(`${token.slice(0, -1)}A`, expected, issuedAt + 1000), null);
    assert.equal(verifyPriceQuote(token, { ...expected, shares: 4 }, issuedAt + 1000), null);
  } finally {
    delete process.env.JWT_SECRET;
  }
});

test("demo gift quotes are signed, expire normally, and reserve neither wallet nor card funds", () => {
  process.env.JWT_SECRET = "unit-test-quote-signing-secret";
  try {
    const issuedAt = Date.now();
    const input = {
      userId: "user-123",
      productId: "zain",
      shares: 2,
      payment: "demo" as const,
      unitPriceFils: 813,
      walletFils: 0,
      cardChargeFils: 0,
      issuedAt,
    };
    const token = signPriceQuote(input);
    const expected = { userId: "user-123", productId: "zain", shares: 2, payment: "demo" as const };
    assert.deepEqual(verifyPriceQuote(token, expected, issuedAt + 599_999), {
      unitPriceFils: 813,
      walletFils: 0,
      cardChargeFils: 0,
      issuedAt,
      expiresAt: issuedAt + 600_000,
    });
    assert.equal(verifyPriceQuote(token, expected, issuedAt + 600_000), null);
    assert.equal(verifyPriceQuote(token, { ...expected, payment: "card" }, issuedAt + 1000), null);
  } finally {
    delete process.env.JWT_SECRET;
  }
});

test("Tap webhook hash follows the documented KWD hashstring fields", () => {
  const secret = "sk_test_unit-test-secret";
  process.env.TAP_SECRET_KEY = secret;
  try {
    const charge = {
      id: "chg_TS05A4120230736x9K22710693",
      amount: 1.25,
      currency: "KWD",
      status: "CAPTURED",
      transaction: { created: "1698392202943" },
      reference: { gateway: "gw-123", payment: "pay-456" },
    };
    const message = `x_id${charge.id}x_amount1.250x_currencyKWDx_gateway_referencegw-123x_payment_referencepay-456x_statusCAPTUREDx_created1698392202943`;
    const hash = createHmac("sha256", secret).update(message).digest("hex");
    assert.equal(verifyTapWebhookHash(charge, hash), true);
    assert.equal(verifyTapWebhookHash(charge, `${hash.slice(0, -1)}0`), false);
    assert.equal(verifyTapWebhookHash(charge, null), false);
  } finally {
    delete process.env.TAP_SECRET_KEY;
  }
});

test("Tap creates a hosted KWD charge with the saved order reference", async () => {
  const secret = "sk_test_unit-test-secret";
  const originalFetch = globalThis.fetch;
  const requestBodies: Record<string, unknown>[] = [];
  process.env.TAP_SECRET_KEY = secret;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "https://api.tap.company/v2/charges");
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${secret}`);
    assert.equal(new Headers(init?.headers).get("lang_code"), "en");
    requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({
      id: "chg_TS05A4120230736x9K22710693",
      transaction: { url: "https://checkout.payments.tap.company?mode=page&token=test" },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await createTapCharge({
      orderId: "507f1f77bcf86cd799439011",
      amountFils: 1250,
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      description: "Test gift",
      returnUrl: "https://sahmi.example/checkout/success?order_id=507f1f77bcf86cd799439011",
      webhookUrl: "https://sahmi.example/api/tap/webhook",
      langCode: "en",
    });
    assert.equal(result.id, "chg_TS05A4120230736x9K22710693");
    assert.equal(result.url, "https://checkout.payments.tap.company?mode=page&token=test");
    const body = requestBodies[0];
    assert.ok(body);
    assert.equal(body.amount, 1.25);
    assert.equal(body.currency, "KWD");
    assert.equal(body.order, undefined);
    assert.deepEqual(body.source, { id: "src_all" });
    assert.deepEqual(body.reference, {
      transaction: "507f1f77bcf86cd799439011",
      order: "507f1f77bcf86cd799439011",
      idempotent: "sahmi-507f1f77bcf86cd799439011",
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.TAP_SECRET_KEY;
  }
});

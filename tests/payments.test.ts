import assert from "node:assert/strict";
import { test } from "node:test";
import {
  KWD_FILS_PER_UNIT,
  SERVICE_FEE_FILS,
  filsToKwd,
  kwdFilsToUsdCents,
  kwdToFils,
  parseTopupFils,
} from "../lib/money";
import { createGiftCode, decryptGiftCode, encryptGiftCode, hashGiftCode } from "../lib/gift-codes";
import { signPriceQuote, verifyPriceQuote } from "../lib/price-quote";

test("KWD amounts use fils and enforce Stripe's 10-fils increment", () => {
  assert.equal(KWD_FILS_PER_UNIT, 1000);
  assert.equal(SERVICE_FEE_FILS, 250);
  assert.equal(kwdToFils(5), 5000);
  assert.equal(kwdToFils(0.01), 10);
  assert.equal(kwdFilsToUsdCents(1000), 325);
  assert.equal(kwdFilsToUsdCents(10), 3);
  assert.equal(kwdFilsToUsdCents(250), 81);
  assert.equal(kwdFilsToUsdCents(4000), 1300);
  assert.equal(kwdFilsToUsdCents(150), 49);
  assert.equal(kwdFilsToUsdCents(160), 52);
  assert.equal(filsToKwd(250), 0.25);
  assert.equal(parseTopupFils(1), 1000);
  assert.equal(parseTopupFils(5), 5000);
  assert.equal(parseTopupFils(0.99), null);
  assert.equal(parseTopupFils(1.001), null);
  assert.equal(parseTopupFils("5"), null);
  assert.throws(() => kwdToFils(0.009));
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
      unitPriceFils: 1250,
      walletFils: 1500,
      cardChargeUsdCents: 813,
      issuedAt,
    };
    const token = signPriceQuote(input);
    const expected = { userId: "user-123", productId: "zain", shares: 3, payment: "both" as const };
    assert.deepEqual(verifyPriceQuote(token, expected, issuedAt + 599_999), {
      unitPriceFils: 1250,
      walletFils: 1500,
      cardChargeUsdCents: 813,
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

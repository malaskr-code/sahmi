import assert from "node:assert/strict";
import { test } from "node:test";
import { parseQuotes } from "../lib/quotes";

function payload(quotes = [
  { symbol: "KFH", last: 759, change_pct: -0.1316, currency: "KWF" },
  { symbol: "NBK", last: 0.813, change_pct: 0, currency: "KWD" },
]) {
  return { success: true, data: { quotes }, meta: { timestamp: "2026-10-18T19:41:49.724Z" } };
}

test("converts fils to KWD and preserves percentages, zero change and timestamp", () => {
  const quotes = parseQuotes(payload(), ["KFH", "NBK"]);
  assert.equal(quotes[0].price, 0.759);
  assert.equal(quotes[0].change, -0.1316);
  assert.equal(quotes[1].price, 0.813);
  assert.equal(quotes[1].change, 0);
  assert.equal(quotes[0].priceUpdatedAt.toISOString(), "2026-10-18T19:41:49.724Z");
});

test("rejects error, incomplete, invalid-price and unsupported-currency responses", () => {
  assert.throws(() => parseQuotes({ success: false }, ["KFH"]));
  assert.throws(() => parseQuotes(payload(), ["MISSING"]));
  assert.throws(() => parseQuotes(payload([{ symbol: "KFH", last: 0, change_pct: 0, currency: "KWF" }]), ["KFH"]));
  assert.throws(() => parseQuotes(payload([{ symbol: "KFH", last: 759, change_pct: 0, currency: "USD" }]), ["KFH"]));
});

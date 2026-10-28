import assert from "node:assert/strict";
import { test, mock } from "node:test";
import Product from "../models/Product";
import PriceRefresh from "../models/PriceRefresh";
import { refreshPrices } from "../lib/price-refresh";
import { PRICE_REFRESH_MS } from "../lib/quotes";
import { seedProducts } from "../scripts/seed-data";

const stockProducts = seedProducts.filter(product => product.type !== "metal");

test("fresh products do not call the quote API or acquire a lease", async () => {
  mock.method(Product, "findOne", () => ({ sort: () => ({ lean: async () => ({ priceUpdatedAt: new Date() }) }) }));
  const fetchMock = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected network call"); });
  try { await refreshPrices(); assert.equal(fetchMock.mock.callCount(), 0); }
  finally { mock.restoreAll(); }
});

test("concurrent readers refresh all 12 symbols in one request and save one batch", async () => {
  let leaseUpdate: Record<string, Date> | undefined;
  mock.method(Product, "findOne", () => ({ sort: () => ({ lean: async () => ({ priceUpdatedAt: null }) }) }));
  mock.method(Product, "find", () => ({ select: () => ({ lean: async () => stockProducts.map(p => ({ ticker: p.ticker, priceUpdatedAt: null })) }) }));
  mock.method(PriceRefresh, "updateOne", async () => ({}));
  mock.method(PriceRefresh, "findOneAndUpdate", async (_query: unknown, update: { $set: Record<string, Date> }) => {
    leaseUpdate = update.$set;
    return { _id: "kuwait-quotes" };
  });
  const writes = mock.method(Product, "bulkWrite", async () => ({}));
  const fetchMock = mock.method(globalThis, "fetch", async (url: URL | RequestInfo) => {
    assert.deepEqual(new URL(String(url)).searchParams.get("symbols")?.split(","), stockProducts.map(p => p.ticker));
    return Response.json({ success: true, data: { quotes: stockProducts.map(p => ({
      symbol: p.ticker, last: 759, change_pct: 0, currency: "KWF",
    })) } });
  });
  try {
    const before = Date.now();
    await Promise.all(Array.from({ length: 20 }, () => refreshPrices()));
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(writes.mock.callCount(), 1);
    assert.equal((writes.mock.calls[0].arguments[0] as unknown[]).length, 12);
    assert.ok(leaseUpdate!.nextAttemptAt.getTime() >= before + PRICE_REFRESH_MS);
  } finally { mock.restoreAll(); }
});

test("another server holding the durable lease prevents a quote request", async () => {
  mock.method(Product, "findOne", () => ({ sort: () => ({ lean: async () => ({ priceUpdatedAt: null }) }) }));
  mock.method(PriceRefresh, "updateOne", async () => ({}));
  mock.method(PriceRefresh, "findOneAndUpdate", async () => null);
  const fetchMock = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected network call"); });
  try { await refreshPrices(); assert.equal(fetchMock.mock.callCount(), 0); }
  finally { mock.restoreAll(); }
});

test("upstream failure keeps saved prices and releases the lease", async () => {
  mock.method(Product, "findOne", () => ({ sort: () => ({ lean: async () => ({ priceUpdatedAt: null }) }) }));
  mock.method(Product, "find", () => ({ select: () => ({ lean: async () => [{ ticker: "KFH", priceUpdatedAt: null }] }) }));
  const leaseWrites = mock.method(PriceRefresh, "updateOne", async () => ({}));
  mock.method(PriceRefresh, "findOneAndUpdate", async () => ({ _id: "kuwait-quotes" }));
  const productWrites = mock.method(Product, "bulkWrite", async () => ({}));
  mock.method(globalThis, "fetch", async () => Response.json({ error: "quota" }, { status: 429 }));
  mock.method(console, "warn", () => {});
  try {
    await refreshPrices();
    assert.equal(productWrites.mock.callCount(), 0);
    assert.equal(leaseWrites.mock.callCount(), 2);
  } finally { mock.restoreAll(); }
});

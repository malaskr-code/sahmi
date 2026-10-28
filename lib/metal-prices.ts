import mongoose from "mongoose";
import ApiCallLog from "@/models/ApiCallLog";
import MetalPrice from "@/models/MetalPrice";
import PriceRefresh from "@/models/PriceRefresh";
import Product from "@/models/Product";

const METAL_REFRESH_MS = 30 * 60 * 1000;
const FX_REFRESH_MS = 24 * 60 * 60 * 1000;
const TROY_OUNCE_GRAMS = 31.1034768;
const metals = ["XAU", "XAG"] as const;

export type MetalRefreshResult = "refreshed" | "fresh" | "cooldown" | "failed";
const state = globalThis as typeof globalThis & { sahmiMetalPriceRefresh?: Promise<MetalRefreshResult> };

type GoldApiQuote = {
  symbol?: string;
  currency?: string;
  price?: number;
  updatedAt?: string;
};

async function loggedJson(
  provider: "gold-api" | "exchange-rate-api",
  endpoint: string,
  url: string,
) {
  const calledAt = new Date();
  let statusCode: number | null = null;
  let succeeded = false;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" },
    });
    statusCode = response.status;
    if (!response.ok) throw new Error(`${provider} request failed (${response.status}).`);
    const payload: unknown = await response.json();
    succeeded = true;
    return payload;
  } finally {
    if (mongoose.connection.readyState === 1) {
      try {
        await ApiCallLog.create({ provider, endpoint, calledAt, succeeded, statusCode });
      } catch {
        console.warn(`Could not record the ${provider} API call.`);
      }
    }
  }
}

async function fetchMetalQuote(ticker: typeof metals[number]) {
  const payload = await loggedJson("gold-api", `/price/${ticker}`, `https://api.gold-api.com/price/${ticker}`) as GoldApiQuote;
  if (payload.symbol !== ticker || payload.currency !== "USD" || !Number.isFinite(payload.price) || Number(payload.price) <= 0) {
    throw new Error(`Gold API returned an invalid ${ticker} price.`);
  }
  const sourceUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt) : null;
  if (sourceUpdatedAt && !Number.isFinite(sourceUpdatedAt.getTime())) throw new Error(`Gold API returned an invalid ${ticker} timestamp.`);
  return { ticker, usdPerTroyOunce: Number(payload.price), sourceUpdatedAt };
}

async function readUsdToKwd(now: Date) {
  const cached = await MetalPrice.findOne({ usdToKwd: { $gt: 0 }, fxUpdatedAt: { $gt: new Date(now.getTime() - FX_REFRESH_MS) } })
    .sort({ fxUpdatedAt: -1 })
    .lean();
  if (cached) return { rate: Number(cached.usdToKwd), updatedAt: new Date(cached.fxUpdatedAt) };

  const payload = await loggedJson("exchange-rate-api", "/v6/latest/USD", "https://open.er-api.com/v6/latest/USD") as {
    result?: string;
    base_code?: string;
    time_last_update_utc?: string;
    rates?: { KWD?: number };
  };
  const rate = Number(payload.rates?.KWD);
  if (payload.result !== "success" || payload.base_code !== "USD" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Exchange rate API returned an invalid USD/KWD rate.");
  }
  const updatedAt = payload.time_last_update_utc ? new Date(payload.time_last_update_utc) : now;
  if (!Number.isFinite(updatedAt.getTime())) throw new Error("Exchange rate API returned an invalid timestamp.");
  return { rate, updatedAt };
}

export function calculateKwdPerGram(usdPerTroyOunce: number, usdToKwd: number) {
  if (!Number.isFinite(usdPerTroyOunce) || usdPerTroyOunce <= 0 || !Number.isFinite(usdToKwd) || usdToKwd <= 0) {
    throw new Error("Metal price inputs must be positive finite numbers.");
  }
  return roundKwdPerGram(usdPerTroyOunce * usdToKwd / TROY_OUNCE_GRAMS);
}

function roundKwdPerGram(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  if (!Number.isFinite(rounded) || rounded <= 0) throw new Error("Calculated metal price is invalid.");
  return rounded;
}

async function refreshIfStale(): Promise<MetalRefreshResult> {
  const now = new Date();
  const activeProducts = await Product.find({ active: true, type: "metal", ticker: { $in: metals } })
    .select("ticker priceUpdatedAt")
    .lean();
  if (!activeProducts.length) return "fresh";
  if (activeProducts.every(product => product.priceUpdatedAt && now.getTime() - new Date(product.priceUpdatedAt).getTime() < METAL_REFRESH_MS)) {
    return "fresh";
  }

  const lockId = "sahmi-metal-prices";
  try {
    await PriceRefresh.updateOne(
      { _id: lockId },
      { $setOnInsert: { lockedUntil: new Date(0), nextAttemptAt: new Date(0) } },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const lease = await PriceRefresh.findOneAndUpdate(
    { _id: lockId, lockedUntil: { $lte: now }, nextAttemptAt: { $lte: now } },
    { $set: { lockedUntil: new Date(now.getTime() + 60_000), nextAttemptAt: new Date(now.getTime() + METAL_REFRESH_MS) } },
    { returnDocument: "after" },
  );
  if (!lease) return "cooldown";

  try {
    const recheck = await Product.find({ active: true, type: "metal", ticker: { $in: metals } }).select("ticker priceUpdatedAt").lean();
    if (recheck.length && recheck.every(product => product.priceUpdatedAt && Date.now() - new Date(product.priceUpdatedAt).getTime() < METAL_REFRESH_MS)) {
      return "fresh";
    }

    const [gold, silver, fx] = await Promise.all([
      fetchMetalQuote("XAU"),
      fetchMetalQuote("XAG"),
      readUsdToKwd(now),
    ]);
    const quotes = [gold, silver].map(quote => ({
      ...quote,
      usdToKwd: fx.rate,
      fxUpdatedAt: fx.updatedAt,
      priceKwdPerGram: calculateKwdPerGram(quote.usdPerTroyOunce, fx.rate),
      refreshedAt: now,
    }));
    await Promise.all([
      Product.bulkWrite(quotes.map(quote => ({
        updateOne: {
          filter: { ticker: quote.ticker, type: "metal", active: true },
          update: { $set: { price: quote.priceKwdPerGram, change: 0, priceUpdatedAt: now } },
        },
      }))),
      MetalPrice.bulkWrite(quotes.map(quote => ({
        updateOne: {
          filter: { ticker: quote.ticker },
          update: { $set: quote },
          upsert: true,
        },
      }))),
    ]);
    return "refreshed";
  } catch (error) {
    console.warn("Metal price refresh failed; keeping saved prices.", error instanceof Error ? error.name : "unknown");
    return "failed";
  } finally {
    await PriceRefresh.updateOne({ _id: lockId }, { $set: { lockedUntil: new Date(0) } });
  }
}

export async function refreshMetalPrices(): Promise<MetalRefreshResult> {
  if (!state.sahmiMetalPriceRefresh) {
    state.sahmiMetalPriceRefresh = refreshIfStale().finally(() => { state.sahmiMetalPriceRefresh = undefined; });
  }
  return state.sahmiMetalPriceRefresh;
}

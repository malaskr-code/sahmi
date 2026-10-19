import Product from "../models/Product";
import PriceRefresh from "../models/PriceRefresh";
import { fetchQuotes, PRICE_REFRESH_MS } from "./quotes";

export type PriceRefreshResult = "refreshed" | "fresh" | "cooldown" | "failed";
const state = globalThis as typeof globalThis & { sahmiPriceRefresh?: Promise<PriceRefreshResult> };

async function refreshIfStale(): Promise<PriceRefreshResult> {
  if (!process.env.KUWAIT_STOCK_API_KEY) {
    throw new Error("KUWAIT_STOCK_API_KEY is missing. Add it in Replit Secrets.");
  }
  const oldest = await Product.findOne({ active: true }).sort({ priceUpdatedAt: 1 }).lean();
  if (!oldest || (oldest.priceUpdatedAt && Date.now() - new Date(oldest.priceUpdatedAt).getTime() <= PRICE_REFRESH_MS)) return "fresh";

  const id = "kuwait-quotes";
  try {
    await PriceRefresh.updateOne({ _id: id }, {
      $setOnInsert: { lockedUntil: new Date(0), nextAttemptAt: new Date(0) },
    }, { upsert: true });
  } catch (error) {
    // A concurrent cold-start may create the singleton first.
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const now = new Date();
  const lease = await PriceRefresh.findOneAndUpdate({
    _id: id, lockedUntil: { $lte: now }, nextAttemptAt: { $lte: now },
  }, { $set: {
    lockedUntil: new Date(now.getTime() + 60000),
    // Failed attempts also wait eight hours, protecting the small free quota.
    nextAttemptAt: new Date(now.getTime() + PRICE_REFRESH_MS),
  } }, { returnDocument: "after" });
  if (!lease) return "cooldown";

  try {
    // Recheck inside the lease in case another instance completed a refresh.
    const products = await Product.find({ active: true }).select("ticker priceUpdatedAt").lean();
    if (!products.some(p => !p.priceUpdatedAt || Date.now() - new Date(p.priceUpdatedAt).getTime() > PRICE_REFRESH_MS)) return "fresh";
    const quotes = await fetchQuotes(products.map(p => p.ticker));
    await Product.bulkWrite(quotes.map(quote => ({
      updateOne: { filter: { ticker: quote.ticker, active: true }, update: { $set: quote } },
    })));
    return "refreshed";
  } catch {
    // Keep the last saved prices and their original timestamps on upstream errors.
    console.warn("Stock price refresh failed; keeping saved prices. Next attempt is limited to the eight-hour window.");
    return "failed";
  } finally {
    await PriceRefresh.updateOne({ _id: id }, { $set: { lockedUntil: new Date(0) } });
  }
}

export async function refreshPrices(): Promise<PriceRefreshResult> {
  if (!state.sahmiPriceRefresh) {
    state.sahmiPriceRefresh = refreshIfStale().finally(() => { state.sahmiPriceRefresh = undefined; });
  }
  return await state.sahmiPriceRefresh;
}

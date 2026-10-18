export const PRICE_REFRESH_MS = 8 * 60 * 60 * 1000;

type Quote = { symbol: string; last: number; change_pct: number; currency: string };

export function parseQuotes(payload: unknown, tickers: string[]) {
  const body = payload as { success?: boolean; data?: { quotes?: Quote[] }; meta?: { timestamp?: string } };
  if (body.success !== true || !Array.isArray(body.data?.quotes)) {
    throw new Error("Stock API returned an error or invalid quotes.");
  }
  const timestamp = body.meta?.timestamp ? new Date(body.meta.timestamp) : new Date();
  if (!Number.isFinite(timestamp.getTime())) throw new Error("Invalid quote timestamp.");
  return tickers.map(ticker => {
    const quote = body.data!.quotes!.find(row => row.symbol === ticker);
    if (!quote || !Number.isFinite(quote.last) || quote.last <= 0 || !Number.isFinite(quote.change_pct)) {
      throw new Error(`Missing or invalid quote for ${ticker}.`);
    }
    if (quote.currency !== "KWF" && quote.currency !== "KWD") throw new Error("Unsupported quote currency.");
    return {
      ticker,
      price: quote.currency === "KWF" ? quote.last / 1000 : quote.last,
      change: quote.change_pct,
      priceUpdatedAt: timestamp,
    };
  });
}

export async function fetchQuotes(tickers: string[]) {
  const key = process.env.KUWAIT_STOCK_API_KEY;
  if (!key) throw new Error("KUWAIT_STOCK_API_KEY is missing. Add it in Replit Secrets.");
  const url = new URL("https://api.oanor.com/kuwait-stock-api/v1/quote");
  url.searchParams.set("symbols", tickers.join(","));
  const response = await fetch(url, {
    headers: { "x-oanor-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Stock API request failed (${response.status}).`);
  return parseQuotes(await response.json(), tickers);
}

import { MARKET_CONFIG } from "@/data/market-config";

export function isMarketOpen(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_CONFIG.timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const minuteOfDay = Number(values.hour) * 60 + Number(values.minute);
  const opensAt = MARKET_CONFIG.openTime.hour * 60 + MARKET_CONFIG.openTime.minute;
  const closesAt = MARKET_CONFIG.closeTime.hour * 60 + MARKET_CONFIG.closeTime.minute;
  return MARKET_CONFIG.openDays.includes(values.weekday as (typeof MARKET_CONFIG.openDays)[number])
    && minuteOfDay >= opensAt && minuteOfDay < closesAt;
}

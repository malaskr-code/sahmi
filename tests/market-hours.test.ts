import assert from "node:assert/strict";
import test from "node:test";
import { isMarketOpen } from "../lib/market-hours";

test("Kuwait market follows the configured Sunday–Thursday 09:00–12:40 schedule", () => {
  assert.equal(isMarketOpen(new Date("2026-10-28T05:59:00Z")), false); // Wednesday 08:59 Kuwait
  assert.equal(isMarketOpen(new Date("2026-10-28T06:00:00Z")), true);  // Wednesday 09:00 Kuwait
  assert.equal(isMarketOpen(new Date("2026-10-28T09:39:00Z")), true);  // Wednesday 12:39 Kuwait
  assert.equal(isMarketOpen(new Date("2026-10-28T09:40:00Z")), false); // Wednesday 12:40 Kuwait
  assert.equal(isMarketOpen(new Date("2026-10-30T06:00:00Z")), false); // Friday
  assert.equal(isMarketOpen(new Date("2026-11-01T06:00:00Z")), true);  // Sunday
});

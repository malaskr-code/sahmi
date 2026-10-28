import test from "node:test";
import assert from "node:assert/strict";
import { calculateKwdPerGram } from "../lib/metal-prices";
import { isValidQuantity, multiplyFilsByQuantity, quantityToMilli } from "../lib/metal-units";

test("converts USD per troy ounce and KWD per USD into rounded KWD per gram", () => {
  assert.equal(calculateKwdPerGram(4057.5, 0.310652), 40.525);
  assert.equal(calculateKwdPerGram(54.116001, 0.310652), 0.540);
  assert.throws(() => calculateKwdPerGram(0, 0.31));
});

test("accepts fractional metal grams to three decimals, but keeps shares whole", () => {
  assert.equal(isValidQuantity("metal", 1.125), true);
  assert.equal(isValidQuantity("metal", 1.1251), false);
  assert.equal(isValidQuantity("metal", 0.001), true);
  assert.equal(isValidQuantity("share", 1.5), false);
  assert.equal(isValidQuantity("share", 3), true);
  assert.equal(quantityToMilli(5.125), 5125);
  assert.equal(quantityToMilli(5.1251), null);
});

test("rounds fractional gram totals once to the smallest KWD unit", () => {
  assert.equal(multiplyFilsByQuantity(40525, 1.235), 50048);
  assert.equal(multiplyFilsByQuantity(540, 10), 5400);
});

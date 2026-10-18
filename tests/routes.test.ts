import assert from "node:assert/strict";
import { test, mock } from "node:test";
import mongoose from "mongoose";
import Product from "../models/Product";
import { GET as listProducts } from "../app/api/products/route";
import { GET as productDetail } from "../app/api/products/[id]/route";

test("database failures produce clear 500 responses on both product routes", async () => {
  mock.method(mongoose, "connect", async () => mongoose);
  mock.method(Product, "findOne", () => ({ sort: () => ({ lean: async () => ({ priceUpdatedAt: new Date() }) }) }));
  mock.method(Product, "find", () => { throw new Error("Database unavailable"); });
  mock.method(Product, "exists", async () => { throw new Error("Database unavailable"); });
  try {
    const list = await listProducts(new Request("https://sahmi.test/api/products"));
    const detail = await productDetail(new Request("https://sahmi.test/api/products/kfh"), { params: Promise.resolve({ id: "kfh" }) });
    for (const response of [list, detail]) {
      assert.equal(response.status, 500);
      assert.match((await response.json()).error, /database connection/);
    }
  } finally { mock.restoreAll(); }
});

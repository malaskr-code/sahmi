import { connectDB } from "../lib/db";
import Product from "../models/Product";
import { seedProducts } from "./seed-data";

async function main() {
  const db = await connectDB();
  try {
    await Product.init();
    const result = await Product.bulkWrite(seedProducts.map(product => ({
      updateOne: {
        filter: { ticker: product.ticker },
        // Re-running the seed must not reset live prices or existing company edits.
        update: { $setOnInsert: { ...product, image: "", active: true, priceUpdatedAt: null, createdAt: new Date() } },
        upsert: true,
      },
    })));
    console.log(`Seed complete: ${result.upsertedCount} inserted; ${await Product.countDocuments()} total companies.`);
    console.log(`Tickers: ${seedProducts.map(p => p.ticker).join(", ")}`);
  } finally {
    await db.disconnect();
  }
}
main().catch(() => {
  console.error("Seed failed. Check MONGODB_URI and MongoDB network access.");
  process.exitCode = 1;
});

import mongoose, { Types } from "mongoose";
import Product from "@/models/Product";
import { connectDB } from "@/lib/db";
import { refreshPrices } from "@/lib/price-refresh";
import { PaymentError } from "@/lib/payment-errors";

export async function findCheckoutProduct(
  identifier: string,
  options: { refreshPrice?: boolean } = {},
) {
  await connectDB();
  if (options.refreshPrice) await refreshPrices();

  const key = identifier.trim();
  const tickerMatch = await Product.findOne({
    ticker: key.toUpperCase(),
    active: true,
  }).lean();
  if (tickerMatch) return tickerMatch;

  const idMatches: Record<string, unknown>[] = [{ slug: key }];
  if (mongoose.isValidObjectId(key)) idMatches.push({ _id: new Types.ObjectId(key) });
  const idMatch = await Product.findOne({
    active: true,
    $or: idMatches,
  }).lean();
  if (!idMatch) throw new PaymentError("productUnavailable", 404);
  return idMatch;
}

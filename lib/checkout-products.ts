import mongoose, { Types } from "mongoose";
import Product from "@/models/Product";
import { connectDB } from "@/lib/db";
import { refreshPrices } from "@/lib/price-refresh";
import { refreshMetalPrices } from "@/lib/metal-prices";
import { PaymentError } from "@/lib/payment-errors";

export async function findCheckoutProduct(
  identifier: string,
  options: { refreshPrice?: boolean } = {},
) {
  await connectDB();
  const key = identifier.trim();
  const idMatches: Record<string, unknown>[] = [{ slug: key }];
  if (mongoose.isValidObjectId(key)) idMatches.push({ _id: new Types.ObjectId(key) });
  const filter = {
    active: true,
    $or: [{ ticker: key.toUpperCase() }, ...idMatches],
  };
  let product = await Product.findOne(filter).lean();
  if (!product) throw new PaymentError("productUnavailable", 404);
  if (options.refreshPrice) {
    if (product.type === "metal") await refreshMetalPrices();
    else await refreshPrices();
    product = await Product.findOne(filter).lean();
  }
  if (!product) throw new PaymentError("productUnavailable", 404);
  return product;
}

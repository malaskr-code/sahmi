import mongoose, { Types } from "mongoose";
import Holding from "@/models/Holding";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { filsToKwd, kwdToFils } from "@/lib/money";
import { PaymentError } from "@/lib/payment-errors";
import { readWalletFils } from "@/lib/wallet";
import { refreshMetalPrices } from "@/lib/metal-prices";
import { isValidQuantity, multiplyFilsByQuantity, quantityToMilli } from "@/lib/metal-units";

export async function sellMetalToWallet(userId: string, productId: unknown, grams: unknown) {
  if (!mongoose.isValidObjectId(productId) || typeof grams !== "number" || !isValidQuantity("metal", grams)) {
    throw new PaymentError("invalidMetalQuantity");
  }
  await connectDB();
  await refreshMetalPrices();
  const product = await Product.findOne({ _id: new Types.ObjectId(String(productId)), type: "metal" }).select("ticker price priceUpdatedAt").lean();
  if (!product || !Number.isFinite(product.price) || Number(product.price) <= 0) throw new PaymentError("productUnavailable", 404);
  const amountFils = multiplyFilsByQuantity(kwdToFils(Number(product.price)), grams);
  if (!Number.isSafeInteger(amountFils) || amountFils <= 0) throw new PaymentError("invalidMetalQuantity");

  const userObjectId = new Types.ObjectId(userId);
  const session = await mongoose.startSession();
  const saleId = new Types.ObjectId();
  try {
    await session.withTransaction(async () => {
      const userUpdate = await User.updateOne({ _id: userObjectId }, { $inc: { walletRevision: 1 } }, { session });
      if (userUpdate.matchedCount !== 1) throw new PaymentError("unauthorized", 401);
      const holding = await Holding.findOne({ user: userObjectId, product: product._id, shares: { $gte: grams } }).session(session);
      if (!holding || !isValidQuantity("metal", Number(holding.shares)) || grams > Number(holding.shares)) {
        throw new PaymentError("insufficientMetal", 409);
      }
      const heldMilli = quantityToMilli(Number(holding.shares));
      const soldMilli = quantityToMilli(grams);
      if (heldMilli === null || soldMilli === null) throw new PaymentError("insufficientMetal", 409);
      const costBasisFils = kwdToFils(Number(holding.costBasis));
      const soldCostBasisFils = soldMilli === heldMilli
        ? costBasisFils
        : Math.min(costBasisFils, Math.round(costBasisFils * soldMilli / heldMilli));
      const nextGrams = (heldMilli - soldMilli) / 1000;
      const updated = await Holding.updateOne(
        { _id: holding._id, shares: holding.shares, costBasis: holding.costBasis },
        { $set: { shares: nextGrams, costBasis: filsToKwd(costBasisFils - soldCostBasisFils), updatedAt: new Date() } },
        { session },
      );
      if (updated.matchedCount !== 1) throw new PaymentError("insufficientMetal", 409);
      await Transaction.create([{
        user: userObjectId,
        type: "sale",
        amount: filsToKwd(amountFils),
        reference: `Metal sale ${product.ticker} · ${grams} g`,
        idempotencyKey: `metal-sale:${saleId}`,
      }], { session });
      // Confirm that the transaction remains consistent with the ledger after this sale.
      await readWalletFils(userId, session);
    });
  } finally {
    await session.endSession();
  }
  return { ok: true, ticker: product.ticker, grams, amount: filsToKwd(amountFils), pricePerGram: Number(product.price) };
}

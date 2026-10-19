import mongoose from "mongoose";
import { Types } from "mongoose";
import Gift from "@/models/Gift";
import Product from "@/models/Product";
import { decryptGiftCode, hashGiftCode, normalizeGiftCode } from "@/lib/gift-codes";
import { connectDB } from "@/lib/db";
import { refreshPrices } from "@/lib/price-refresh";
import { PaymentError } from "@/lib/payment-errors";
import { companyLogoBgFor, companyLogoFor } from "@/lib/company-logos";

function safeCode(input: unknown) {
  if (typeof input !== "string" || input.length > 80) throw new PaymentError("giftUnavailable", 404);
  const code = normalizeGiftCode(input);
  if (!/^[A-Z0-9]{5,24}$/.test(code)) throw new PaymentError("giftUnavailable", 404);
  return code;
}

export async function readMyGifts(buyerId: string) {
  await connectDB();
  await refreshPrices();
  const rows = await Gift.find({ $or: [{ buyer: new Types.ObjectId(buyerId) }, { redeemedBy: new Types.ObjectId(buyerId) }] })
    .select("order product buyer redeemedBy shares priceAtPurchase occasion theme message recipientName status redeemedAt createdAt +codeEncrypted")
    .populate({ path: "product", select: "ticker name nameAr image logoBg price" })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return rows.map(row => {
    const product = row.product as unknown as {
      _id: Types.ObjectId;
      ticker: string;
      name: string;
      nameAr: string;
      image: string;
      logoBg: string;
      price: number;
    } | null;
    if (!product) return null;
    return {
      id: String(row._id),
      direction: String(row.buyer) === buyerId ? "sent" as const : "received" as const,
      company: {
        ticker: product.ticker,
        name: product.name,
        nameAr: product.nameAr,
        image: companyLogoFor(product.ticker, product.image),
        logoBg: companyLogoBgFor(product.ticker, product.logoBg),
      },
      shares: row.shares,
      priceAtPurchase: row.priceAtPurchase,
      currentValue: product.price * row.shares,
      recipientName: row.recipientName,
      message: row.message,
      occasion: row.occasion,
      theme: row.theme,
      status: row.status,
      redeemedAt: row.redeemedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      code: String(row.buyer) === buyerId ? decryptGiftCode(String(row.codeEncrypted)) : null,
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function readGiftForRedemption(input: unknown) {
  const code = safeCode(input);
  await connectDB();
  const gift = await Gift.findOne({ codeHash: hashGiftCode(code) })
    .select("product shares recipientName message theme status")
    .populate({ path: "product", select: "ticker name nameAr image logoBg" })
    .lean();
  if (!gift) throw new PaymentError("giftUnavailable", 404);
  const product = gift.product as unknown as {
    ticker: string;
    name: string;
    nameAr: string;
    image: string;
    logoBg: string;
  } | null;
  if (!product) throw new PaymentError("giftUnavailable", 404);
  return {
    company: {
      ticker: product.ticker,
      name: product.name,
      nameAr: product.nameAr,
      image: companyLogoFor(product.ticker, product.image),
      logoBg: companyLogoBgFor(product.ticker, product.logoBg),
    },
    shares: gift.shares,
    recipientName: gift.recipientName,
    message: gift.message,
    theme: gift.theme,
    status: gift.status,
  };
}

export async function redeemGift(input: unknown, userId: string) {
  const code = safeCode(input);
  await connectDB();
  const result = await Gift.updateOne(
    { codeHash: hashGiftCode(code), status: "active" },
    { $set: { status: "redeemed", redeemedBy: new Types.ObjectId(userId), redeemedAt: new Date() } },
  );
  if (result.modifiedCount === 1) return { ok: true };
  if (await Gift.exists({ codeHash: hashGiftCode(code), status: "redeemed" })) throw new PaymentError("giftRedeemed", 409);
  throw new PaymentError("giftUnavailable", 404);
}

export async function readGiftCardForBuyer(giftId: string, buyerId: string) {
  if (!mongoose.isValidObjectId(giftId)) return null;
  await connectDB();
  const row = await Gift.findOne({ _id: giftId, buyer: new Types.ObjectId(buyerId) })
    .select("order product shares priceAtPurchase occasion theme message recipientName status redeemedAt createdAt +codeEncrypted")
    .populate({ path: "product", select: "ticker name nameAr image logoBg price" })
    .lean();
  if (!row) return null;
  const product = row.product as unknown as { ticker: string; name: string; nameAr: string; image: string; logoBg: string; price: number } | null;
  if (!product) return null;
  return {
    id: String(row._id),
    company: {
      ticker: product.ticker,
      name: product.name,
      nameAr: product.nameAr,
      image: companyLogoFor(product.ticker, product.image),
      logoBg: companyLogoBgFor(product.ticker, product.logoBg),
    },
    shares: row.shares,
    priceAtPurchase: row.priceAtPurchase,
    currentValue: product.price * row.shares,
    recipientName: row.recipientName,
    message: row.message,
    occasion: row.occasion,
    theme: row.theme,
    status: row.status,
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    code: decryptGiftCode(String(row.codeEncrypted)),
  };
}

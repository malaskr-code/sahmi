import mongoose, { Types } from "mongoose";
import Gift from "@/models/Gift";
import Holding from "@/models/Holding";
import Product from "@/models/Product";
import { decryptGiftCode, hashGiftCode, normalizeGiftCode } from "@/lib/gift-codes";
import { connectDB } from "@/lib/db";
import { refreshPrices } from "@/lib/price-refresh";
import { PaymentError } from "@/lib/payment-errors";
import { companyLogoBgFor, companyLogoFor } from "@/lib/company-logos";

type RawCompany = {
  _id?: Types.ObjectId;
  ticker?: string;
  name?: string;
  nameAr?: string;
  image?: string;
  logoBg?: string;
  price?: number;
} | null;
type RawItem = { product?: RawCompany | Types.ObjectId | null; shares?: number; priceAtPurchase?: number };
type RawGift = {
  items?: RawItem[];
  product?: RawCompany | Types.ObjectId | null;
  shares?: number;
  priceAtPurchase?: number;
};

function safeCode(input: unknown) {
  if (typeof input !== "string" || input.length > 80) throw new PaymentError("giftUnavailable", 404);
  const code = normalizeGiftCode(input);
  if (!/^[A-Z0-9]{5,24}$/.test(code)) throw new PaymentError("giftUnavailable", 404);
  return code;
}

function rawItems(gift: RawGift): RawItem[] {
  if (Array.isArray(gift.items) && gift.items.length) return gift.items;
  return gift.product ? [{ product: gift.product, shares: gift.shares, priceAtPurchase: gift.priceAtPurchase }] : [];
}

function companyFor(input: RawCompany | Types.ObjectId | null | undefined, currentValue = false) {
  if (!input || typeof input !== "object" || !("ticker" in input) || !input.ticker) return null;
  const product = input as Exclude<RawCompany, null>;
  return {
    ticker: String(product.ticker),
    name: String(product.name ?? ""),
    nameAr: String(product.nameAr ?? ""),
    image: companyLogoFor(String(product.ticker), String(product.image ?? "")),
    logoBg: companyLogoBgFor(String(product.ticker), String(product.logoBg ?? "")),
    ...(currentValue ? { price: Number(product.price ?? 0) } : {}),
  };
}

function giftItemsForView(gift: RawGift, includeCurrentValue: boolean) {
  return rawItems(gift).flatMap(item => {
    const company = companyFor(item.product, includeCurrentValue);
    if (!company) return [];
    const shares = Number(item.shares ?? gift.shares ?? 0);
    return [{
      company,
      shares,
      priceAtPurchase: Number(item.priceAtPurchase ?? gift.priceAtPurchase ?? 0),
      currentValue: "price" in company ? Number(company.price) * shares : 0,
    }];
  });
}

export async function readMyGifts(buyerId: string) {
  await connectDB();
  await refreshPrices();
  const rows = await Gift.find({ $or: [{ buyer: new Types.ObjectId(buyerId) }, { redeemedBy: new Types.ObjectId(buyerId) }] })
    .select("order items product buyer redeemedBy shares priceAtPurchase occasion theme message recipientName status redeemedAt createdAt +codeEncrypted")
    .populate({ path: "items.product", select: "ticker name nameAr image logoBg price" })
    .populate({ path: "product", select: "ticker name nameAr image logoBg price" })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return rows.flatMap(row => {
    const items = giftItemsForView(row as unknown as RawGift, true);
    if (!items.length) return [];
    const sentByUser = String(row.buyer) === buyerId;
    const totalAtPurchase = items.reduce((sum, item) => sum + item.priceAtPurchase, 0);
    const currentValue = items.reduce((sum, item) => sum + item.currentValue, 0);
    let code: string | null = null;
    if (sentByUser) {
      try { code = decryptGiftCode(String(row.codeEncrypted)); } catch { code = null; }
    }
    return [{
      id: String(row._id),
      direction: sentByUser ? "sent" as const : "received" as const,
      items,
      company: items[0].company,
      shares: items[0].shares,
      priceAtPurchase: Number(row.priceAtPurchase ?? totalAtPurchase),
      currentValue,
      recipientName: row.recipientName,
      message: row.message,
      occasion: row.occasion,
      theme: row.theme,
      status: row.status,
      redeemedAt: row.redeemedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      code,
    }];
  });
}

export async function readGiftForRedemption(input: unknown) {
  const code = safeCode(input);
  await connectDB();
  const gift = await Gift.findOne({ codeHash: hashGiftCode(code) })
    .select("items product shares recipientName message theme status")
    .populate({ path: "items.product", select: "ticker name nameAr image logoBg" })
    .populate({ path: "product", select: "ticker name nameAr image logoBg" })
    .lean();
  if (!gift) throw new PaymentError("giftUnavailable", 404);
  const items = giftItemsForView(gift as unknown as RawGift, false).map(item => ({
    company: item.company,
    shares: item.shares,
  }));
  if (!items.length) throw new PaymentError("giftUnavailable", 404);
  return {
    items,
    company: items[0].company,
    shares: items[0].shares,
    recipientName: gift.recipientName,
    message: gift.message,
    theme: gift.theme,
    status: gift.status,
  };
}

export async function redeemGift(input: unknown, userId: string) {
  const code = safeCode(input);
  await connectDB();
  const codeHash = hashGiftCode(code);
  const userObjectId = new Types.ObjectId(userId);
  const session = await mongoose.startSession();
  let redeemed = false;
  try {
    await session.withTransaction(async () => {
      const gift = await Gift.findOne({ codeHash, status: "active" })
        .select("items product shares priceAtPurchase")
        .session(session)
        .lean() as unknown as (RawGift & { _id: Types.ObjectId }) | null;
      if (!gift) return;
      const items = rawItems(gift);
      if (!items.length || items.length > 5) throw new PaymentError("giftUnavailable", 404);
      const byProduct = new Map<string, { shares: number; costBasis: number }>();
      for (const item of items) {
        const productId = item.product && typeof item.product === "object" && "_id" in item.product
          ? String(item.product._id)
          : String(item.product ?? "");
        const shares = Number(item.shares ?? gift.shares ?? 0);
        const costBasis = Number(item.priceAtPurchase ?? gift.priceAtPurchase ?? 0);
        if (!Types.ObjectId.isValid(productId) || !Number.isSafeInteger(shares) || shares < 1 || !Number.isFinite(costBasis) || costBasis < 0) {
          throw new PaymentError("giftUnavailable", 404);
        }
        const current = byProduct.get(productId) ?? { shares: 0, costBasis: 0 };
        current.shares += shares;
        current.costBasis += costBasis;
        byProduct.set(productId, current);
      }
      const redeemedAt = new Date();
      const update = await Gift.updateOne(
        { _id: gift._id, status: "active" },
        { $set: { status: "redeemed", redeemedBy: userObjectId, redeemedAt } },
        { session },
      );
      if (update.modifiedCount !== 1) return;
      await Holding.bulkWrite([...byProduct].map(([productId, holding]) => ({
        updateOne: {
          filter: { user: userObjectId, product: new Types.ObjectId(productId) },
          update: {
            $setOnInsert: { user: userObjectId, product: new Types.ObjectId(productId) },
            $inc: { shares: holding.shares, costBasis: holding.costBasis },
            $set: { updatedAt: redeemedAt },
          },
          upsert: true,
        },
      })), { session });
      redeemed = true;
    });
  } finally {
    await session.endSession();
  }
  if (redeemed) return { ok: true };
  if (await Gift.exists({ codeHash, status: "redeemed" })) throw new PaymentError("giftRedeemed", 409);
  throw new PaymentError("giftUnavailable", 404);
}

export async function readGiftCardForBuyer(giftId: string, buyerId: string) {
  if (!mongoose.isValidObjectId(giftId)) return null;
  await connectDB();
  await refreshPrices();
  const row = await Gift.findOne({ _id: giftId, buyer: new Types.ObjectId(buyerId) })
    .select("order items product shares priceAtPurchase occasion theme message recipientName status redeemedAt createdAt +codeEncrypted")
    .populate({ path: "items.product", select: "ticker name nameAr image logoBg price" })
    .populate({ path: "product", select: "ticker name nameAr image logoBg price" })
    .lean();
  if (!row) return null;
  const items = giftItemsForView(row as unknown as RawGift, true);
  if (!items.length) return null;
  const totalAtPurchase = items.reduce((sum, item) => sum + item.priceAtPurchase, 0);
  const currentValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  let code: string;
  try { code = decryptGiftCode(String(row.codeEncrypted)); } catch { return null; }
  return {
    id: String(row._id),
    items,
    company: items[0].company,
    shares: items[0].shares,
    priceAtPurchase: Number(row.priceAtPurchase ?? totalAtPurchase),
    currentValue,
    recipientName: row.recipientName,
    message: row.message,
    occasion: row.occasion,
    theme: row.theme,
    status: row.status,
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    code,
  };
}

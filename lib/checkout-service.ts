import mongoose, { Types, type ClientSession } from "mongoose";
import Gift from "@/models/Gift";
import Notification from "@/models/Notification";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { CARD_THEME_IDS, type CardThemeId } from "@/data/cardThemes";
import { SERVICE_FEE_FILS, filsToKwd, kwdToFils, parseTopupFils } from "@/lib/money";
import { createGiftCode, encryptGiftCode, hashGiftCode } from "@/lib/gift-codes";
import { assertTapConfigured, createTapCharge, retrieveTapCharge, TapConfigurationError, type TapChargeResponse } from "@/lib/tap";
import { readReservedWalletFils, readWalletFils } from "@/lib/wallet";
import { PaymentError } from "@/lib/payment-errors";
import { connectDB } from "@/lib/db";
import { signPriceQuote, verifyPriceQuote } from "@/lib/price-quote";
import { findCheckoutProduct } from "@/lib/checkout-products";

const CHECKOUT_RESERVATION_SECONDS = 31 * 60;
const PRICE_LOCK_MS = 10 * 60 * 1000;
const MAX_PAYMENT_AMOUNT_FILS = 99_999_990;

type PaymentMode = "wallet" | "card" | "demo";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getGiftItems(input: Record<string, unknown>) {
  const rawItems = Array.isArray(input.items)
    ? input.items
    : [{ productId: input.productId, shares: input.shares }];
  if (rawItems.length < 1 || rawItems.length > 5) throw new PaymentError("invalidGift");
  const seen = new Set<string>();
  return rawItems.map(value => {
    if (!isPlainRecord(value)) throw new PaymentError("invalidGift");
    const productId = typeof value.productId === "string" ? value.productId.trim() : "";
    const shares = value.shares;
    if (!productId || productId.length > 100 || typeof shares !== "number" || !Number.isSafeInteger(shares) || shares < 1 || seen.has(productId)) {
      throw new PaymentError("invalidGift");
    }
    seen.add(productId);
    return { productId, shares };
  });
}

function getGiftInput(input: unknown) {
  if (!isPlainRecord(input)) throw new PaymentError("invalidRequest");
  const items = getGiftItems(input);
  const recipientName = typeof input.recipientName === "string" ? input.recipientName.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const theme = input.theme;
  const payment = input.payment;
  if (
    !recipientName || recipientName.length > 120 ||
    message.length > 500 ||
    typeof theme !== "string" || !CARD_THEME_IDS.includes(theme as CardThemeId) ||
    (payment !== "wallet" && payment !== "card" && payment !== "demo")
  ) throw new PaymentError("invalidGift");
  return {
    items, recipientName, message, theme: theme as CardThemeId, payment: payment as PaymentMode,
    quoteToken: typeof input.quoteToken === "string" ? input.quoteToken : "",
  };
}

function sumKwdFils(amount: number) {
  try {
    return kwdToFils(amount);
  } catch {
    throw new PaymentError("invalidAmount", 409);
  }
}

async function lockWallet(userId: string, session: ClientSession) {
  const result = await User.updateOne({ _id: userId }, { $inc: { walletRevision: 1 } }, { session });
  if (result.matchedCount !== 1) throw new PaymentError("sessionInvalid", 404);
}

async function persistWalletTransactions(order: {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  paidFromWallet: number;
  items: Array<{ price: number; shares: number }>;
  fee: number;
}, session: ClientSession) {
  const paidFromWalletFils = sumKwdFils(order.paidFromWallet);
  if (!paidFromWalletFils) return;

  const subtotalFils = order.items.reduce((sum, item) => sum + sumKwdFils(item.price) * item.shares, 0);
  const giftPaymentFils = Math.min(subtotalFils, paidFromWalletFils);
  const feeFils = Math.min(SERVICE_FEE_FILS, Math.max(0, paidFromWalletFils - giftPaymentFils));
  const transactions = [];
  if (giftPaymentFils) transactions.push({
    user: order.user,
    order: order._id,
    type: "gift_payment",
    amount: filsToKwd(-giftPaymentFils),
    reference: `Gift order ${order._id}`,
    idempotencyKey: `gift-payment:${order._id}`,
  });
  if (feeFils) transactions.push({
    user: order.user,
    order: order._id,
    type: "fee",
    amount: filsToKwd(-feeFils),
    reference: `Service fee for order ${order._id}`,
    idempotencyKey: `gift-fee:${order._id}`,
  });
  if (transactions.length) await Transaction.insertMany(transactions, { session });
}

async function createGiftForOrder(order: {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: Array<{ product: Types.ObjectId; shares: number; price: number; occasion?: string; theme?: string }>;
  recipientName?: string;
  message?: string;
}, session: ClientSession) {
  const item = order.items[0];
  if (!item || order.items.length > 5 || !order.recipientName || !item.theme) throw new Error("Gift order is missing required details.");
  const product = await Product.findById(item.product).select("ticker").session(session).lean();
  if (!product) throw new Error("Gift company is no longer available.");
  const code = createGiftCode(String(product.ticker));
  const items = order.items.map(orderItem => ({
    product: orderItem.product,
    shares: orderItem.shares,
    priceAtPurchase: orderItem.price * orderItem.shares,
  }));
  const gift = new Gift({
    order: order._id,
    buyer: order.user,
    items,
    // Retain first-item aliases and a gift-level total for older readers.
    product: item.product,
    shares: item.shares,
    priceAtPurchase: items.reduce((sum, giftItem) => sum + giftItem.priceAtPurchase, 0),
    occasion: item.occasion || item.theme,
    theme: item.theme,
    message: order.message || "",
    recipientName: order.recipientName,
    codeHash: hashGiftCode(code),
    codeEncrypted: encryptGiftCode(code),
    codeLast4: code.slice(-4),
  });
  await gift.save({ session });
  return { giftId: String(gift._id), code };
}

async function finalizeDemoOrder(orderId: Types.ObjectId, session: ClientSession) {
  const order = await Order.findOne({
    _id: orderId,
    type: "gift",
    paymentMethod: "demo",
    status: "pending",
  }).session(session);
  if (!order) throw new PaymentError("checkoutUnavailable", 409);

  const subtotalFils = order.items.reduce(
    (sum: number, item: { price: number; shares: number }) => sum + sumKwdFils(item.price) * item.shares,
    0,
  );
  if (
    subtotalFils + sumKwdFils(order.fee) !== sumKwdFils(order.total) ||
    sumKwdFils(order.paidFromWallet) !== 0 ||
    sumKwdFils(order.paidByCard) !== 0
  ) throw new PaymentError("checkoutUnavailable", 409);

  const gift = await createGiftForOrder(order, session);
  order.status = "paid";
  await order.save({ session });
  return { orderId: String(order._id), giftId: gift.giftId, code: gift.code, kind: "gift" as const };
}

async function finalizePendingOrder(
  orderId: Types.ObjectId,
  session: ClientSession,
  options: { cardChargeFils?: number } = {},
) {
  const order = await Order.findOne({ _id: orderId, status: "pending" }).session(session);
  if (!order) return null;

  await lockWallet(String(order.user), session);

  if (order.type === "topup") {
    const cardChargeFils = options.cardChargeFils;
    const topupFils = sumKwdFils(order.total);
    if (
      sumKwdFils(order.paidByCard) !== topupFils ||
      cardChargeFils !== topupFils
    ) throw new Error("Top-up amount does not match the paid order.");
    await Transaction.create([{
      user: order.user,
      order: order._id,
      type: "topup",
      amount: order.total,
      reference: `Wallet top-up ${order._id}`,
      idempotencyKey: `topup:${order._id}`,
    }], { session });
    await Notification.create([{
      user: order.user,
      text: "wallet_topup_succeeded",
      read: false,
    }], { session });
    order.status = "paid";
    await order.save({ session });
    return { orderId: String(order._id), giftId: null, kind: "topup" as const };
  }

  const subtotalFils = order.items.reduce(
    (sum: number, item: { price: number; shares: number }) => sum + sumKwdFils(item.price) * item.shares,
    0,
  );
  const feeFils = sumKwdFils(order.fee);
  const totalFils = subtotalFils + feeFils;
  const expectedCardFils = sumKwdFils(order.paidByCard);
  const expectedWalletFils = sumKwdFils(order.paidFromWallet);
  const expectedWalletForMethod = order.paymentMethod === "wallet" ? totalFils : 0;
  const expectedCardForMethod = order.paymentMethod === "card" ? totalFils : 0;
  if (
    (order.paymentMethod !== "wallet" && order.paymentMethod !== "card") ||
    expectedWalletFils !== expectedWalletForMethod ||
    expectedCardFils !== expectedCardForMethod ||
    (expectedCardFils === 0 ? options.cardChargeFils !== undefined && options.cardChargeFils !== 0 : options.cardChargeFils !== expectedCardFils) ||
    totalFils !== sumKwdFils(order.total) ||
    expectedWalletFils + expectedCardFils !== totalFils
  ) throw new Error("Gift payment amount does not match the pending order.");

  await persistWalletTransactions(order, session);
  const gift = await createGiftForOrder(order, session);
  order.status = "paid";
  await order.save({ session });
  return { orderId: String(order._id), giftId: gift.giftId, code: gift.code, kind: "gift" as const };
}

async function inMongoTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  let result!: T;
  try {
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function prepareGiftPriceQuote(userId: string, input: unknown) {
  if (!isPlainRecord(input)) throw new PaymentError("invalidRequest");
  const items = getGiftItems(input);
  const payment = input.payment;
  if (
    (payment !== "wallet" && payment !== "card" && payment !== "demo")
  ) throw new PaymentError("invalidGift");

  const products = await Promise.all(items.map(item => findCheckoutProduct(item.productId, { refreshPrice: true })));
  const pricedItems = items.map((item, index) => ({
    productId: item.productId,
    shares: item.shares,
    unitPriceFils: sumKwdFils(Number(products[index].price)),
  }));
  const subtotalFils = pricedItems.reduce((sum, item) => sum + item.unitPriceFils * item.shares, 0);
  const totalFils = subtotalFils + SERVICE_FEE_FILS;
  if (!Number.isSafeInteger(totalFils) || totalFils > MAX_PAYMENT_AMOUNT_FILS) throw new PaymentError("invalidAmount");
  const [balanceFils, reservedFils] = payment === "demo"
    ? [0, 0]
    : await Promise.all([readWalletFils(userId), readReservedWalletFils(userId)]);
  const availableFils = Math.max(0, balanceFils - reservedFils);
  if (payment === "wallet" && availableFils < totalFils) throw new PaymentError("insufficientWallet");
  const walletFils = payment === "wallet" ? totalFils : 0;
  const cardChargeFils = payment === "card" ? totalFils : 0;
  const issuedAt = Date.now();
  const quoteToken = signPriceQuote({ userId, items: pricedItems, payment, walletFils, cardChargeFils, issuedAt });
  return {
    quoteToken,
    quote: {
      items: pricedItems.map(item => ({
        productId: item.productId,
        shares: item.shares,
        unitPrice: filsToKwd(item.unitPriceFils),
        subtotal: filsToKwd(item.unitPriceFils * item.shares),
      })),
      subtotal: filsToKwd(subtotalFils),
      fee: filsToKwd(SERVICE_FEE_FILS),
      wallet: filsToKwd(walletFils),
      card: payment === "demo" ? 0 : filsToKwd(totalFils - walletFils),
      total: filsToKwd(totalFils),
      lockedAt: new Date(issuedAt).toISOString(),
      lockExpiresAt: new Date(issuedAt + PRICE_LOCK_MS).toISOString(),
    },
  };
}

async function saveTapCharge(
  orderId: Types.ObjectId,
  user: { id: string; email: string; name?: string },
  amountFils: number,
  origin: string,
  description: string,
  langCode: "en" | "ar",
) {
  if (!Number.isSafeInteger(amountFils) || amountFils < 100 || amountFils > MAX_PAYMENT_AMOUNT_FILS) {
    throw new PaymentError("invalidAmount");
  }
  assertTapConfigured();
  let checkout: { id: string; url: string };
  try {
    checkout = await createTapCharge({
      orderId: String(orderId),
      amountFils,
      customerName: user.name || user.email.split("@")[0] || "Sahmi customer",
      customerEmail: user.email,
      description,
      returnUrl: `${origin}/checkout/success?order_id=${encodeURIComponent(String(orderId))}`,
      webhookUrl: `${origin}/api/tap/webhook`,
      langCode,
    });
  } catch (error) {
    if (error instanceof TapConfigurationError) throw error;
    console.error("Tap hosted checkout creation failed.", error instanceof Error ? error.name : "unknown");
    throw new PaymentError("tapError", 502);
  }
  const expiresAt = new Date(Date.now() + CHECKOUT_RESERVATION_SECONDS * 1000);
  const saved = await Order.updateOne(
    { _id: orderId, user: new Types.ObjectId(user.id), status: "pending" },
    { $set: { tapChargeId: checkout.id, reservationExpiresAt: expiresAt } },
  );
  if (saved.matchedCount !== 1) throw new PaymentError("checkoutUnavailable", 409);
  return { url: checkout.url, tapId: checkout.id };
}

export async function startTopupCheckout(user: { id: string; email: string; name?: string }, amount: unknown, origin: string, langCode: "en" | "ar") {
  const amountFils = parseTopupFils(amount);
  if (amountFils === null || amountFils > MAX_PAYMENT_AMOUNT_FILS) {
    if (typeof amount === "number" && amount >= 0 && amount < 1) throw new PaymentError("minimumTopup");
    throw new PaymentError("invalidAmount");
  }
  assertTapConfigured();
  await connectDB();
  const order = await Order.create({
    user: new Types.ObjectId(user.id),
    type: "topup",
    items: [],
    fee: 0,
    total: filsToKwd(amountFils),
    paidFromWallet: 0,
    paidByCard: filsToKwd(amountFils),
    paymentMethod: "card",
    status: "pending",
    reservationExpiresAt: new Date(Date.now() + CHECKOUT_RESERVATION_SECONDS * 1000),
  });
  const checkout = await saveTapCharge(
    order._id,
    user,
    amountFils,
    origin,
    `${filsToKwd(amountFils).toFixed(3)} KWD wallet top-up.`,
    langCode,
  );
  return { orderId: String(order._id), ...checkout };
}

export async function startGiftCheckout(user: { id: string; email: string; name?: string }, input: unknown, origin: string, langCode: "en" | "ar") {
  const gift = getGiftInput(input);
  const priceQuote = verifyPriceQuote(gift.quoteToken, {
    userId: user.id, items: gift.items, payment: gift.payment,
  });
  if (!priceQuote) throw new PaymentError("priceQuoteExpired", 409);
  if (!process.env.CODE_SECRET) throw new PaymentError("checkoutUnavailable", 503);
  const products = await Promise.all(gift.items.map(item => findCheckoutProduct(item.productId)));
  const orderItems = gift.items.map((item, index) => ({
    product: products[index],
    shares: item.shares,
    priceFils: priceQuote.items[index].unitPriceFils,
  }));
  const subtotalFils = orderItems.reduce((sum, item) => sum + item.priceFils * item.shares, 0);
  const totalFils = subtotalFils + SERVICE_FEE_FILS;
  const cardFilsFromQuote = totalFils - priceQuote.walletFils;
  const expectedWalletFils = gift.payment === "wallet" ? totalFils : 0;
  const expectedCardFils = gift.payment === "card" ? totalFils : 0;
  if (
    priceQuote.walletFils !== expectedWalletFils ||
    priceQuote.cardChargeFils !== expectedCardFils ||
    cardFilsFromQuote !== priceQuote.cardChargeFils
  ) throw new PaymentError("priceQuoteExpired", 409);
  if (!Number.isSafeInteger(totalFils) || totalFils > MAX_PAYMENT_AMOUNT_FILS) throw new PaymentError("invalidAmount");
  if (priceQuote.cardChargeFils > 0) assertTapConfigured();

  const orderId = new Types.ObjectId();
  const startedAt = new Date(priceQuote.issuedAt);
  const reservationExpiresAt = new Date(Date.now() + CHECKOUT_RESERVATION_SECONDS * 1000);
  const priceLockExpiresAt = new Date(priceQuote.expiresAt);
  const computed = await inMongoTransaction(async session => {
    let walletFils = 0;
    if (gift.payment === "wallet") {
      await lockWallet(user.id, session);
      const balanceFils = await readWalletFils(user.id, session);
      const reservedFils = await readReservedWalletFils(user.id, session, startedAt);
      const availableFils = Math.max(0, balanceFils - reservedFils);
      if (gift.payment === "wallet" && availableFils < totalFils) throw new PaymentError("insufficientWallet");
      walletFils = totalFils;
      if (walletFils !== priceQuote.walletFils) throw new PaymentError("walletBalanceChanged", 409);
    }
    const cardFils = gift.payment === "card" ? totalFils : 0;

    const order = new Order({
      _id: orderId,
      user: new Types.ObjectId(user.id),
      type: "gift",
      items: orderItems.map(item => ({
        product: item.product._id,
        shares: item.shares,
        price: filsToKwd(item.priceFils),
        occasion: gift.theme,
        theme: gift.theme,
      })),
      recipientName: gift.recipientName,
      message: gift.message,
      fee: filsToKwd(SERVICE_FEE_FILS),
      total: filsToKwd(totalFils),
      paidFromWallet: filsToKwd(walletFils),
      paidByCard: filsToKwd(cardFils),
      paymentMethod: gift.payment,
      priceLockedAt: startedAt,
      priceLockExpiresAt,
      reservationExpiresAt,
      status: "pending",
    });
    await order.save({ session });
    if (gift.payment === "demo") {
      const result = await finalizeDemoOrder(orderId, session);
      return { instant: true as const, orderId: String(orderId), result };
    }
    if (cardFils === 0) {
      const result = await finalizePendingOrder(orderId, session);
      if (!result) throw new PaymentError("checkoutUnavailable", 500);
      return { instant: true as const, orderId: String(orderId), result };
    }
    return { instant: false as const, orderId, cardFils };
  });

  if (computed.instant) return { orderId: computed.orderId, result: computed.result, url: null };
  const checkout = await saveTapCharge(
    computed.orderId,
    user,
    computed.cardFils,
    origin,
    `Share gift from ${orderItems.map(item => String(item.product.name)).join(", ")}; the service fee is included.`,
    langCode,
  );
  return {
    orderId: String(computed.orderId),
    url: checkout.url,
    tapId: checkout.tapId,
    quote: {
      items: orderItems.map((item, index) => ({
        productId: gift.items[index].productId,
        shares: item.shares,
        unitPrice: filsToKwd(item.priceFils),
        subtotal: filsToKwd(item.priceFils * item.shares),
      })),
      subtotal: filsToKwd(subtotalFils),
      fee: filsToKwd(SERVICE_FEE_FILS),
      wallet: filsToKwd(totalFils - computed.cardFils),
      card: filsToKwd(computed.cardFils),
      total: filsToKwd(totalFils),
      lockedAt: startedAt.toISOString(),
      lockExpiresAt: priceLockExpiresAt.toISOString(),
    },
  };
}

const failedTapStatuses = new Set(["FAILED", "DECLINED", "ABANDONED", "CANCELLED", "VOIDED", "EXPIRED", "TIMEDOUT"]);

async function finalizeTapCharge(order: {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: "gift" | "topup";
  status: string;
  total: number;
  paidByCard: number;
  tapChargeId?: string;
}, charge: TapChargeResponse) {
  const orderId = String(order._id);
  if (
    charge.id !== order.tapChargeId ||
    charge.reference?.order !== orderId ||
    charge.currency !== "KWD"
  ) throw new PaymentError("sessionInvalid", 409);

  const chargeAmount = typeof charge.amount === "number" ? charge.amount : Number(charge.amount);
  let chargeFils: number;
  try {
    chargeFils = kwdToFils(chargeAmount);
  } catch {
    throw new PaymentError("sessionInvalid", 409);
  }
  const expectedFils = sumKwdFils(order.type === "topup" ? order.total : order.paidByCard);
  if (chargeFils !== expectedFils || expectedFils < 100) throw new PaymentError("sessionInvalid", 409);

  if (order.status === "paid") return getPaidOrderResult(orderId, String(order.user));
  if (order.status !== "pending") throw new PaymentError("sessionInvalid", 409);
  if (charge.status !== "CAPTURED") {
    if (typeof charge.status === "string" && failedTapStatuses.has(charge.status)) {
      await Order.updateOne({ _id: order._id, status: "pending" }, { $set: { status: "cancelled" } });
      throw new PaymentError("paymentNotCompleted", 409);
    }
    throw new PaymentError("sessionPending", 409);
  }

  const session = await mongoose.startSession();
  try {
    let result: Awaited<ReturnType<typeof finalizePendingOrder>> = null;
    await session.withTransaction(async () => {
      result = await finalizePendingOrder(order._id, session, { cardChargeFils: chargeFils });
    });
    if (result) return result;
  } finally {
    await session.endSession();
  }
  return getPaidOrderResult(orderId, String(order.user));
}

export async function completePaidTapOrder(tapId: string, userId: string, expectedOrderId?: string) {
  if (!tapId || tapId.length > 120) throw new PaymentError("sessionInvalid", 400);
  if (expectedOrderId && !mongoose.isValidObjectId(expectedOrderId)) throw new PaymentError("sessionInvalid", 400);
  await connectDB();
  const order = await Order.findOne({
    tapChargeId: tapId,
    user: userId,
    ...(expectedOrderId ? { _id: expectedOrderId } : {}),
  })
    .select("_id user type status total paidByCard tapChargeId").lean();
  if (!order) throw new PaymentError("sessionInvalid", 404);
  if (order.status === "paid") return getPaidOrderResult(String(order._id), userId);
  const charge = await retrieveTapCharge(tapId);
  return finalizeTapCharge(order, charge);
}

export async function processTapWebhookCharge(tapId: string) {
  if (!tapId || tapId.length > 120) throw new PaymentError("sessionInvalid", 400);
  await connectDB();
  const charge = await retrieveTapCharge(tapId);
  const referencedOrderId = typeof charge.reference?.order === "string" ? charge.reference.order : "";
  if (!mongoose.isValidObjectId(referencedOrderId)) throw new PaymentError("sessionInvalid", 400);
  const order = await Order.findOne({ _id: referencedOrderId, tapChargeId: tapId })
    .select("_id user type status total paidByCard tapChargeId").lean();
  if (!order) throw new PaymentError("sessionInvalid", 404);
  try {
    await finalizeTapCharge(order, charge);
  } catch (error) {
    if (error instanceof PaymentError && (error.code === "sessionPending" || error.code === "paymentNotCompleted")) return;
    throw error;
  }
}

async function getPaidOrderResult(orderId: string, userId: string) {
  const order = await Order.findOne({ _id: orderId, user: userId, status: "paid" }).select("_id type").lean();
  if (!order) throw new PaymentError("sessionInvalid", 404);
  if (order.type === "topup") return { orderId, giftId: null, kind: "topup" as const };
  const gift = await Gift.findOne({ order: order._id, buyer: userId }).select("_id").lean();
  if (!gift) throw new PaymentError("sessionInvalid", 404);
  return { orderId, giftId: String(gift._id), kind: "gift" as const };
}

export async function completeWalletOnlyOrder(orderId: string, userId: string) {
  if (!mongoose.isValidObjectId(orderId)) throw new PaymentError("sessionInvalid", 404);
  await connectDB();
  const result = await getPaidOrderResult(orderId, userId);
  return result;
}

export async function completeCheckoutOrder(orderId: string, userId: string) {
  if (!mongoose.isValidObjectId(orderId)) throw new PaymentError("sessionInvalid", 404);
  await connectDB();
  const order = await Order.findOne({ _id: orderId, user: userId }).select("tapChargeId status").lean();
  if (!order) throw new PaymentError("sessionInvalid", 404);
  if (order.tapChargeId) return completePaidTapOrder(order.tapChargeId, userId, orderId);
  return completeWalletOnlyOrder(orderId, userId);
}

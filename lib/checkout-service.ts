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
import { getStripeClient } from "@/lib/stripe";
import { readReservedWalletFils, readWalletFils } from "@/lib/wallet";
import { PaymentError } from "@/lib/payment-errors";
import { refreshPrices } from "@/lib/price-refresh";
import { connectDB } from "@/lib/db";

const CHECKOUT_RESERVATION_SECONDS = 31 * 60;
const PRICE_LOCK_MS = 10 * 60 * 1000;
const MAX_STRIPE_AMOUNT_FILS = 99_999_990;

type PaymentMode = "wallet" | "card" | "both";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getGiftInput(input: unknown) {
  if (!isPlainRecord(input)) throw new PaymentError("invalidRequest");
  const productId = typeof input.productId === "string" ? input.productId.trim() : "";
  const recipientName = typeof input.recipientName === "string" ? input.recipientName.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const shares = input.shares;
  const theme = input.theme;
  const payment = input.payment;
  if (
    !productId || productId.length > 100 ||
    !recipientName || recipientName.length > 120 ||
    message.length > 500 ||
    typeof shares !== "number" || !Number.isSafeInteger(shares) || shares < 1 ||
    typeof theme !== "string" || !CARD_THEME_IDS.includes(theme as CardThemeId) ||
    (payment !== "wallet" && payment !== "card" && payment !== "both")
  ) throw new PaymentError("invalidGift");
  return { productId, recipientName, message, shares, theme: theme as CardThemeId, payment: payment as PaymentMode };
}

function sumKwdFils(amount: number) {
  try {
    return kwdToFils(amount);
  } catch {
    throw new PaymentError("productUnavailable", 409);
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
  if (!item || !order.recipientName || !item.theme) throw new Error("Gift order is missing required details.");
  const product = await Product.findById(item.product).select("ticker").session(session).lean();
  if (!product) throw new Error("Gift company is no longer available.");
  const code = createGiftCode(String(product.ticker));
  const gift = new Gift({
    order: order._id,
    buyer: order.user,
    product: item.product,
    shares: item.shares,
    priceAtPurchase: item.price * item.shares,
    occasion: item.occasion || item.theme,
    theme: item.theme,
    message: order.message || "",
    recipientName: order.recipientName,
    codeHash: hashGiftCode(code),
    codeEncrypted: encryptGiftCode(code),
  });
  await gift.save({ session });
  return { giftId: String(gift._id), code };
}

async function finalizePendingOrder(
  orderId: Types.ObjectId,
  session: ClientSession,
  options: { cardPaymentAmountFils?: number } = {},
) {
  const order = await Order.findOne({ _id: orderId, status: "pending" }).session(session);
  if (!order) return null;

  await lockWallet(String(order.user), session);

  if (order.type === "topup") {
    const cardFils = options.cardPaymentAmountFils;
    const topupFils = sumKwdFils(order.total);
    if (cardFils !== topupFils) throw new Error("Top-up amount does not match the paid order.");
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
  if (
    expectedCardFils !== (options.cardPaymentAmountFils ?? 0) ||
    totalFils !== sumKwdFils(order.total) ||
    sumKwdFils(order.paidFromWallet) + expectedCardFils !== totalFils
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

async function getActiveProduct(productId: string) {
  await connectDB();
  await refreshPrices();
  const filter = {
    active: true,
    $or: [
      { slug: productId },
      ...(mongoose.isValidObjectId(productId) ? [{ _id: new Types.ObjectId(productId) }] : []),
    ],
  };
  const product = await Product.findOne(filter).lean();
  if (!product) throw new PaymentError("productUnavailable", 404);
  const unitPriceFils = sumKwdFils(Number(product.price));
  if (!unitPriceFils) throw new PaymentError("productUnavailable", 409);
  return { product, unitPriceFils };
}

async function saveStripeSession(
  orderId: Types.ObjectId,
  user: { id: string; email: string },
  amountFils: number,
  origin: string,
  description: string,
) {
  if (!Number.isSafeInteger(amountFils) || amountFils <= 0 || amountFils > MAX_STRIPE_AMOUNT_FILS || amountFils % 10 !== 0) {
    throw new PaymentError("invalidAmount");
  }
  const stripe = getStripeClient();
  const expiresAt = Math.floor(Date.now() / 1000) + CHECKOUT_RESERVATION_SECONDS;
  const order = await Order.findById(orderId).select("type").lean();
  if (!order) throw new PaymentError("checkoutUnavailable", 500);
  const kind = order.type === "topup" ? "Wallet top-up" : "Gift purchase";
  let checkoutSession: Awaited<ReturnType<typeof stripe.checkout.sessions.create>> | null = null;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "kwd",
          unit_amount: amountFils,
          product_data: { name: kind, description },
        },
      }],
      customer_email: user.email,
      client_reference_id: String(orderId),
      metadata: { orderId: String(orderId), userId: user.id },
      payment_intent_data: { metadata: { orderId: String(orderId), userId: user.id } },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
      expires_at: expiresAt,
      locale: "auto",
    }, { idempotencyKey: `sahmi-checkout-${orderId}` });

    if (!checkoutSession.url) throw new PaymentError("checkoutUnavailable", 502);
    const saved = await Order.updateOne(
      { _id: orderId, user: new Types.ObjectId(user.id), status: "pending" },
      {
        $set: {
          stripeSessionId: checkoutSession.id,
          reservationExpiresAt: new Date(expiresAt * 1000),
        },
      },
    );
    if (saved.matchedCount !== 1) throw new PaymentError("checkoutUnavailable", 409);
    return { url: checkoutSession.url, sessionId: checkoutSession.id };
  } catch (error) {
    if (checkoutSession?.id) {
      try { await stripe.checkout.sessions.expire(checkoutSession.id); } catch { /* best-effort cleanup; no payment URL is returned */ }
    }
    await Order.updateOne({ _id: orderId, status: "pending" }, { $set: { status: "cancelled" } }).catch(() => undefined);
    throw error;
  }
}

export async function startTopupCheckout(user: { id: string; email: string }, amount: unknown, origin: string) {
  const amountFils = parseTopupFils(amount);
  if (amountFils === null || amountFils > MAX_STRIPE_AMOUNT_FILS) {
    if (typeof amount === "number" && amount >= 0 && amount < 1) throw new PaymentError("minimumTopup");
    throw new PaymentError("invalidAmount");
  }
  getStripeClient();
  await connectDB();
  const order = await Order.create({
    user: new Types.ObjectId(user.id),
    type: "topup",
    items: [],
    fee: 0,
    total: filsToKwd(amountFils),
    paidFromWallet: 0,
    paidByCard: filsToKwd(amountFils),
    status: "pending",
    reservationExpiresAt: new Date(Date.now() + CHECKOUT_RESERVATION_SECONDS * 1000),
  });
  const checkout = await saveStripeSession(
    order._id,
    user,
    amountFils,
    origin,
    `${filsToKwd(amountFils).toFixed(3)} KWD added to the Sahmi wallet after payment.`,
  );
  return { orderId: String(order._id), ...checkout };
}

export async function startGiftCheckout(user: { id: string; email: string }, input: unknown, origin: string) {
  const gift = getGiftInput(input);
  getStripeClient();
  if (!process.env.CODE_SECRET) throw new PaymentError("checkoutUnavailable", 503);
  const { product, unitPriceFils } = await getActiveProduct(gift.productId);
  const subtotalFils = unitPriceFils * gift.shares;
  const totalFils = subtotalFils + SERVICE_FEE_FILS;
  if (!Number.isSafeInteger(totalFils) || totalFils > MAX_STRIPE_AMOUNT_FILS) throw new PaymentError("invalidAmount");

  const orderId = new Types.ObjectId();
  const startedAt = new Date();
  const reservationExpiresAt = new Date(startedAt.getTime() + CHECKOUT_RESERVATION_SECONDS * 1000);
  const priceLockExpiresAt = new Date(startedAt.getTime() + PRICE_LOCK_MS);
  const computed = await inMongoTransaction(async session => {
    await lockWallet(user.id, session);
    const balanceFils = await readWalletFils(user.id, session);
    const reservedFils = await readReservedWalletFils(user.id, session, startedAt);
    const availableFils = Math.max(0, balanceFils - reservedFils);
    if (gift.payment === "wallet" && availableFils < totalFils) throw new PaymentError("insufficientWallet");
    const walletFils = gift.payment === "wallet"
      ? totalFils
      : gift.payment === "both"
        ? Math.min(availableFils, totalFils)
        : 0;
    const cardFils = totalFils - walletFils;
    if (cardFils && cardFils % 10 !== 0) throw new PaymentError("invalidAmount");

    const order = new Order({
      _id: orderId,
      user: new Types.ObjectId(user.id),
      type: "gift",
      items: [{
        product: product._id,
        shares: gift.shares,
        price: filsToKwd(unitPriceFils),
        occasion: gift.theme,
        theme: gift.theme,
      }],
      recipientName: gift.recipientName,
      message: gift.message,
      fee: filsToKwd(SERVICE_FEE_FILS),
      total: filsToKwd(totalFils),
      paidFromWallet: filsToKwd(walletFils),
      paidByCard: filsToKwd(cardFils),
      priceLockedAt: startedAt,
      priceLockExpiresAt,
      reservationExpiresAt,
      status: "pending",
    });
    await order.save({ session });
    if (cardFils === 0) {
      const result = await finalizePendingOrder(orderId, session);
      if (!result) throw new PaymentError("checkoutUnavailable", 500);
      return { walletOnly: true as const, orderId: String(orderId), result };
    }
    return { walletOnly: false as const, orderId, cardFils };
  });

  if (computed.walletOnly) return { orderId: computed.orderId, result: computed.result, url: null };
  const checkout = await saveStripeSession(
    computed.orderId,
    user,
    computed.cardFils,
    origin,
    `Gift shares from ${String(product.name)} for ${gift.recipientName}. The service fee is included.`,
  );
  return {
    orderId: String(computed.orderId),
    url: checkout.url,
    quote: {
      shares: gift.shares,
      unitPrice: Number(product.price),
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

export async function completePaidStripeOrder(sessionId: string, userId: string) {
  if (!sessionId || sessionId.length > 255) throw new PaymentError("sessionInvalid", 400);
  await connectDB();
  const existing = await Order.findOne({ stripeSessionId: sessionId, user: userId }).select("_id type status").lean();
  if (!existing) throw new PaymentError("sessionInvalid", 404);
  if (existing.status === "paid") return getPaidOrderResult(String(existing._id), userId);

  const stripe = getStripeClient();
  const paidSession = await stripe.checkout.sessions.retrieve(sessionId);
  if (
    paidSession.mode !== "payment" ||
    paidSession.status !== "complete" ||
    paidSession.payment_status !== "paid" ||
    paidSession.currency?.toLowerCase() !== "kwd" ||
    paidSession.client_reference_id !== String(existing._id) ||
    paidSession.metadata?.orderId !== String(existing._id) ||
    paidSession.metadata?.userId !== userId
  ) throw new PaymentError("sessionPending", 409);

  const order = await Order.findById(existing._id).select("paidByCard total type").lean();
  if (!order || paidSession.amount_total !== sumKwdFils(order.type === "topup" ? order.total : order.paidByCard)) {
    throw new PaymentError("sessionInvalid", 409);
  }

  const session = await mongoose.startSession();
  try {
    let result: Awaited<ReturnType<typeof finalizePendingOrder>> = null;
    await session.withTransaction(async () => {
      result = await finalizePendingOrder(existing._id, session, { cardPaymentAmountFils: paidSession.amount_total ?? 0 });
    });
    if (result) return result;
  } finally {
    await session.endSession();
  }

  return getPaidOrderResult(String(existing._id), userId);
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

export async function cancelStripeOrder(sessionId: string, userId: string) {
  if (!sessionId || sessionId.length > 255) return "not-found" as const;
  await connectDB();
  const order = await Order.findOne({ stripeSessionId: sessionId, user: userId }).select("_id status").lean();
  if (!order) return "not-found" as const;
  if (order.status === "paid") return "paid" as const;
  if (order.status === "cancelled") return "cancelled" as const;

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "paid" || session.status === "complete") return "paid" as const;
  if (session.status === "open") await stripe.checkout.sessions.expire(sessionId);
  await Order.updateOne({ _id: order._id, user: userId, status: "pending" }, { $set: { status: "cancelled" } });
  return "cancelled" as const;
}

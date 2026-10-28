import mongoose, { Types } from "mongoose";
import ApiCallLog from "@/models/ApiCallLog";
import Gift from "@/models/Gift";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { companyLogoBgFor, companyLogoFor } from "@/lib/company-logos";
import { inferSectorKey, sectorDefinition } from "@/data/sectors";
import { isMarketOpen } from "@/lib/market-hours";
import { decryptGiftCode, hashGiftCode, normalizeGiftCode } from "@/lib/gift-codes";
import type {
  AdminCompany,
  AdminOrderDetail,
  AdminOrderRow,
  AdminPaymentMethod,
  AdminPricesData,
  AdminUserRow,
} from "@/lib/admin-types";

const PAGE_SIZE = 20;
const THEMES = ["eid", "graduation", "birthday", "newborn", "wedding", "general"] as const;

function kuwaitDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuwait",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: value.year, month: value.month, day: value.day };
}

function kuwaitDateKey(date: Date) {
  const { year, month, day } = kuwaitDateParts(date);
  return `${year}-${month}-${day}`;
}

function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function kuwaitDayStart(key: string) {
  return new Date(`${key}T00:00:00+03:00`);
}

function paymentMethodFor(order: { paymentMethod?: string; paidFromWallet?: number; paidByCard?: number }): AdminPaymentMethod {
  if (order.paymentMethod === "demo" || order.paymentMethod === "wallet" || order.paymentMethod === "card" || order.paymentMethod === "both") {
    return order.paymentMethod;
  }
  if (Number(order.paidFromWallet) > 0 && Number(order.paidByCard) > 0) return "both";
  if (Number(order.paidFromWallet) > 0) return "wallet";
  return "card";
}

function companyFor(product: {
  ticker?: string;
  name?: string;
  nameAr?: string;
  image?: string;
  logoBg?: string;
} | null | undefined) {
  if (!product?.ticker) return null;
  return {
    ticker: String(product.ticker),
    name: String(product.name ?? ""),
    nameAr: String(product.nameAr ?? ""),
    image: companyLogoFor(String(product.ticker), String(product.image ?? "")),
    logoBg: companyLogoBgFor(String(product.ticker), String(product.logoBg ?? "")),
  };
}

export async function getAdminOverview() {
  const now = new Date();
  const today = kuwaitDateKey(now);
  const firstDay = shiftDateKey(today, -29);
  const [totalUsers, giftsSent, giftsRedeemed, giftsWaiting, shareTotals, finances, demoOrders, dailyRows, companyRows, themeRows] =
    await Promise.all([
      User.countDocuments({}),
      Gift.countDocuments({}),
      Gift.countDocuments({ status: "redeemed" }),
      Gift.countDocuments({ status: "active" }),
      Gift.aggregate([{ $group: { _id: null, shares: { $sum: "$shares" } } }]),
      Order.aggregate([
        { $match: { status: "paid", paymentMethod: { $ne: "demo" } } },
        {
          $group: {
            _id: null,
            fees: { $sum: { $cond: [{ $eq: ["$type", "gift"] }, { $ifNull: ["$fee", 0] }, 0] } },
            topups: { $sum: { $cond: [{ $eq: ["$type", "topup"] }, { $ifNull: ["$total", 0] }, 0] } },
          },
        },
      ]),
      Order.countDocuments({ paymentMethod: "demo" }),
      Gift.aggregate([
        { $match: { createdAt: { $gte: kuwaitDayStart(firstDay) } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kuwait" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Gift.aggregate([
        { $group: { _id: "$product", gifts: { $sum: 1 } } },
        { $sort: { gifts: -1, _id: 1 } },
        { $limit: 5 },
        { $lookup: { from: Product.collection.name, localField: "_id", foreignField: "_id", as: "company" } },
        { $unwind: "$company" },
        { $project: { _id: 0, ticker: "$company.ticker", name: "$company.name", nameAr: "$company.nameAr", gifts: 1 } },
      ]),
      Gift.aggregate([{ $group: { _id: "$theme", count: { $sum: 1 } } }]),
    ]);

  const countsByDay = new Map<string, number>(
    (dailyRows as Array<{ _id: string; count: number }>).map(row => [row._id, Number(row.count)]),
  );
  const giftsPerDay = Array.from({ length: 30 }, (_, index) => {
    const date = shiftDateKey(firstDay, index);
    return { date, count: countsByDay.get(date) ?? 0 };
  });
  const countsByTheme = new Map<string, number>(
    (themeRows as Array<{ _id: string; count: number }>).map(row => [String(row._id), Number(row.count)]),
  );
  const financialTotals = (finances as Array<{ fees?: number; topups?: number }>)[0] ?? {};

  return {
    totalUsers,
    giftsSent,
    giftsRedeemed,
    giftsWaiting,
    sharesGifted: Number((shareTotals as Array<{ shares?: number }>)[0]?.shares ?? 0),
    feesEarnedKwd: Number(financialTotals.fees ?? 0),
    walletTopupsKwd: Number(financialTotals.topups ?? 0),
    demoOrders,
    giftsPerDay,
    topCompanies: (companyRows as Array<{ ticker: string; name: string; nameAr: string; gifts: number }>).map(row => ({
      ticker: String(row.ticker),
      name: String(row.name),
      nameAr: String(row.nameAr),
      gifts: Number(row.gifts),
    })),
    occasions: THEMES.map(theme => ({ theme, count: countsByTheme.get(theme) ?? 0 })),
  };
}

export async function getAdminCompanies(): Promise<AdminCompany[]> {
  const products = await Product.find({})
    .select("_id slug ticker name nameAr description descriptionAr category categoryAr sectorKey image logoBg price active priceUpdatedAt")
    .sort({ name: 1, _id: 1 })
    .lean();
  return products.map(product => {
    const sectorKey = inferSectorKey(product.sectorKey, product.category, product.categoryAr) ?? "technology-services";
    const definition = sectorDefinition(sectorKey)!;
    return {
    id: String(product._id),
    slug: String(product.slug ?? ""),
    ticker: String(product.ticker),
    name: String(product.name ?? ""),
    nameAr: String(product.nameAr ?? ""),
    description: String(product.description ?? ""),
    descriptionAr: String(product.descriptionAr ?? ""),
    sectorKey,
    sector: definition.labelEn,
    sectorAr: definition.labelAr,
    image: companyLogoFor(String(product.ticker), String(product.image ?? "")),
    logoBg: companyLogoBgFor(String(product.ticker), String(product.logoBg ?? "")),
    price: Number(product.price ?? 0),
    active: product.active !== false,
    priceUpdatedAt: product.priceUpdatedAt ? new Date(product.priceUpdatedAt).toISOString() : null,
  };
  });
}

function currentMarketStatus(now: Date): "open" | "closed" {
  return isMarketOpen(now) ? "open" : "closed";
}

function monthlyLimit() {
  const configured = Number(process.env.STOCK_API_MONTHLY_LIMIT);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 1650;
}

export async function getAdminPrices(): Promise<AdminPricesData> {
  const now = new Date();
  const monthKey = `${kuwaitDateKey(now).slice(0, 7)}-01T00:00:00+03:00`;
  const monthStart = new Date(monthKey);
  const [products, callsThisMonth] = await Promise.all([
    Product.find({}).select("priceUpdatedAt active").lean(),
    ApiCallLog.countDocuments({ provider: "oanor", calledAt: { $gte: monthStart } }),
  ]);
  const latest = products.reduce<number | null>((latestTime, product) => {
    if (!product.priceUpdatedAt) return latestTime;
    const time = new Date(product.priceUpdatedAt).getTime();
    return latestTime === null || time > latestTime ? time : latestTime;
  }, null);
  return {
    lastUpdatedAt: latest === null ? null : new Date(latest).toISOString(),
    marketStatus: currentMarketStatus(now),
    callsThisMonth,
    monthlyLimit: monthlyLimit(),
    activeCompanies: products.filter(product => product.active !== false).length,
  };
}

type RawProduct = {
  ticker?: string;
  name?: string;
  nameAr?: string;
  image?: string;
  logoBg?: string;
} | null;

type RawGift = {
  order: Types.ObjectId;
  shares: number;
  theme: string;
  recipientName: string;
  status: "active" | "redeemed";
  redeemedAt?: Date | null;
  codeLast4?: string;
  codeEncrypted?: string;
};

type RawOrder = {
  _id: Types.ObjectId;
  user?: { name?: string; email?: string } | null;
  type: "gift" | "topup";
  items?: Array<{ product?: RawProduct; shares?: number; theme?: string; price?: number }>;
  recipientName?: string;
  message?: string;
  fee?: number;
  total: number;
  paidFromWallet?: number;
  paidByCard?: number;
  paymentMethod?: string;
  status: "pending" | "paid" | "cancelled";
  createdAt: Date;
};

function lastFour(gift: RawGift | undefined) {
  if (!gift) return null;
  if (gift.codeLast4) return String(gift.codeLast4).slice(-4);
  if (!gift.codeEncrypted) return null;
  try {
    return decryptGiftCode(gift.codeEncrypted).slice(-4);
  } catch {
    return null;
  }
}

export async function getAdminOrders(search: URLSearchParams) {
  const requestedPage = Math.max(1, Math.floor(Number(search.get("page")) || 1));
  const query: Record<string, any> = {};
  const status = search.get("status") ?? "";
  if (["pending", "paid", "cancelled"].includes(status)) query.status = status;
  const payment = search.get("payment") ?? "";
  if (["card", "wallet", "both", "demo"].includes(payment)) query.paymentMethod = payment;
  const companyTicker = search.get("company")?.trim().toUpperCase();
  if (companyTicker) {
    const company = await Product.findOne({ ticker: companyTicker }).select("_id").lean();
    query["items.product"] = company?._id ?? new Types.ObjectId("000000000000000000000000");
  }
  const from = search.get("from");
  const to = search.get("to");
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) createdAt.$gte = new Date(`${from}T00:00:00+03:00`);
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) createdAt.$lte = new Date(`${to}T23:59:59.999+03:00`);
    if (Object.keys(createdAt).length) query.createdAt = createdAt;
  }

  const text = (search.get("q") ?? "").trim().slice(0, 120);
  if (text) {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const [buyers, codeMatches] = await Promise.all([
      User.find({ $or: [{ name: { $regex: escaped, $options: "i" } }, { email: { $regex: escaped, $options: "i" } }] })
        .select("_id")
        .limit(250)
        .lean(),
      (async () => {
        const normalized = normalizeGiftCode(text);
        const exact = await Gift.find({ codeHash: hashGiftCode(text) }).select("order").lean();
        const matches = [...exact];
        if (normalized.length === 4 && /^[A-Z0-9]{4}$/.test(normalized)) {
          const savedLastFour = await Gift.find({ codeLast4: normalized }).select("order").lean();
          matches.push(...savedLastFour);
          const legacy = await Gift.find({ codeLast4: { $exists: false } })
            .select("order +codeEncrypted")
            .limit(5000)
            .lean() as unknown as RawGift[];
          for (const gift of legacy) {
            if (gift.codeEncrypted && lastFour(gift) === normalized) matches.push(gift);
          }
        }
        return matches;
      })(),
    ]);
    const orderIds = [...new Set(codeMatches.map(gift => String(gift.order)))].filter(mongoose.isValidObjectId);
    const alternatives: Record<string, unknown>[] = [];
    if (buyers.length) alternatives.push({ user: { $in: buyers.map(buyer => buyer._id) } });
    if (orderIds.length) alternatives.push({ _id: { $in: orderIds.map(id => new Types.ObjectId(id)) } });
    query.$or = alternatives.length ? alternatives : [{ _id: { $exists: false } }];
  }

  const total = await Order.countDocuments(query);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const orders = await Order.find(query)
    .select("_id user type items recipientName message fee total paidFromWallet paidByCard paymentMethod status createdAt")
    .populate({ path: "user", select: "name email" })
    .populate({ path: "items.product", select: "ticker name nameAr image logoBg" })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean() as unknown as RawOrder[];
  const ids = orders.map(order => order._id);
  const gifts = await Gift.find({ order: { $in: ids } })
    .select("order shares theme recipientName status redeemedAt +codeLast4 +codeEncrypted")
    .lean() as unknown as RawGift[];
  const giftsByOrder = new Map(gifts.map(gift => [String(gift.order), gift]));
  const rows: AdminOrderRow[] = orders.map(order => {
    const gift = giftsByOrder.get(String(order._id));
    const item = order.items?.[0];
    const product = item?.product;
    return {
      id: String(order._id),
      type: order.type,
      createdAt: new Date(order.createdAt).toISOString(),
      buyer: { name: String(order.user?.name ?? ""), email: String(order.user?.email ?? "") },
      company: order.type === "gift" ? companyFor(product) : null,
      shares: order.type === "gift" ? Number(gift?.shares ?? item?.shares ?? 0) : null,
      recipientName: String(gift?.recipientName ?? order.recipientName ?? ""),
      theme: gift?.theme ?? item?.theme ?? null,
      total: Number(order.total),
      fee: Number(order.fee ?? 0),
      paidFromWallet: Number(order.paidFromWallet ?? 0),
      paidByCard: Number(order.paidByCard ?? 0),
      paymentMethod: paymentMethodFor(order),
      status: order.status,
      giftStatus: gift?.status ?? null,
      giftCodeLast4: lastFour(gift),
    };
  });
  return { orders: rows, total, page, pageSize: PAGE_SIZE, pageCount };
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  const order = await Order.findById(id)
    .select("_id user type items recipientName message fee total paidFromWallet paidByCard paymentMethod status createdAt")
    .populate({ path: "user", select: "name email" })
    .populate({ path: "items.product", select: "ticker name nameAr image logoBg" })
    .lean() as unknown as RawOrder | null;
  if (!order) return null;
  const gift = await Gift.findOne({ order: order._id })
    .select("order shares theme recipientName message priceAtPurchase status redeemedAt +codeLast4 +codeEncrypted")
    .lean() as unknown as (RawGift & { message?: string; priceAtPurchase?: number }) | null;
  const item = order.items?.[0];
  const code = gift?.codeEncrypted ? (() => {
    try { return decryptGiftCode(gift.codeEncrypted); } catch { return null; }
  })() : null;
  return {
    id: String(order._id),
    type: order.type,
    createdAt: new Date(order.createdAt).toISOString(),
    buyer: { name: String(order.user?.name ?? ""), email: String(order.user?.email ?? "") },
    company: order.type === "gift" ? companyFor(item?.product) : null,
    shares: order.type === "gift" ? Number(gift?.shares ?? item?.shares ?? 0) : null,
    recipientName: String(gift?.recipientName ?? order.recipientName ?? ""),
    theme: gift?.theme ?? item?.theme ?? null,
    total: Number(order.total),
    fee: Number(order.fee ?? 0),
    paidFromWallet: Number(order.paidFromWallet ?? 0),
    paidByCard: Number(order.paidByCard ?? 0),
    paymentMethod: paymentMethodFor(order),
    status: order.status,
    giftStatus: gift?.status ?? null,
    giftCodeLast4: lastFour(gift ?? undefined),
    message: String(gift?.message ?? order.message ?? ""),
    giftCode: code,
    priceAtPurchase: gift ? Number(gift.priceAtPurchase ?? 0) : null,
    redeemedAt: gift?.redeemedAt ? new Date(gift.redeemedAt).toISOString() : null,
  };
}

export async function getAdminUsers(pageValue: number, currentAdminId: string) {
  const requestedPage = Math.max(1, Math.floor(pageValue) || 1);
  const total = await User.countDocuments({});
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const users = await User.find({})
    .select("_id name email role createdAt disabled")
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();
  const ids = users.map(user => user._id);
  const now = new Date();
  const [balances, reservations, giftCounts] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: "$user", balance: { $sum: "$amount" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          user: { $in: ids },
          type: "gift",
          status: "pending",
          reservationExpiresAt: { $gt: now },
          paidFromWallet: { $gt: 0 },
        },
      },
      { $group: { _id: "$user", reserved: { $sum: "$paidFromWallet" } } },
    ]),
    Gift.aggregate([
      { $match: { buyer: { $in: ids } } },
      { $group: { _id: "$buyer", gifts: { $sum: 1 } } },
    ]),
  ]);
  const balanceByUser = new Map<string, number>((balances as Array<{ _id: Types.ObjectId; balance: number }>).map(row => [String(row._id), Number(row.balance)]));
  const reservedByUser = new Map<string, number>((reservations as Array<{ _id: Types.ObjectId; reserved: number }>).map(row => [String(row._id), Number(row.reserved)]));
  const giftsByUser = new Map<string, number>((giftCounts as Array<{ _id: Types.ObjectId; gifts: number }>).map(row => [String(row._id), Number(row.gifts)]));
  const rows: AdminUserRow[] = users.map(user => {
    const id = String(user._id);
    return {
      id,
      name: String(user.name),
      email: String(user.email),
      role: user.role === "admin" ? "admin" : "user",
      createdAt: new Date(user.createdAt).toISOString(),
      giftsSent: giftsByUser.get(id) ?? 0,
      walletBalance: Number((balanceByUser.get(id) ?? 0) - (reservedByUser.get(id) ?? 0)),
      disabled: Boolean(user.disabled),
    };
  });
  return { users: rows, total, page, pageSize: PAGE_SIZE, pageCount, currentAdminId };
}

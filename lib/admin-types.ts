import type { SectorKey } from "@/data/sectors";

export type AdminTab = "overview" | "orders" | "companies" | "prices" | "users";
export type AdminOrderStatus = "pending" | "paid" | "cancelled";
export type AdminPaymentMethod = "wallet" | "card" | "demo";
export type AdminOrderCompany = {
  ticker: string;
  name: string;
  nameAr: string;
  image: string;
  logoBg: string;
  shares: number;
};

export type AdminCompany = {
  id: string;
  type: "share" | "metal";
  slug: string;
  ticker: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  sectorKey: SectorKey;
  sector: string;
  sectorAr: string;
  image: string;
  logoBg: string;
  price: number;
  active: boolean;
  priceUpdatedAt: string | null;
};

export type AdminOrderRow = {
  id: string;
  type: "gift" | "topup";
  createdAt: string;
  buyer: { name: string; email: string };
  companies: AdminOrderCompany[];
  company: { ticker: string; name: string; nameAr: string; image: string; logoBg: string } | null;
  shares: number | null;
  recipientName: string;
  theme: string | null;
  total: number;
  fee: number;
  paidFromWallet: number;
  paidByCard: number;
  paymentMethod: AdminPaymentMethod;
  status: AdminOrderStatus;
  giftStatus: "active" | "redeemed" | null;
  giftCodeLast4: string | null;
};

export type AdminOrderDetail = AdminOrderRow & {
  message: string;
  giftCode: string | null;
  priceAtPurchase: number | null;
  redeemedAt: string | null;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  giftsSent: number;
  walletBalance: number;
  disabled: boolean;
};

export type AdminOverviewData = {
  totalUsers: number;
  giftsSent: number;
  giftsRedeemed: number;
  giftsWaiting: number;
  sharesGifted: number;
  feesEarnedKwd: number;
  walletTopupsKwd: number;
  demoOrders: number;
  giftsPerDay: Array<{ date: string; count: number }>;
  topCompanies: Array<{ ticker: string; name: string; nameAr: string; gifts: number; shares: number }>;
  occasions: Array<{ theme: string; count: number }>;
};

export type AdminPricesData = {
  lastUpdatedAt: string | null;
  metalLastUpdatedAt: string | null;
  marketStatus: "open" | "closed";
  callsThisMonth: number;
  monthlyLimit: number;
  activeCompanies: number;
};

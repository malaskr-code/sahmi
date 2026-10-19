import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { companyLogoBgFor, companyLogoFor } from "@/lib/company-logos";
import Order from "@/models/Order";
import { AdminOrdersClient } from "@/components/AdminOrdersClient";

type OrderRow = {
  _id: { toString(): string };
  type: "gift" | "topup";
  items?: Array<{
    product?: {
      ticker: string;
      name: string;
      nameAr: string;
      image?: string;
      logoBg?: string;
    } | null;
  }>;
  paymentMethod?: "wallet" | "card" | "both" | "demo";
  paidFromWallet?: number;
  paidByCard?: number;
  status: "pending" | "paid" | "cancelled";
  total: number;
  createdAt: Date;
};

function paymentMethodFor(order: OrderRow) {
  if (order.paymentMethod) return order.paymentMethod;
  if (Number(order.paidFromWallet) > 0 && Number(order.paidByCard) > 0) return "both";
  if (Number(order.paidFromWallet) > 0) return "wallet";
  return "card";
}

export default async function AdminPage() {
  await requireAdmin();
  await connectDB();
  const rows = await Order.find()
    .select("_id type items paymentMethod paidFromWallet paidByCard status total createdAt")
    .populate({ path: "items.product", select: "ticker name nameAr image logoBg" })
    .sort({ createdAt: -1, _id: -1 })
    .limit(100)
    .lean() as unknown as OrderRow[];
  const orders = rows.map(order => ({
    id: order._id.toString(),
    type: order.type,
    company: order.type === "gift" && order.items?.[0]?.product ? {
      ticker: order.items[0].product.ticker,
      name: order.items[0].product.name,
      nameAr: order.items[0].product.nameAr,
      image: companyLogoFor(order.items[0].product.ticker, order.items[0].product.image ?? ""),
      logoBg: companyLogoBgFor(order.items[0].product.ticker, order.items[0].product.logoBg ?? "#ffffff"),
    } : null,
    paymentMethod: paymentMethodFor(order),
    status: order.status,
    total: Number(order.total),
    createdAt: new Date(order.createdAt).toISOString(),
  }));
  return <AdminOrdersClient orders={orders} />;
}

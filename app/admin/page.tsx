import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import { AdminOrdersClient } from "@/components/AdminOrdersClient";

type OrderRow = {
  _id: { toString(): string };
  type: "gift" | "topup";
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
    .select("_id type paymentMethod paidFromWallet paidByCard status total createdAt")
    .sort({ createdAt: -1, _id: -1 })
    .limit(100)
    .lean() as unknown as OrderRow[];
  const orders = rows.map(order => ({
    id: order._id.toString(),
    type: order.type,
    paymentMethod: paymentMethodFor(order),
    status: order.status,
    total: Number(order.total),
    createdAt: new Date(order.createdAt).toISOString(),
  }));
  return <AdminOrdersClient orders={orders} />;
}

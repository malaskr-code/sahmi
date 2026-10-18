import mongoose from "mongoose";
import { requestUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import Transaction from "@/models/Transaction";
import { filsToKwd } from "@/lib/money";
import { readReservedWalletFils, readWalletFils } from "@/lib/wallet";
import { paymentJson, paymentServerError } from "@/lib/payment-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const transactionTypes = ["topup", "gift_payment", "sale", "fee"] as const;

export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return paymentJson(request, 401, "invalidRequest");
  const requestedType = new URL(request.url).searchParams.get("type") || "all";
  if (requestedType !== "all" && !transactionTypes.includes(requestedType as typeof transactionTypes[number])) {
    return paymentJson(request, 400, "invalidRequest");
  }

  try {
    await connectDB();
    const [balanceFils, reservedFils] = await Promise.all([
      readWalletFils(user.id),
      readReservedWalletFils(user.id),
    ]);
    const filter = requestedType === "all" ? {} : { type: requestedType };
    const [transactions, notifications] = await Promise.all([
      Transaction.find({ user: new mongoose.Types.ObjectId(user.id), ...filter })
        .select("type amount reference createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .lean(),
      Notification.find({ user: new mongoose.Types.ObjectId(user.id) })
        .select("text read createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .limit(50)
        .lean(),
    ]);
    return Response.json({
      ok: true,
      balance: filsToKwd(balanceFils),
      reserved: filsToKwd(reservedFils),
      available: filsToKwd(Math.max(0, balanceFils - reservedFils)),
      transactions: transactions.map(row => ({
        id: String(row._id),
        type: row.type,
        amount: row.amount,
        reference: row.reference,
        createdAt: row.createdAt.toISOString(),
      })),
      notifications: notifications.map(row => ({
        id: String(row._id),
        text: row.text,
        read: row.read,
        createdAt: row.createdAt.toISOString(),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load the wallet.", error instanceof Error ? error.name : "unknown");
    return paymentServerError(request);
  }
}

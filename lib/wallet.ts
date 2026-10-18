import mongoose, { type ClientSession } from "mongoose";
import Transaction from "@/models/Transaction";
import Order from "@/models/Order";
import { walletBalanceFils, kwdToFils } from "@/lib/money";

export async function readWalletFils(userId: string, session?: ClientSession) {
  const aggregate = Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, balance: { $sum: "$amount" } } },
  ]);
  if (session) aggregate.session(session);
  const [row] = await aggregate;
  return walletBalanceFils(Number(row?.balance ?? 0));
}

export async function readReservedWalletFils(userId: string, session?: ClientSession, now = new Date()) {
  const aggregate = Order.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "gift",
        status: "pending",
        reservationExpiresAt: { $gt: now },
        paidFromWallet: { $gt: 0 },
      },
    },
    { $group: { _id: null, reserved: { $sum: "$paidFromWallet" } } },
  ]);
  if (session) aggregate.session(session);
  const [row] = await aggregate;
  return walletBalanceFils(Number(row?.reserved ?? 0));
}

export function transactionKwdToFils(amount: number) {
  return kwdToFils(Math.abs(amount));
}

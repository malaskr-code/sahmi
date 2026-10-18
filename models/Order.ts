import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["gift", "topup"], required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    shares: { type: Number, required: true, min: 1, validate: Number.isInteger },
    price: { type: Number, required: true, min: 0 },
    occasion: { type: String },
    theme: { type: String },
  }],
  recipientName: { type: String, trim: true, maxlength: 120 },
  message: { type: String, maxlength: 500, default: "" },
  fee: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paidFromWallet: { type: Number, default: 0, min: 0 },
  paidByCard: { type: Number, default: 0, min: 0 },
  priceLockedAt: { type: Date, default: Date.now },
  priceLockExpiresAt: { type: Date },
  reservationExpiresAt: { type: Date },
  stripeSessionId: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);

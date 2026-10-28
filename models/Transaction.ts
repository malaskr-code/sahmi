import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["topup", "gift_payment", "sale", "fee"], required: true },
  amount: { type: Number, required: true, validate: { validator: Number.isFinite, message: "Amount must be finite." } },
  reference: { type: String, required: true, maxlength: 180 },
  order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
  idempotencyKey: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
transactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);

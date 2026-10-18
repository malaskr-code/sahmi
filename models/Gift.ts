import mongoose, { Schema } from "mongoose";
import { CARD_THEME_IDS } from "@/data/cardThemes";

const giftSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  shares: { type: Number, required: true, min: 1, validate: Number.isInteger },
  priceAtPurchase: { type: Number, required: true, min: 0 },
  occasion: { type: String, required: true, maxlength: 32 },
  theme: { type: String, enum: CARD_THEME_IDS, required: true },
  message: { type: String, default: "", maxlength: 500 },
  recipientName: { type: String, required: true, trim: true, maxlength: 120 },
  codeHash: { type: String, required: true, unique: true, select: false },
  codeEncrypted: { type: String, required: true, select: false },
  status: { type: String, enum: ["active", "redeemed"], default: "active" },
  redeemedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  redeemedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});
giftSchema.index({ buyer: 1, createdAt: -1 });

export default mongoose.models.Gift || mongoose.model("Gift", giftSchema);

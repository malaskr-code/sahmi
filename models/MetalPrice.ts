import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  ticker: { type: String, required: true, unique: true },
  usdPerTroyOunce: { type: Number, required: true, min: 0 },
  usdToKwd: { type: Number, required: true, min: 0 },
  priceKwdPerGram: { type: Number, required: true, min: 0 },
  sourceUpdatedAt: { type: Date, default: null },
  fxUpdatedAt: { type: Date, required: true },
  refreshedAt: { type: Date, required: true },
});

export default mongoose.models.MetalPrice || mongoose.model("MetalPrice", schema);

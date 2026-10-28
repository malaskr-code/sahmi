import mongoose, { Schema } from "mongoose";

const holdingSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  // Integer shares and fractional metal grams share this numeric field; product.type
  // determines the unit, while the API validates the precision before writes.
  shares: { type: Number, required: true, min: 0, default: 0 },
  costBasis: { type: Number, required: true, min: 0, default: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

holdingSchema.index({ user: 1, product: 1 }, { unique: true });
holdingSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.models.Holding || mongoose.model("Holding", holdingSchema);

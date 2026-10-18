import mongoose, { Schema } from "mongoose";

// This durable lease also prevents separate Vercel instances from spending quota twice.
const schema = new Schema({
  _id: { type: String },
  lockedUntil: { type: Date, required: true },
  nextAttemptAt: { type: Date, required: true },
});

export default mongoose.models.PriceRefresh || mongoose.model("PriceRefresh", schema);

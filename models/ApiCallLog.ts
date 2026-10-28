import mongoose, { Schema } from "mongoose";

const apiCallLogSchema = new Schema({
  provider: { type: String, required: true, enum: ["oanor", "gold-api", "exchange-rate-api"] },
  endpoint: { type: String, required: true, maxlength: 200 },
  calledAt: { type: Date, required: true, default: Date.now },
  succeeded: { type: Boolean, required: true },
  statusCode: { type: Number, default: null },
});

apiCallLogSchema.index({ provider: 1, calledAt: -1 });

export default mongoose.models.ApiCallLog || mongoose.model("ApiCallLog", apiCallLogSchema);

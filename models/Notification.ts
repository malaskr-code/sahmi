import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, maxlength: 240 },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

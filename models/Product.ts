import mongoose, { Schema } from "mongoose";
import { SECTORS } from "../data/sectors";

const productSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  description: { type: String, required: true },
  descriptionAr: { type: String, required: true },
  ticker: { type: String, required: true, unique: true },
  type: { type: String, enum: ["share", "metal"], default: "share", required: true },
  purity: { type: Number, default: null, min: 1 },
  category: { type: String, required: true },
  categoryAr: { type: String, required: true },
  sectorKey: { type: String, enum: SECTORS.map(sector => sector.id), required: true },
  image: { type: String, default: "" },
  logoBg: { type: String, required: true, default: "#ffffff" },
  price: { type: Number, required: true, min: 0 },
  change: { type: Number, default: 0 },
  priceUpdatedAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Product || mongoose.model("Product", productSchema);

import mongoose from "mongoose";
import { connectDB } from "./db";
import ProductModel from "../models/Product";
import { refreshPrices } from "./price-refresh";
import type { Product } from "./product-types";
import { companyLogoFor, companyLogoBgFor } from "./company-logos";

// Map database categories to the existing view contract to preserve the UI.
function serialize(row: Record<string, unknown>): Product {
  return {
    id: String(row.slug), ticker: String(row.ticker), image: companyLogoFor(String(row.ticker), String(row.image ?? "")),
    logoBg: String(row.logoBg ?? companyLogoBgFor(String(row.ticker))),
    name: String(row.name), nameAr: String(row.nameAr),
    sector: String(row.category), sectorAr: String(row.categoryAr),
    description: String(row.description), descriptionAr: String(row.descriptionAr),
    price: Number(row.price), change: Number(row.change),
    priceUpdatedAt: row.priceUpdatedAt ? new Date(row.priceUpdatedAt as Date).toISOString() : null,
  };
}

export async function readProducts(category?: string) {
  await connectDB();
  await refreshPrices();
  const rows = await ProductModel.find({ active: true, ...(category ? { category } : {}) }).sort({ createdAt: 1, _id: 1 }).lean();
  return rows.map(row => serialize(row));
}

export async function readProduct(id: string) {
  await connectDB();
  const filter = {
    active: true,
    $or: [{ slug: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])],
  };
  // Avoid spending a quote request for a nonexistent/inactive product.
  if (!await ProductModel.exists(filter)) return null;
  await refreshPrices();
  const row = await ProductModel.findOne(filter).lean();
  return row ? serialize(row) : null;
}

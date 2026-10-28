import { Types } from "mongoose";
import Holding from "@/models/Holding";
import { connectDB } from "@/lib/db";
import { refreshPrices } from "@/lib/price-refresh";
import { refreshMetalPrices } from "@/lib/metal-prices";
import { companyLogoBgFor, companyLogoFor } from "@/lib/company-logos";

export async function readPortfolio(userId: string) {
  await connectDB();
  await refreshPrices();
  await refreshMetalPrices();
  const rows = await Holding.find({ user: new Types.ObjectId(userId), shares: { $gt: 0 } })
    .populate({ path: "product", select: "ticker type purity name nameAr image logoBg price sectorKey" })
    .sort({ updatedAt: -1, _id: 1 })
    .lean();
  const holdings = rows.flatMap(row => {
    const product = row.product as unknown as {
      _id: Types.ObjectId;
      ticker: string;
      name: string;
      nameAr: string;
      image: string;
      logoBg: string;
      price: number;
      sectorKey?: string;
      type?: string;
      purity?: number | null;
    } | null;
    if (!product) return [];
    const shares = Number(row.shares);
    const costBasis = Number(row.costBasis);
    const currentValue = Number(product.price) * shares;
    return [{
      product: {
        id: String(product._id),
        type: product.type === "metal" ? "metal" as const : "share" as const,
        purity: product.purity ?? null,
        ticker: String(product.ticker),
        name: String(product.name),
        nameAr: String(product.nameAr),
        image: companyLogoFor(String(product.ticker), String(product.image ?? "")),
        logoBg: companyLogoBgFor(String(product.ticker), String(product.logoBg ?? "")),
        price: Number(product.price),
        sectorKey: product.sectorKey ?? "technology-services",
      },
      shares,
      costBasis: Number(costBasis.toFixed(3)),
      currentValue: Number(currentValue.toFixed(3)),
      gain: Number((currentValue - costBasis).toFixed(3)),
    }];
  });
  return {
    holdings,
    totalCostBasis: Number(holdings.reduce((sum, holding) => sum + holding.costBasis, 0).toFixed(3)),
    totalCurrentValue: Number(holdings.reduce((sum, holding) => sum + holding.currentValue, 0).toFixed(3)),
    totalGain: Number(holdings.reduce((sum, holding) => sum + holding.gain, 0).toFixed(3)),
  };
}

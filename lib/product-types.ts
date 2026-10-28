import type { SectorKey } from "@/data/sectors";

export type Product = {
  id: string;
  type: "share" | "metal";
  purity: number | null;
  name: string;
  nameAr: string;
  sectorKey: SectorKey;
  description: string;
  descriptionAr: string;
  ticker: string;
  image: string;
  logoBg: string;
  price: number;
  change: number;
  priceUpdatedAt: string | null;
};

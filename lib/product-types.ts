import type { SectorKey } from "@/data/sectors";

export type Product = {
  id: string;
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

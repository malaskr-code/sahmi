export const SECTORS = [
  {
    id: "banks",
    labelEn: "Banks",
    labelAr: "البنوك",
    category: "Banking",
    categoryAr: "الخدمات المصرفية",
    aliases: ["banks", "banking", "الخدمات المصرفية", "البنوك"],
  },
  {
    id: "telecom",
    labelEn: "Telecom",
    labelAr: "الاتصالات",
    category: "Telecommunications",
    categoryAr: "الاتصالات",
    aliases: ["telecom", "telecommunications", "الاتصالات"],
  },
  {
    id: "real-estate",
    labelEn: "Real Estate",
    labelAr: "العقار",
    category: "Real Estate",
    categoryAr: "العقارات",
    aliases: ["real estate", "real-estate", "العقار", "العقارات"],
  },
  {
    id: "logistics-industry",
    labelEn: "Logistics & Industry",
    labelAr: "اللوجستيات والصناعة",
    category: "Logistics",
    categoryAr: "الخدمات اللوجستية",
    aliases: ["logistics", "logistics & industry", "اللوجستيات", "الصناعة", "الخدمات اللوجستية"],
  },
  {
    id: "technology-services",
    labelEn: "Technology & Services",
    labelAr: "التقنية والخدمات",
    category: "Technology & Services",
    categoryAr: "التقنية والخدمات",
    aliases: ["technology & services", "education", "financial services", "التعليم", "الخدمات المالية", "التقنية والخدمات"],
  },
  {
    id: "gold-silver",
    labelEn: "Gold & Silver",
    labelAr: "الذهب والفضة",
    category: "Gold & Silver",
    categoryAr: "الذهب والفضة",
    aliases: ["gold & silver", "metals", "ذهب", "فضة", "الذهب والفضة"],
  },
] as const;

export type SectorKey = (typeof SECTORS)[number]["id"];

export function isSectorKey(value: unknown): value is SectorKey {
  return typeof value === "string" && SECTORS.some(sector => sector.id === value);
}

export function sectorDefinition(value: unknown) {
  return isSectorKey(value) ? SECTORS.find(sector => sector.id === value)! : null;
}

export function sectorLabel(value: unknown, lang: "en" | "ar") {
  const sector = sectorDefinition(value);
  if (!sector) return "";
  return lang === "ar" ? sector.labelAr : sector.labelEn;
}

export function inferSectorKey(...values: unknown[]): SectorKey | null {
  for (const value of values) {
    if (isSectorKey(value)) return value;
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    const match = SECTORS.find(sector =>
      sector.aliases.some(alias => alias.toLowerCase() === normalized)
      || sector.labelEn.toLowerCase() === normalized
      || sector.labelAr === value.trim(),
    );
    if (match) return match.id;
  }
  return null;
}

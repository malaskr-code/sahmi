export const SECTOR_GROUPS = [
  { id: "banks", sectors: ["Banking"] },
  { id: "telecom", sectors: ["Telecommunications"] },
  { id: "real-estate", sectors: ["Real Estate"] },
  { id: "logistics-industry", sectors: ["Logistics"] },
  { id: "technology-services", sectors: ["Education", "Financial Services"] },
] as const;

export type SectorGroupId = (typeof SECTOR_GROUPS)[number]["id"];

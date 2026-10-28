import { SECTORS } from "./sectors";

// Kept as an alias for older imports; the sector definitions live in one place.
export const SECTOR_GROUPS = SECTORS;
export type SectorGroupId = (typeof SECTOR_GROUPS)[number]["id"];

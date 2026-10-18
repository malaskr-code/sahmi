export const CARD_THEME_IDS = [
  "eid",
  "graduation",
  "birthday",
  "newborn",
  "wedding",
  "general",
] as const;

export type CardThemeId = (typeof CARD_THEME_IDS)[number];

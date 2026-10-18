export const KWD_FILS_PER_UNIT = 1000;
export const STRIPE_AMOUNT_INCREMENT_FILS = 10;
export const SERVICE_FEE_FILS = 250;
export const MIN_TOPUP_FILS = 1000;

export function kwdToFils(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid KWD amount.");
  const exactFils = value * KWD_FILS_PER_UNIT;
  const fils = Math.round(exactFils);
  if (Math.abs(exactFils - fils) > 0.00001 || fils % STRIPE_AMOUNT_INCREMENT_FILS !== 0) {
    throw new Error("KWD amounts must be whole fils and divisible by 10.");
  }
  return fils;
}

export function filsToKwd(fils: number): number {
  if (!Number.isSafeInteger(fils)) throw new Error("Invalid fils amount.");
  return fils / KWD_FILS_PER_UNIT;
}

export function parseTopupFils(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  try {
    const fils = kwdToFils(value);
    return fils >= MIN_TOPUP_FILS ? fils : null;
  } catch {
    return null;
  }
}

export function walletBalanceFils(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Invalid wallet balance.");
  const fils = Math.round(value * KWD_FILS_PER_UNIT);
  if (Math.abs(value * KWD_FILS_PER_UNIT - fils) > 0.01) throw new Error("Invalid wallet balance.");
  return fils;
}

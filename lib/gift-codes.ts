import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";

const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
let cachedSecret: string | null = null;
let cachedKey: Buffer | null = null;

export function normalizeGiftCode(code: string) {
  return code.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function hashGiftCode(code: string) {
  return createHash("sha256").update(normalizeGiftCode(code)).digest("hex");
}

export function createGiftCode(ticker: string) {
  const prefix = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "SAHMI";
  const bytes = randomBytes(16);
  const token = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
  return `${prefix}-${token.match(/.{1,4}/g)!.join("-")}`;
}

function encryptionKey() {
  const secret = process.env.CODE_SECRET;
  if (!secret) throw new Error("CODE_SECRET is missing.");
  if (!cachedKey || cachedSecret !== secret) {
    cachedKey = scryptSync(secret, "sahmi-gift-code-v1", 32);
    cachedSecret = secret;
  }
  return cachedKey;
}

export function encryptGiftCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptGiftCode(value: string) {
  const [version, ivText, tagText, ciphertextText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) throw new Error("Invalid encrypted gift code.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}

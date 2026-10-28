import { createHash, randomBytes } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // بدون أحرف مربكة

export function randomCode(len: number): string {
  const buf = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

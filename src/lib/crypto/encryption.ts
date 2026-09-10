import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { env } from "@/lib/env";

/**
 * AES-256-GCM envelope for the two secrets this app holds: provider redemption
 * data and gift claim tokens. Ciphertext format is
 * `v1.<iv>.<authTag>.<ciphertext>`, all base64url.
 */

const VERSION = "v1";
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = env().ENCRYPTION_KEY.trim();
  const decoded = decodeKey(raw);

  if (decoded.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to exactly 32 bytes (got ${decoded.length}). Generate one with: openssl rand -hex 32`,
    );
  }

  cachedKey = decoded;
  return cachedKey;
}

function decodeKey(raw: string): Buffer {
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) return base64;
  return Buffer.from(raw, "utf8");
}

export function encryptJson(value: unknown): string {
  return encryptString(JSON.stringify(value));
}

export function decryptJson<T>(payload: string): T {
  return JSON.parse(decryptString(payload)) as T;
}

export function encryptString(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [VERSION, b64url(iv), b64url(authTag), b64url(ciphertext)].join(".");
}

export function decryptString(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed ciphertext");
  }

  const [, ivPart, tagPart, dataPart] = parts as [string, string, string, string];
  const decipher = createDecipheriv("aes-256-gcm", key(), fromB64url(ivPart));
  decipher.setAuthTag(fromB64url(tagPart));

  return Buffer.concat([decipher.update(fromB64url(dataPart)), decipher.final()]).toString("utf8");
}

/** Lookup hash for claim tokens. Tokens are 256-bit random, so SHA-256 is sufficient. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function b64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function fromB64url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

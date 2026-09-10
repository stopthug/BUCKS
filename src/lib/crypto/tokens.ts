import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

/**
 * Claim tokens are 32 bytes of CSPRNG output rendered base64url: long enough
 * that guessing is not a threat model, short enough to fit in a shareable URL.
 */
export function createClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

const CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,64}$/;

export function isPlausibleClaimToken(token: string): boolean {
  return CLAIM_TOKEN_PATTERN.test(token);
}

export function createNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function createIdempotencyKey(): string {
  return randomUUID();
}

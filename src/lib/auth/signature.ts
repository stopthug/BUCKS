import "server-only";

import bs58 from "bs58";
import nacl from "tweetnacl";

import { AppError } from "@/lib/errors";

/**
 * Ed25519 verification of a wallet's `signMessage` output. The app only ever
 * asks a wallet to sign a plain-text login message — never a raw payload it
 * cannot read, and never anything resembling a key export.
 */

export function verifySignedMessage(input: {
  address: string;
  message: string;
  /** Base64 signature as returned by the Wallet Standard sign-message feature. */
  signature: string;
}): void {
  let publicKey: Uint8Array;
  let signature: Uint8Array;

  try {
    publicKey = bs58.decode(input.address);
  } catch {
    throw new AppError("invalid_request", { detail: "address is not base58" });
  }

  try {
    signature = decodeSignature(input.signature);
  } catch {
    throw new AppError("signature_invalid", { detail: "signature is not decodable" });
  }

  if (publicKey.length !== 32 || signature.length !== 64) {
    throw new AppError("signature_invalid", { detail: "unexpected key or signature length" });
  }

  const message = new TextEncoder().encode(input.message);
  const valid = nacl.sign.detached.verify(message, signature, publicKey);

  if (!valid) {
    throw new AppError("signature_invalid", { detail: "ed25519 verification failed" });
  }
}

function decodeSignature(value: string): Uint8Array {
  // Wallets differ: some hand back base64, some base58.
  if (/^[0-9a-zA-Z+/=]+$/.test(value) && value.includes("=")) {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  try {
    return bs58.decode(value);
  } catch {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
}

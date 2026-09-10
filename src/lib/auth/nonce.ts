import "server-only";

import { query, queryOne } from "@/lib/db/client";
import { createNonce } from "@/lib/crypto/tokens";
import { AppError } from "@/lib/errors";

/**
 * Login challenges. A nonce is bound to one address, expires in five minutes,
 * and is consumed atomically, so a captured signature cannot be replayed.
 */

const TTL_SECONDS = 300;

export interface LoginChallenge {
  nonce: string;
  message: string;
  expiresAt: string;
}

export async function issueChallenge(address: string, appUrl: string): Promise<LoginChallenge> {
  const nonce = createNonce();

  const row = await queryOne<{ expires_at: Date }>(
    `INSERT INTO auth_nonces (nonce, address, expires_at)
     VALUES ($1, $2, now() + ($3 || ' seconds')::interval)
     RETURNING expires_at`,
    [nonce, address, TTL_SECONDS],
  );

  if (!row) throw new AppError("internal", { detail: "failed to persist nonce" });

  // Housekeeping is cheap here and keeps the table from growing unbounded.
  await query(`DELETE FROM auth_nonces WHERE expires_at < now() - interval '1 day'`);

  return {
    nonce,
    message: buildLoginMessage({ address, nonce, appUrl }),
    expiresAt: row.expires_at.toISOString(),
  };
}

/**
 * Human-readable, unambiguous, and free of anything that looks like a
 * transaction. The wallet shows this text verbatim.
 */
export function buildLoginMessage(input: {
  address: string;
  nonce: string;
  appUrl: string;
}): string {
  const domain = new URL(input.appUrl).host;
  return [
    `${domain} wants you to sign in with your Solana account:`,
    input.address,
    "",
    "Signing this proves you own this wallet. It authorises no transaction and moves no funds.",
    "",
    `Nonce: ${input.nonce}`,
  ].join("\n");
}

/** Consumes the nonce. Returns the address it was issued for, or throws. */
export async function consumeChallenge(nonce: string, address: string): Promise<void> {
  const row = await queryOne<{ nonce: string }>(
    `UPDATE auth_nonces
        SET consumed_at = now()
      WHERE nonce = $1
        AND address = $2
        AND consumed_at IS NULL
        AND expires_at > now()
      RETURNING nonce`,
    [nonce, address],
  );

  if (!row) {
    throw new AppError("nonce_invalid", {
      detail: "nonce missing, expired, already used, or bound to another address",
    });
  }
}

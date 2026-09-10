import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api/respond";
import { buildLoginMessage, consumeChallenge } from "@/lib/auth/nonce";
import { createSession, upsertUserForWallet } from "@/lib/auth/session";
import { verifySignedMessage } from "@/lib/auth/signature";
import { env } from "@/lib/env";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "not a Solana address"),
  nonce: z.string().trim().min(16).max(64),
  signature: z.string().trim().min(43).max(200),
});

export async function POST(request: Request) {
  return handle("auth/verify", async () => {
    await enforceRateLimit("authVerify", clientIdentifier(request));

    const body = bodySchema.parse(await readJson(request));

    // The nonce is consumed first: a signature can never be replayed, even if
    // verification of this attempt fails.
    await consumeChallenge(body.nonce, body.address);

    // The message is rebuilt server-side, so a wallet cannot be tricked into
    // signing different text than the one we verify.
    verifySignedMessage({
      address: body.address,
      message: buildLoginMessage({
        address: body.address,
        nonce: body.nonce,
        appUrl: env().APP_URL,
      }),
      signature: body.signature,
    });

    const userId = await upsertUserForWallet(body.address);
    await createSession({ userId, address: body.address, issuedAt: Date.now() });

    return ok({ userId, address: body.address });
  });
}

import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api/respond";
import { issueChallenge } from "@/lib/auth/nonce";
import { env } from "@/lib/env";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "not a Solana address"),
});

export async function POST(request: Request) {
  return handle("auth/nonce", async () => {
    await enforceRateLimit("authNonce", clientIdentifier(request));

    const { address } = bodySchema.parse(await readJson(request));
    const challenge = await issueChallenge(address, env().APP_URL);

    return ok(challenge);
  });
}

import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api/respond";
import { ensureCheckoutSession } from "@/lib/auth/session";
import { getQuote } from "@/lib/db/queries";
import { settleFromWatch } from "@/lib/fulfillment";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  quoteId: z.string().uuid(),
  /** Confirmed Solana transaction signature. */
  signature: z
    .string()
    .trim()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,128}$/, "not a Solana signature"),
});

/**
 * Settles a quote from an observed treasury payment. The primary checkout path
 * is `POST /api/payments/watch`; this remains for a client that already has a
 * signature.
 */
export async function POST(request: Request) {
  return handle("payments/confirm", async () => {
    const body = bodySchema.parse(await readJson(request));
    await enforceRateLimit("confirm", `${clientIdentifier(request)}:${body.quoteId}`);

    const quote = await getQuote(body.quoteId);
    await ensureCheckoutSession(quote.userId);

    const result = await settleFromWatch({
      quoteId: body.quoteId,
      signature: body.signature,
    });

    return ok(result);
  });
}

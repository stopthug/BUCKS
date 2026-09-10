import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api/respond";
import { createSession, upsertUserForWallet } from "@/lib/auth/session";
import { getQuote } from "@/lib/db/queries";
import { settlePayment } from "@/lib/fulfillment";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Landing a transaction, verifying it, and buying a card takes a while. */
export const maxDuration = 120;

const bodySchema = z.object({
  quoteId: z.string().uuid(),
  /** Base64 transaction signed by the user's wallet. */
  signedTransaction: z.string().min(1).max(8192),
});

/**
 * The only route that can produce a gift card.
 *
 * It does not accept a "payment succeeded" claim from the client: it takes the
 * signed transaction, lands it, verifies settlement against the chain, and
 * only then places the provider order. A session cookie is set after that
 * proof so the buyer can reveal the card — no separate wallet login.
 */
export async function POST(request: Request) {
  return handle("payments/confirm", async () => {
    const body = bodySchema.parse(await readJson(request));
    const quote = await getQuote(body.quoteId);

    await enforceRateLimit("confirm", quote.walletAddress);

    const userId = await upsertUserForWallet(quote.walletAddress);

    const result = await settlePayment({
      userId,
      walletAddress: quote.walletAddress,
      quoteId: body.quoteId,
      signedTransaction: body.signedTransaction,
    });

    await createSession({
      userId,
      address: quote.walletAddress,
      issuedAt: Date.now(),
    });

    return ok(result);
  });
}

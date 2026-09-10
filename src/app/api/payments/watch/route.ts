import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api/respond";
import { ensureCheckoutSession } from "@/lib/auth/session";
import { getOrderByQuoteId, getQuote } from "@/lib/db/queries";
import { AppError } from "@/lib/errors";
import { refreshOrder, settleFromWatch } from "@/lib/fulfillment";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { findTreasuryPayment } from "@/lib/solana/watch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  quoteId: z.string().uuid(),
});

/**
 * Polls the treasury for a matching send-to-treasury payment, then settles.
 * Returns `{ watching: true }` until the unique amount (and memo, if present)
 * lands. If the quote was already consumed, returns the existing order so a
 * refresh can recover.
 */
export async function POST(request: Request) {
  return handle("payments/watch", async () => {
    const body = bodySchema.parse(await readJson(request));
    await enforceRateLimit("watch", `${clientIdentifier(request)}:${body.quoteId}`);

    const quote = await getQuote(body.quoteId);
    await ensureCheckoutSession(quote.userId);

    const existing = await getOrderByQuoteId(quote.id);
    if (existing) {
      if (existing.status === "provider_processing" || existing.status === "payment_confirmed") {
        await refreshOrder(existing.id).catch(() => undefined);
      }
      const result = await settleFromWatch({
        quoteId: quote.id,
        signature: existing.paymentSignature ?? "",
      });
      return ok({ watching: false, ...result });
    }

    if (quote.expiresAt.getTime() <= Date.now()) {
      throw new AppError("quote_expired");
    }

    const signature = await findTreasuryPayment(quote);
    if (!signature) return ok({ watching: true as const });

    const result = await settleFromWatch({ quoteId: quote.id, signature });
    return ok({ watching: false, ...result });
  });
}

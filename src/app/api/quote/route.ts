import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api/respond";
import { requireSession } from "@/lib/auth/session";
import { createCheckoutQuote, GIFT_MESSAGE_MAX_LENGTH, GIFT_NAME_MAX_LENGTH } from "@/lib/checkout";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  categoryId: z.string().trim().min(1).max(128),
  cardId: z.string().trim().min(1).max(128),
  asset: z.enum(["BUCKS", "SBUXx", "SOL", "USDC"]),
  intent: z.enum(["purchase", "gift"]),
  senderName: z.string().max(GIFT_NAME_MAX_LENGTH).nullish(),
  message: z.string().max(GIFT_MESSAGE_MAX_LENGTH).nullish(),
});

/**
 * Prices a purchase and returns a transaction to sign. All amounts are
 * computed and stored server-side; the client only ever echoes back the quote
 * id and the signed bytes.
 */
export async function POST(request: Request) {
  return handle("quote", async () => {
    const session = await requireSession();
    await enforceRateLimit("quote", session.userId);

    const body = bodySchema.parse(await readJson(request));

    const quote = await createCheckoutQuote({
      userId: session.userId,
      walletAddress: session.address,
      categoryId: body.categoryId,
      cardId: body.cardId,
      assetSymbol: body.asset,
      intent: body.intent,
      senderName: body.senderName ?? null,
      message: body.message ?? null,
    });

    return ok(quote);
  });
}

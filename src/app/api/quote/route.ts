import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api/respond";
import {
  createGuestUser,
  ensureCheckoutSession,
  getSession,
  touchUser,
} from "@/lib/auth/session";
import {
  createCheckoutQuote,
  GIFT_MESSAGE_MAX_LENGTH,
  GIFT_NAME_MAX_LENGTH,
  RECEIPT_EMAIL_MAX_LENGTH,
  sanitiseEmail,
} from "@/lib/checkout";
import { CHECKOUT_ASSETS } from "@/lib/checkout-limits";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  categoryId: z.string().trim().min(1).max(128),
  cardId: z.string().trim().min(1).max(128),
  asset: z.enum(CHECKOUT_ASSETS),
  intent: z.enum(["purchase", "gift"]),
  email: z.string().max(RECEIPT_EMAIL_MAX_LENGTH).nullish(),
  senderName: z.string().max(GIFT_NAME_MAX_LENGTH).nullish(),
  message: z.string().max(GIFT_MESSAGE_MAX_LENGTH).nullish(),
});

/**
 * Prices a purchase and returns a Solana Pay request. No wallet is required.
 * Amounts are computed and stored server-side; the client shows the QR and
 * polls until the treasury sees the unique amount.
 */
export async function POST(request: Request) {
  return handle("quote", async () => {
    const body = bodySchema.parse(await readJson(request));
    await enforceRateLimit("quote", clientIdentifier(request));

    const receiptEmail = sanitiseEmail(body.email);
    const session = await getSession();
    const userId = session?.userId ?? (await createGuestUser(receiptEmail));

    if (session) await touchUser(session.userId, receiptEmail);
    await ensureCheckoutSession(userId);

    const quote = await createCheckoutQuote({
      userId,
      categoryId: body.categoryId,
      cardId: body.cardId,
      assetSymbol: body.asset,
      intent: body.intent,
      senderName: body.senderName ?? null,
      message: body.message ?? null,
      receiptEmail,
    });

    return ok(quote);
  });
}

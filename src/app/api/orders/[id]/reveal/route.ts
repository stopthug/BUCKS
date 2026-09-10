import { z } from "zod";

import { toRedemptionDto } from "@/lib/api/dto";
import { handle, ok } from "@/lib/api/respond";
import { requireSession } from "@/lib/auth/session";
import { decryptJson } from "@/lib/crypto/encryption";
import { getOrderForUser, markOrderRevealed } from "@/lib/db/queries";
import { AppError } from "@/lib/errors";
import type { StoredRedemption } from "@/lib/fulfillment";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Reveals a purchased card to its owner.
 *
 * POST rather than GET on purpose: the response carries the actual redemption
 * code, so it must never be cached, prefetched, or sit in a browser history
 * entry. The code is decrypted per request and never logged.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("orders/[id]/reveal", async () => {
    const session = await requireSession();
    await enforceRateLimit("reveal", session.userId);

    const { id } = paramsSchema.parse(await context.params);
    const order = await getOrderForUser(id, session.userId);

    if (!order.encryptedRedemptionData) {
      if (order.status === "refund_required") throw new AppError("refund_required");
      if (order.status === "provider_failed") throw new AppError("provider_failed");
      throw new AppError("provider_processing");
    }

    // A gift's code belongs to the recipient, not the buyer.
    if (order.intent === "gift") {
      throw new AppError("forbidden", { detail: "gift codes are revealed on the claim page" });
    }

    const stored = decryptJson<StoredRedemption>(order.encryptedRedemptionData);
    await markOrderRevealed(order.id);

    return ok(toRedemptionDto(stored.cards));
  });
}

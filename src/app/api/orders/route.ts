import { z } from "zod";

import { toOrderWithGiftDto } from "@/lib/api/dto";
import { handle, ok } from "@/lib/api/respond";
import { requireSession } from "@/lib/auth/session";
import { listOrdersForUser } from "@/lib/db/queries";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const intentSchema = z.enum(["purchase", "gift"]).default("purchase");

/** Purchase or gift history for the signed-in wallet. */
export async function GET(request: Request) {
  return handle("orders", async () => {
    const session = await requireSession();
    await enforceRateLimit("catalog", session.userId);

    const intent = intentSchema.parse(
      new URL(request.url).searchParams.get("intent") ?? undefined,
    );

    const entries = await listOrdersForUser(session.userId, intent);

    return ok({
      orders: entries.map((entry) =>
        // The sender owns these rows, so their own claim links are theirs to see.
        toOrderWithGiftDto(entry, { includeClaimUrl: intent === "gift" }),
      ),
    });
  });
}

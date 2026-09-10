import { z } from "zod";

import { toOrderDto } from "@/lib/api/dto";
import { handle, ok } from "@/lib/api/respond";
import { requireSession } from "@/lib/auth/session";
import { getOrderForUser, getProduct } from "@/lib/db/queries";
import { AppError } from "@/lib/errors";
import { refreshOrder } from "@/lib/fulfillment";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Order status. Reading an in-flight order also nudges it forward: webhooks
 * drive fulfilment in production, and this makes the success screen
 * self-healing if a delivery is delayed or the endpoint is not yet configured.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("orders/[id]", async () => {
    const session = await requireSession();
    await enforceRateLimit("catalog", session.userId);

    const { id } = paramsSchema.parse(await context.params);

    const existing = await getOrderForUser(id, session.userId);

    const order =
      existing.status === "provider_processing" || existing.status === "payment_confirmed"
        ? await refreshOrder(existing.id)
        : existing;

    const product = await getProduct(order.productId);
    if (!product) throw new AppError("internal", { detail: "order product missing" });

    return ok({ order: toOrderDto(order, product) });
  });
}

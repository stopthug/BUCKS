import { NextResponse } from "next/server";

import { handle } from "@/lib/api/respond";
import { getOrderByProviderId } from "@/lib/db/queries";
import { markWebhookProcessed, recordWebhookEvent } from "@/lib/db/queries";
import { redact } from "@/lib/errors";
import {
  isOrderEvent,
  isWebhookConfigured,
  parseWebhookEvent,
  SIGNATURE_HEADER,
  verifyWebhookSignature,
} from "@/lib/fazer/webhooks";
import { refreshOrder } from "@/lib/fulfillment";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * FazerCards order webhooks.
 *
 * Three properties matter here and all three are enforced:
 *
 *   - authenticity: HMAC-SHA256 over the raw body, compared in constant time.
 *     An unsigned or mis-signed delivery is rejected before it is parsed.
 *   - idempotency: `event_id` is unique in `webhook_events`, so a duplicate
 *     delivery is recorded once and does nothing the second time.
 *   - speed: we acknowledge quickly and treat the event as a hint to re-read
 *     the order from the provider, never as a source of truth about codes.
 */
export async function POST(request: Request) {
  return handle("webhooks/fazer", async () => {
    await enforceRateLimit("webhook", clientIdentifier(request));

    if (!isWebhookConfigured()) {
      // Without a configured secret nothing can be authenticated, so nothing
      // is accepted. Order status still converges via polling.
      return NextResponse.json({ ok: false, error: "webhooks not configured" }, { status: 503 });
    }

    // The signature covers the exact bytes sent, so the body is read as text.
    const rawBody = await request.text();
    const signature = request.headers.get(SIGNATURE_HEADER);

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[webhooks/fazer] rejected: invalid signature");
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }

    const event = parseWebhookEvent(rawBody);
    if (!event) {
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
    }

    const providerOrderId = event.data.order_id ?? null;

    const isNew = await recordWebhookEvent({
      eventId: event.event_id,
      eventType: event.event,
      providerOrderId,
      payload: JSON.parse(rawBody),
    });

    if (!isNew) {
      // Duplicate delivery: already handled, acknowledge and stop.
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (!isOrderEvent(event) || !providerOrderId) {
      await markWebhookProcessed(event.event_id);
      return NextResponse.json({ ok: true, ignored: true });
    }

    try {
      const order = await getOrderByProviderId(providerOrderId);

      if (order) {
        await refreshOrder(order.id);
      }

      await markWebhookProcessed(event.event_id);
    } catch (error) {
      // The event is stored, so a failure here is recoverable and must not
      // make the provider retry indefinitely against a broken code path.
      const message = redact(error);
      console.error(`[webhooks/fazer] processing failed: ${message}`);
      await markWebhookProcessed(event.event_id, message);
    }

    return NextResponse.json({ ok: true });
  });
}

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { env } from "@/lib/env";

/**
 * FazerCards webhook receipt.
 *
 * Signature scheme, per the provider's docs: the `X-Webhook-Signature` header
 * is `sha256=` followed by the hex HMAC-SHA256 of the **raw** request body
 * using the webhook secret from the reseller panel.
 */

export const SIGNATURE_HEADER = "x-webhook-signature";

export const webhookEventSchema = z.object({
  event: z.string(),
  event_id: z.string().min(1),
  timestamp: z.string().optional(),
  data: z
    .object({
      order_id: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      previous_status: z.string().optional(),
    })
    .passthrough(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

export function isWebhookConfigured(): boolean {
  return Boolean(env().FAZER_WEBHOOK_SECRET);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = env().FAZER_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;

  const received = Buffer.from(signature.trim(), "utf8");
  const computed = Buffer.from(expected, "utf8");
  if (received.length !== computed.length) return false;

  return timingSafeEqual(received, computed);
}

export function parseWebhookEvent(rawBody: string): WebhookEvent | null {
  try {
    return webhookEventSchema.parse(JSON.parse(rawBody));
  } catch {
    return null;
  }
}

/** Events that mean "an order changed state and we should re-read it". */
export function isOrderEvent(event: WebhookEvent): boolean {
  return event.event.startsWith("order.");
}

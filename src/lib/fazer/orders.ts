import "server-only";

import { fazerRequest } from "./client";
import { orderEnvelopeSchema, normalizeProviderOrder, type ProviderOrder } from "./types";

/**
 * Gift-card order creation and status reads.
 *
 * The idempotency key is generated and persisted by the caller *before* the
 * first request, and every retry for that purchase reuses it. The provider
 * returns the original order for a repeated key, so a timeout followed by a
 * retry can never buy a second Starbucks card.
 */

export interface CreateOrderInput {
  categoryId: string;
  cardId: string;
  quantity: number;
  /** Persisted before this call. Never regenerated for the same purchase. */
  idempotencyKey: string;
}

export async function createGiftCardOrder(input: CreateOrderInput): Promise<ProviderOrder> {
  const response = await fazerRequest("/giftcards/order", orderEnvelopeSchema, {
    method: "POST",
    body: {
      category_id: input.categoryId,
      card_id: input.cardId,
      quantity: input.quantity,
    },
    idempotencyKey: input.idempotencyKey,
    // A longer window than reads: fulfilment can take a few seconds.
    timeoutMs: 25_000,
    // No transport-level retry here. Retrying is a deliberate, logged decision
    // made by the fulfilment orchestrator, always with the same key.
    retries: 0,
  });

  return normalizeProviderOrder(response.order);
}

export async function getProviderOrder(providerOrderId: string): Promise<ProviderOrder> {
  const response = await fazerRequest(
    `/orders/${encodeURIComponent(providerOrderId)}`,
    orderEnvelopeSchema,
    { retries: 1 },
  );
  return normalizeProviderOrder(response.order);
}

/**
 * Replays the original request with the original key. The provider answers
 * with the existing order rather than creating a new one, which is how we
 * recover from "we paid the provider but never saw the response".
 */
export async function recoverOrderByIdempotencyKey(
  input: CreateOrderInput,
): Promise<ProviderOrder> {
  return createGiftCardOrder(input);
}

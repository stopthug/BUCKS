import "server-only";

import { claimUrlFromGift } from "@/lib/fulfillment";
import type { GiftRow, OrderRow, OrderWithProduct, ProductRow } from "@/lib/db/queries";
import type { RedemptionCard } from "@/lib/fazer/types";

/**
 * Wire shapes for the client.
 *
 * Redemption data is deliberately absent from every one of these. It is only
 * ever returned by the dedicated reveal/claim endpoints, and only to a caller
 * that has proven it owns the order or holds the claim token.
 */

export interface OrderDto {
  id: string;
  intent: "purchase" | "gift";
  status: OrderRow["status"];
  paymentAsset: string;
  paymentAmount: string;
  providerPriceUsd: string;
  faceValueUsd: string | null;
  cardName: string;
  categoryName: string;
  createdAt: string;
  fulfilledAt: string | null;
  /** True once a code exists to reveal. */
  hasRedemption: boolean;
  paymentSignature: string | null;
}

export function toOrderDto(order: OrderRow, product: ProductRow): OrderDto {
  return {
    id: order.id,
    intent: order.intent,
    status: order.status,
    paymentAsset: order.paymentAsset,
    paymentAmount: order.paymentAmount.toString(),
    providerPriceUsd: order.providerPriceUsd.toString(),
    faceValueUsd: (order.faceValueUsd ?? product.faceValueUsd)?.toString() ?? null,
    cardName: product.name,
    categoryName: product.categoryName,
    createdAt: order.createdAt.toISOString(),
    fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
    hasRedemption: Boolean(order.encryptedRedemptionData),
    paymentSignature: order.paymentSignature,
  };
}

export interface GiftDto {
  id: string;
  orderId: string;
  status: GiftRow["status"];
  senderName: string | null;
  message: string | null;
  claimedAt: string | null;
  createdAt: string;
  /** Only ever populated for the sender of this gift. */
  claimUrl: string | null;
}

export function toGiftDto(gift: GiftRow, options: { includeClaimUrl: boolean }): GiftDto {
  return {
    id: gift.id,
    orderId: gift.orderId,
    status: gift.status,
    senderName: gift.senderName,
    message: gift.message,
    claimedAt: gift.claimedAt?.toISOString() ?? null,
    createdAt: gift.createdAt.toISOString(),
    claimUrl: options.includeClaimUrl ? claimUrlFromGift(gift.encryptedClaimToken) : null,
  };
}

export interface OrderWithGiftDto extends OrderDto {
  gift: GiftDto | null;
}

export function toOrderWithGiftDto(
  entry: OrderWithProduct,
  options: { includeClaimUrl: boolean },
): OrderWithGiftDto {
  return {
    ...toOrderDto(entry.order, entry.product),
    gift: entry.gift ? toGiftDto(entry.gift, options) : null,
  };
}

export interface RedemptionDto {
  cards: Array<{
    code?: string;
    pin?: string;
    serial?: string;
    expiresAt?: string;
    instructions?: string;
    extra: Record<string, string>;
  }>;
}

export function toRedemptionDto(cards: RedemptionCard[]): RedemptionDto {
  return { cards };
}

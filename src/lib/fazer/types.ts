import { z } from "zod";

/**
 * Shapes for https://api.fzr.cards/api/v2.
 *
 * The catalog and balance endpoints have a documented schema, so those are
 * parsed strictly. The order object is declared free-form in the provider's
 * OpenAPI spec ("Completed order includes `cards` (codes)") with no field list,
 * so orders go through a tolerant normaliser instead: we keep every scalar the
 * provider sends rather than dropping redemption fields we did not anticipate.
 */

export const fazerErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string().optional(),
  code: z.string().optional(),
  blockReason: z.string().nullable().optional(),
});

export const giftCardCategorySchema = z.object({
  category_id: z.string(),
  name: z.string(),
  note: z.string().optional(),
  imageurl: z.string().nullable().optional(),
});

export const giftCardCategoriesResponseSchema = z.object({
  ok: z.literal(true),
  kind: z.string().optional(),
  items: z.array(giftCardCategorySchema),
  meta: z
    .object({
      total: z.number().optional(),
      limit: z.number().optional(),
      next_cursor: z.string().nullable().optional(),
      has_more: z.boolean().optional(),
    })
    .optional(),
});

export const giftCardOfferSchema = z.object({
  card_id: z.string().nullable(),
  name: z.string(),
  price_usd: z.string(),
  stock: z.number(),
  min_order_quantity: z.number(),
  max_order_quantity: z.number(),
});

export const giftCardOffersResponseSchema = z.object({
  ok: z.literal(true),
  kind: z.string().optional(),
  category_id: z.string(),
  name: z.string(),
  note: z.string().optional(),
  imageurl: z.string().nullable().optional(),
  offers: z.array(giftCardOfferSchema),
});

export const balanceResponseSchema = z.object({
  ok: z.literal(true),
  balance: z.string(),
  currency: z.string(),
});

export const orderEnvelopeSchema = z.object({
  ok: z.literal(true),
  order: z.unknown(),
});

export type FazerGiftCardCategory = z.infer<typeof giftCardCategorySchema>;
export type FazerGiftCardOffer = z.infer<typeof giftCardOfferSchema>;
export type FazerGiftCardOffers = z.infer<typeof giftCardOffersResponseSchema>;

/** Provider order lifecycle, collapsed to the four states we act on. */
export type ProviderOrderStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

export interface RedemptionCard {
  code?: string;
  pin?: string;
  serial?: string;
  expiresAt?: string;
  instructions?: string;
  /** Any other scalar the provider returned, preserved verbatim. */
  extra: Record<string, string>;
}

export interface ProviderOrder {
  /** Public provider id, e.g. `ord-1001`. */
  id: string | null;
  status: ProviderOrderStatus;
  cards: RedemptionCard[];
  /** Provider-reported cost, when present. */
  totalUsd?: string;
}

const CODE_KEYS = ["code", "card_code", "gift_card_code", "redemption_code", "voucher", "key"];
const PIN_KEYS = ["pin", "card_pin", "cvv", "security_code"];
const SERIAL_KEYS = ["serial", "serial_number", "card_number", "number", "account"];
const EXPIRY_KEYS = ["expires_at", "expiry", "expiration", "expire_date", "valid_until"];
const INSTRUCTION_KEYS = ["instructions", "instruction", "redemption_instructions", "note", "how_to_redeem"];

function pick(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function normalizeCard(raw: unknown): RedemptionCard | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? { code: trimmed, extra: {} } : null;
  }

  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const code = pick(record, CODE_KEYS);
  const pin = pick(record, PIN_KEYS);
  const serial = pick(record, SERIAL_KEYS);
  const expiresAt = pick(record, EXPIRY_KEYS);
  const instructions = pick(record, INSTRUCTION_KEYS);

  const consumed = new Set([
    ...CODE_KEYS,
    ...PIN_KEYS,
    ...SERIAL_KEYS,
    ...EXPIRY_KEYS,
    ...INSTRUCTION_KEYS,
  ]);

  const extra: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (consumed.has(key)) continue;
    if (typeof value === "string" && value.trim()) extra[key] = value.trim();
    else if (typeof value === "number" || typeof value === "boolean") extra[key] = String(value);
  }

  if (!code && !pin && !serial && Object.keys(extra).length === 0) return null;

  const card: RedemptionCard = { extra };
  if (code) card.code = code;
  if (pin) card.pin = pin;
  if (serial) card.serial = serial;
  if (expiresAt) card.expiresAt = expiresAt;
  if (instructions) card.instructions = instructions;
  return card;
}

export function normalizeProviderStatus(value: unknown): ProviderOrderStatus {
  const text = typeof value === "string" ? value.toLowerCase().trim() : "";
  switch (text) {
    case "completed":
    case "complete":
    case "done":
    case "delivered":
    case "success":
    case "succeeded":
      return "completed";
    case "failed":
    case "error":
    case "cancelled":
    case "canceled":
    case "rejected":
      return "failed";
    case "refunded":
      return "refunded";
    case "processing":
    case "in_progress":
    case "waiting":
    case "queued":
      return "processing";
    default:
      // Unknown or absent status: treat as still in flight and keep polling
      // rather than guessing that a card is ready.
      return text ? "processing" : "pending";
  }
}

const ORDER_ID_KEYS = ["order_id", "id", "public_id", "orderId", "publicId"];

export function normalizeProviderOrder(raw: unknown): ProviderOrder {
  if (!raw || typeof raw !== "object") {
    return { id: null, status: "pending", cards: [] };
  }

  const record = raw as Record<string, unknown>;
  let id: string | null = null;
  for (const key of ORDER_ID_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      id = value.trim();
      break;
    }
    if (typeof value === "number") {
      id = `ord-${value}`;
      break;
    }
  }

  const cardsSource = firstArray(record, ["cards", "items", "codes", "redemptions", "products"]);
  const cards = cardsSource.map(normalizeCard).filter((card): card is RedemptionCard => card !== null);

  const totalUsd = pick(record, ["total_usd", "total", "price_usd", "amount_usd"]);

  const order: ProviderOrder = {
    id,
    status: normalizeProviderStatus(record["status"]),
    cards,
  };
  if (totalUsd) order.totalUsd = totalUsd;
  return order;
}

function firstArray(record: Record<string, unknown>, keys: readonly string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

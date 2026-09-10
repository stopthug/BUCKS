import "server-only";

import type { PoolClient } from "pg";

import { query, queryOne, transaction } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import type { CoffeeOffer } from "@/lib/fazer/catalog";

/**
 * Typed data access. `BIGINT` columns arrive from pg as strings and are
 * converted to `bigint` here so no money value is ever a JavaScript number.
 */

export type OrderStatus =
  | "awaiting_payment"
  | "payment_processing"
  | "payment_confirmed"
  | "provider_processing"
  | "ready"
  | "claimed"
  | "provider_failed"
  | "refund_required";

export type OrderIntent = "purchase" | "gift";
export type GiftStatus = "pending" | "ready" | "claimed";

export interface ProductRow {
  id: string;
  categoryId: string;
  cardId: string;
  name: string;
  categoryName: string;
  faceValueUsd: bigint | null;
  priceUsd: bigint;
}

export interface QuoteRow {
  id: string;
  userId: string;
  walletAddress: string;
  productId: string;
  intent: OrderIntent;
  paymentAsset: string;
  paymentMint: string;
  paymentAmount: bigint;
  requiredUsdc: bigint;
  providerPriceUsd: bigint;
  routeLabel: string | null;
  jupiterRequestId: string | null;
  networkFeeLamports: bigint;
  unsignedTransaction: string | null;
  senderName: string | null;
  giftMessage: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface OrderRow {
  id: string;
  userId: string;
  productId: string;
  quoteId: string | null;
  paymentId: string | null;
  intent: OrderIntent;
  paymentAsset: string;
  paymentAmount: bigint;
  paymentSignature: string | null;
  providerPriceUsd: bigint;
  faceValueUsd: bigint | null;
  fazercardsOrderId: string | null;
  idempotencyKey: string;
  status: OrderStatus;
  statusDetail: string | null;
  providerAttempts: number;
  encryptedRedemptionData: string | null;
  revealedAt: Date | null;
  createdAt: Date;
  fulfilledAt: Date | null;
}

export interface GiftRow {
  id: string;
  orderId: string;
  senderUserId: string;
  senderName: string | null;
  message: string | null;
  encryptedClaimToken: string;
  status: GiftStatus;
  claimedAt: Date | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim()) return BigInt(value);
  return 0n;
}

function toOptionalBigInt(value: unknown): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  return toBigInt(value);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProduct(row: any): ProductRow {
  return {
    id: row.id,
    categoryId: row.category_id,
    cardId: row.card_id,
    name: row.name,
    categoryName: row.category_name,
    faceValueUsd: toOptionalBigInt(row.face_value_usd),
    priceUsd: toBigInt(row.price_usd),
  };
}

function mapQuote(row: any): QuoteRow {
  return {
    id: row.id,
    userId: row.user_id,
    walletAddress: row.wallet_address,
    productId: row.product_id,
    intent: row.intent,
    paymentAsset: row.payment_asset,
    paymentMint: row.payment_mint,
    paymentAmount: toBigInt(row.payment_amount),
    requiredUsdc: toBigInt(row.required_usdc),
    providerPriceUsd: toBigInt(row.provider_price_usd),
    routeLabel: row.route_label ?? null,
    jupiterRequestId: row.jupiter_request_id ?? null,
    networkFeeLamports: toBigInt(row.network_fee_lamports),
    unsignedTransaction: row.unsigned_transaction ?? null,
    senderName: row.sender_name ?? null,
    giftMessage: row.gift_message ?? null,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at ?? null,
  };
}

function mapOrder(row: any): OrderRow {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quoteId: row.quote_id ?? null,
    paymentId: row.payment_id ?? null,
    intent: row.intent,
    paymentAsset: row.payment_asset,
    paymentAmount: toBigInt(row.payment_amount),
    paymentSignature: row.payment_signature ?? null,
    providerPriceUsd: toBigInt(row.provider_price_usd),
    faceValueUsd: toOptionalBigInt(row.face_value_usd),
    fazercardsOrderId: row.fazercards_order_id ?? null,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    statusDetail: row.status_detail ?? null,
    providerAttempts: Number(row.provider_attempts ?? 0),
    encryptedRedemptionData: row.encrypted_redemption_data ?? null,
    revealedAt: row.revealed_at ?? null,
    createdAt: row.created_at,
    fulfilledAt: row.fulfilled_at ?? null,
  };
}

function mapGift(row: any): GiftRow {
  return {
    id: row.id,
    orderId: row.order_id,
    senderUserId: row.sender_user_id,
    senderName: row.sender_name ?? null,
    message: row.message ?? null,
    encryptedClaimToken: row.encrypted_claim_token,
    status: row.status,
    claimedAt: row.claimed_at ?? null,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/** Snapshots a live provider offer so orders keep a stable reference to it. */
export async function upsertProduct(offer: CoffeeOffer): Promise<ProductRow> {
  const row = await queryOne(
    `INSERT INTO provider_products
       (provider, category_id, card_id, name, category_name, face_value_usd, price_usd, last_seen_stock)
     VALUES ('fazercards', $1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (provider, category_id, card_id) DO UPDATE
       SET name = EXCLUDED.name,
           category_name = EXCLUDED.category_name,
           face_value_usd = EXCLUDED.face_value_usd,
           price_usd = EXCLUDED.price_usd,
           last_seen_stock = EXCLUDED.last_seen_stock,
           updated_at = now()
     RETURNING *`,
    [
      offer.categoryId,
      offer.cardId,
      offer.name,
      offer.categoryName,
      offer.faceValueUsd?.toString() ?? null,
      offer.priceUsd.toString(),
      offer.stock,
    ],
  );

  if (!row) throw new AppError("internal", { detail: "product upsert returned no row" });
  return mapProduct(row);
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const row = await queryOne(`SELECT * FROM provider_products WHERE id = $1`, [id]);
  return row ? mapProduct(row) : null;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export async function insertQuote(input: {
  userId: string;
  walletAddress: string;
  productId: string;
  intent: OrderIntent;
  paymentAsset: string;
  paymentMint: string;
  paymentAmount: bigint;
  requiredUsdc: bigint;
  providerPriceUsd: bigint;
  routeLabel: string | null;
  jupiterRequestId: string | null;
  networkFeeLamports: bigint;
  unsignedTransaction: string | null;
  senderName: string | null;
  giftMessage: string | null;
  ttlSeconds: number;
}): Promise<QuoteRow> {
  const row = await queryOne(
    `INSERT INTO payment_quotes
       (user_id, wallet_address, product_id, intent, payment_asset, payment_mint,
        payment_amount, required_usdc, provider_price_usd, route_label,
        jupiter_request_id, network_fee_lamports, unsigned_transaction,
        sender_name, gift_message, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
             now() + ($16 || ' seconds')::interval)
     RETURNING *`,
    [
      input.userId,
      input.walletAddress,
      input.productId,
      input.intent,
      input.paymentAsset,
      input.paymentMint,
      input.paymentAmount.toString(),
      input.requiredUsdc.toString(),
      input.providerPriceUsd.toString(),
      input.routeLabel,
      input.jupiterRequestId,
      input.networkFeeLamports.toString(),
      input.unsignedTransaction,
      input.senderName,
      input.giftMessage,
      input.ttlSeconds,
    ],
  );

  if (!row) throw new AppError("internal", { detail: "quote insert returned no row" });
  return mapQuote(row);
}

export async function getQuoteForUser(quoteId: string, userId: string): Promise<QuoteRow> {
  const row = await queryOne(`SELECT * FROM payment_quotes WHERE id = $1 AND user_id = $2`, [
    quoteId,
    userId,
  ]);

  if (!row) throw new AppError("not_found", { detail: "quote not found for user" });
  return mapQuote(row);
}

/**
 * Claims a quote for settlement. Atomic, so two concurrent confirmations of
 * the same quote cannot both proceed to buy a card.
 */
export async function consumeQuote(quoteId: string): Promise<QuoteRow> {
  const row = await queryOne(
    `UPDATE payment_quotes
        SET consumed_at = now()
      WHERE id = $1 AND consumed_at IS NULL AND expires_at > now()
      RETURNING *`,
    [quoteId],
  );

  if (!row) {
    const existing = await queryOne<{ consumed_at: Date | null; expires_at: Date }>(
      `SELECT consumed_at, expires_at FROM payment_quotes WHERE id = $1`,
      [quoteId],
    );
    if (existing?.consumed_at) throw new AppError("quote_used");
    throw new AppError("quote_expired");
  }

  return mapQuote(row);
}

/** Releases a quote when settlement never started, so the user can retry. */
export async function releaseQuote(quoteId: string): Promise<void> {
  await query(`UPDATE payment_quotes SET consumed_at = NULL WHERE id = $1`, [quoteId]);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function insertPayment(input: {
  quoteId: string;
  userId: string;
  walletAddress: string;
  asset: string;
  mint: string;
  amount: bigint;
  signature: string;
}): Promise<string> {
  try {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO payments
         (quote_id, user_id, wallet_address, asset, mint, amount, signature, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'processing')
       RETURNING id`,
      [
        input.quoteId,
        input.userId,
        input.walletAddress,
        input.asset,
        input.mint,
        input.amount.toString(),
        input.signature,
      ],
    );
    if (!row) throw new AppError("internal", { detail: "payment insert returned no row" });
    return row.id;
  } catch (error) {
    if (isUniqueViolation(error, "payments_signature_unique")) {
      throw new AppError("signature_reused", { detail: "signature already settled an order" });
    }
    throw error;
  }
}

export async function markPaymentConfirmed(input: {
  paymentId: string;
  receivedUsdc: bigint;
  slot: number;
}): Promise<void> {
  await query(
    `UPDATE payments
        SET status = 'confirmed', received_usdc = $2, slot = $3, confirmed_at = now()
      WHERE id = $1`,
    [input.paymentId, input.receivedUsdc.toString(), input.slot],
  );
}

export async function markPaymentFailed(paymentId: string, reason: string): Promise<void> {
  await query(`UPDATE payments SET status = 'failed', failure_reason = $2 WHERE id = $1`, [
    paymentId,
    reason.slice(0, 500),
  ]);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function insertOrder(input: {
  userId: string;
  productId: string;
  quoteId: string;
  paymentId: string | null;
  intent: OrderIntent;
  paymentAsset: string;
  paymentAmount: bigint;
  paymentSignature: string | null;
  providerPriceUsd: bigint;
  faceValueUsd: bigint | null;
  idempotencyKey: string;
  status: OrderStatus;
}): Promise<OrderRow> {
  const row = await queryOne(
    `INSERT INTO orders
       (user_id, product_id, quote_id, payment_id, intent, payment_asset, payment_amount,
        payment_signature, provider_price_usd, face_value_usd, idempotency_key, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.userId,
      input.productId,
      input.quoteId,
      input.paymentId,
      input.intent,
      input.paymentAsset,
      input.paymentAmount.toString(),
      input.paymentSignature,
      input.providerPriceUsd.toString(),
      input.faceValueUsd?.toString() ?? null,
      input.idempotencyKey,
      input.status,
    ],
  );

  if (!row) throw new AppError("internal", { detail: "order insert returned no row" });
  return mapOrder(row);
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  statusDetail?: string | null;
  fazercardsOrderId?: string | null;
  incrementAttempts?: boolean;
  fulfilled?: boolean;
}): Promise<OrderRow> {
  const row = await queryOne(
    `UPDATE orders
        SET status = $2,
            status_detail = COALESCE($3, status_detail),
            fazercards_order_id = COALESCE($4, fazercards_order_id),
            provider_attempts = provider_attempts + CASE WHEN $5 THEN 1 ELSE 0 END,
            fulfilled_at = CASE WHEN $6 THEN COALESCE(fulfilled_at, now()) ELSE fulfilled_at END,
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [
      input.orderId,
      input.status,
      input.statusDetail?.slice(0, 500) ?? null,
      input.fazercardsOrderId ?? null,
      input.incrementAttempts ?? false,
      input.fulfilled ?? false,
    ],
  );

  if (!row) throw new AppError("not_found", { detail: "order not found" });
  return mapOrder(row);
}

export async function attachRedemptionData(input: {
  orderId: string;
  encrypted: string;
  fazercardsOrderId: string | null;
}): Promise<OrderRow> {
  const row = await queryOne(
    `UPDATE orders
        SET encrypted_redemption_data = $2,
            fazercards_order_id = COALESCE($3, fazercards_order_id),
            status = 'ready',
            fulfilled_at = COALESCE(fulfilled_at, now()),
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [input.orderId, input.encrypted, input.fazercardsOrderId],
  );

  if (!row) throw new AppError("not_found", { detail: "order not found" });
  return mapOrder(row);
}

export async function markOrderRevealed(orderId: string): Promise<void> {
  await query(`UPDATE orders SET revealed_at = COALESCE(revealed_at, now()) WHERE id = $1`, [
    orderId,
  ]);
}

export async function getOrder(orderId: string): Promise<OrderRow | null> {
  const row = await queryOne(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  return row ? mapOrder(row) : null;
}

/** Owner-scoped read. Used by every route that can expose order contents. */
export async function getOrderForUser(orderId: string, userId: string): Promise<OrderRow> {
  const row = await queryOne(`SELECT * FROM orders WHERE id = $1 AND user_id = $2`, [
    orderId,
    userId,
  ]);
  if (!row) throw new AppError("not_found", { detail: "order not found for user" });
  return mapOrder(row);
}

export async function getOrderByProviderId(providerOrderId: string): Promise<OrderRow | null> {
  const row = await queryOne(`SELECT * FROM orders WHERE fazercards_order_id = $1`, [
    providerOrderId,
  ]);
  return row ? mapOrder(row) : null;
}

export interface OrderWithProduct {
  order: OrderRow;
  product: ProductRow;
  gift: GiftRow | null;
}

export async function listOrdersForUser(
  userId: string,
  intent: OrderIntent,
): Promise<OrderWithProduct[]> {
  const rows = await query(
    `SELECT o.*, 
            p.id AS p_id, p.category_id, p.card_id, p.name, p.category_name,
            p.face_value_usd AS p_face_value_usd, p.price_usd,
            g.id AS g_id, g.order_id AS g_order_id, g.sender_user_id, g.sender_name,
            g.message, g.encrypted_claim_token, g.status AS g_status,
            g.claimed_at, g.created_at AS g_created_at
       FROM orders o
       JOIN provider_products p ON p.id = o.product_id
       LEFT JOIN coffee_gifts g ON g.order_id = o.id
      WHERE o.user_id = $1 AND o.intent = $2
      ORDER BY o.created_at DESC
      LIMIT 100`,
    [userId, intent],
  );

  return rows.map((row) => ({
    order: mapOrder(row),
    product: mapProduct({
      id: row.p_id,
      category_id: row.category_id,
      card_id: row.card_id,
      name: row.name,
      category_name: row.category_name,
      face_value_usd: row.p_face_value_usd,
      price_usd: row.price_usd,
    }),
    gift: row.g_id
      ? mapGift({
          id: row.g_id,
          order_id: row.g_order_id,
          sender_user_id: row.sender_user_id,
          sender_name: row.sender_name,
          message: row.message,
          encrypted_claim_token: row.encrypted_claim_token,
          status: row.g_status,
          claimed_at: row.claimed_at,
          created_at: row.g_created_at,
        })
      : null,
  }));
}

/** Orders stuck mid-fulfilment, for the recovery sweep. */
export async function listUnsettledOrders(limit = 25): Promise<OrderRow[]> {
  const rows = await query(
    `SELECT * FROM orders
      WHERE status IN ('payment_confirmed', 'provider_processing')
        AND created_at > now() - interval '7 days'
      ORDER BY created_at ASC
      LIMIT $1`,
    [limit],
  );
  return rows.map(mapOrder);
}

// ---------------------------------------------------------------------------
// Gifts
// ---------------------------------------------------------------------------

export async function insertGift(input: {
  orderId: string;
  senderUserId: string;
  senderName: string | null;
  message: string | null;
  claimTokenHash: string;
  encryptedClaimToken: string;
  status: GiftStatus;
}): Promise<GiftRow> {
  const row = await queryOne(
    `INSERT INTO coffee_gifts
       (order_id, sender_user_id, sender_name, message, claim_token_hash, encrypted_claim_token, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status
     RETURNING *`,
    [
      input.orderId,
      input.senderUserId,
      input.senderName,
      input.message,
      input.claimTokenHash,
      input.encryptedClaimToken,
      input.status,
    ],
  );

  if (!row) throw new AppError("internal", { detail: "gift insert returned no row" });
  return mapGift(row);
}

export async function markGiftReady(orderId: string): Promise<void> {
  await query(
    `UPDATE coffee_gifts SET status = 'ready' WHERE order_id = $1 AND status = 'pending'`,
    [orderId],
  );
}

export interface GiftWithContext {
  gift: GiftRow;
  order: OrderRow;
  product: ProductRow;
}

export async function getGiftByTokenHash(hash: string): Promise<GiftWithContext | null> {
  const row = await queryOne(
    `SELECT g.*, 
            o.id AS o_id, o.user_id, o.product_id, o.quote_id, o.payment_id, o.intent,
            o.payment_asset, o.payment_amount, o.payment_signature, o.provider_price_usd,
            o.face_value_usd, o.fazercards_order_id, o.idempotency_key, o.status AS o_status,
            o.status_detail, o.provider_attempts, o.encrypted_redemption_data,
            o.revealed_at, o.created_at AS o_created_at, o.fulfilled_at,
            p.id AS p_id, p.category_id, p.card_id, p.name, p.category_name,
            p.face_value_usd AS p_face_value_usd, p.price_usd
       FROM coffee_gifts g
       JOIN orders o ON o.id = g.order_id
       JOIN provider_products p ON p.id = o.product_id
      WHERE g.claim_token_hash = $1`,
    [hash],
  );

  if (!row) return null;

  return {
    gift: mapGift(row),
    order: mapOrder({
      id: row.o_id,
      user_id: row.user_id,
      product_id: row.product_id,
      quote_id: row.quote_id,
      payment_id: row.payment_id,
      intent: row.intent,
      payment_asset: row.payment_asset,
      payment_amount: row.payment_amount,
      payment_signature: row.payment_signature,
      provider_price_usd: row.provider_price_usd,
      face_value_usd: row.face_value_usd,
      fazercards_order_id: row.fazercards_order_id,
      idempotency_key: row.idempotency_key,
      status: row.o_status,
      status_detail: row.status_detail,
      provider_attempts: row.provider_attempts,
      encrypted_redemption_data: row.encrypted_redemption_data,
      revealed_at: row.revealed_at,
      created_at: row.o_created_at,
      fulfilled_at: row.fulfilled_at,
    }),
    product: mapProduct({
      id: row.p_id,
      category_id: row.category_id,
      card_id: row.card_id,
      name: row.name,
      category_name: row.category_name,
      face_value_usd: row.p_face_value_usd,
      price_usd: row.price_usd,
    }),
  };
}

/**
 * Single-use claim, enforced by the database rather than by application logic.
 *
 * `SELECT ... FOR UPDATE` serialises concurrent claims of the same token: the
 * first transaction flips the row to `claimed`, every later one sees the new
 * state and is rejected. Two people opening the same link at the same instant
 * cannot both receive the card.
 */
export async function claimGift(hash: string): Promise<{ giftId: string; orderId: string }> {
  return transaction(async (client: PoolClient) => {
    const locked = await client.query(
      `SELECT g.id, g.order_id, g.status, o.status AS order_status
         FROM coffee_gifts g
         JOIN orders o ON o.id = g.order_id
        WHERE g.claim_token_hash = $1
        FOR UPDATE OF g`,
      [hash],
    );

    const row = locked.rows[0] as
      | { id: string; order_id: string; status: GiftStatus; order_status: OrderStatus }
      | undefined;

    if (!row) throw new AppError("not_found", { detail: "claim token not found" });
    if (row.status === "claimed") throw new AppError("already_claimed");
    if (row.order_status !== "ready") throw new AppError("gift_not_ready");

    await client.query(
      `UPDATE coffee_gifts SET status = 'claimed', claimed_at = now() WHERE id = $1`,
      [row.id],
    );
    await client.query(
      `UPDATE orders SET status = 'claimed', updated_at = now() WHERE id = $1`,
      [row.order_id],
    );

    return { giftId: row.id, orderId: row.order_id };
  });
}

// ---------------------------------------------------------------------------
// Webhook events
// ---------------------------------------------------------------------------

/** Returns false when this delivery has already been recorded. */
export async function recordWebhookEvent(input: {
  eventId: string;
  eventType: string;
  providerOrderId: string | null;
  payload: unknown;
}): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO webhook_events (event_id, event_type, provider_order_id, payload)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id`,
    [input.eventId, input.eventType, input.providerOrderId, JSON.stringify(input.payload)],
  );

  return row !== null;
}

export async function markWebhookProcessed(eventId: string, error?: string): Promise<void> {
  await query(
    `UPDATE webhook_events SET processed_at = now(), process_error = $2 WHERE event_id = $1`,
    [eventId, error?.slice(0, 500) ?? null],
  );
}

/** Postgres `unique_violation` (23505) against a named constraint. */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as { code?: string; constraint?: string; message?: string };
  if (record.code !== "23505") return false;
  return record.constraint === constraint || Boolean(record.message?.includes(constraint));
}

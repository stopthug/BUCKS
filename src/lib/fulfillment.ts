import "server-only";

import { createClaimToken, createIdempotencyKey } from "@/lib/crypto/tokens";
import { decryptString, encryptJson, encryptString, hashToken } from "@/lib/crypto/encryption";
import {
  attachRedemptionData,
  consumeQuote,
  getOrder,
  getProduct,
  insertGift,
  insertOrder,
  insertPayment,
  markGiftReady,
  markPaymentConfirmed,
  markPaymentFailed,
  releaseQuote,
  updateOrderStatus,
  type OrderRow,
  type QuoteRow,
} from "@/lib/db/queries";
import { env } from "@/lib/env";
import { AppError, redact } from "@/lib/errors";
import { toAppError } from "@/lib/fazer/client";
import { createGiftCardOrder, getProviderOrder } from "@/lib/fazer/orders";
import type { ProviderOrder, RedemptionCard } from "@/lib/fazer/types";
import { executeJupiterOrder } from "@/lib/jupiter/client";
import { getUsdcAsset } from "@/lib/solana/assets";
import { submitSignedTransaction } from "@/lib/solana/transfer";
import { verifyPayment } from "@/lib/solana/verify";

/**
 * Settlement pipeline.
 *
 * Order of operations is deliberate and each step is durable:
 *
 *   1. claim the quote (atomic, single use)
 *   2. land the signed transaction
 *   3. record the payment keyed by its signature (unique)
 *   4. verify the payment against the chain
 *   5. create the order row with its idempotency key
 *   6. buy the card from the provider using that key
 *
 * Steps 5 and 6 are in that order so a provider call can always be retried
 * with the key we already stored. If step 6 ultimately fails after step 4
 * succeeded, the order lands in `refund_required` rather than disappearing.
 */

export interface SettlementInput {
  userId: string;
  walletAddress: string;
  quoteId: string;
  /** Base64 signed transaction from the wallet. */
  signedTransaction: string;
}

export interface SettlementResult {
  orderId: string;
  status: OrderRow["status"];
  signature: string;
  /** Present for gift orders once the card is fulfilled. */
  claimUrl?: string;
}

export async function settlePayment(input: SettlementInput): Promise<SettlementResult> {
  // 1 — claim the quote. Throws if expired or already used.
  const quote = await consumeQuote(input.quoteId);

  if (quote.userId !== input.userId || quote.walletAddress !== input.walletAddress) {
    throw new AppError("forbidden", { detail: "quote belongs to another wallet" });
  }

  const product = await getProduct(quote.productId);
  if (!product) throw new AppError("internal", { detail: "quote references a missing product" });

  // 2 — land the transaction.
  let signature: string;
  try {
    signature = await landTransaction(quote, input.signedTransaction);
  } catch (error) {
    // Nothing was settled, so the quote is handed back for a clean retry.
    await releaseQuote(quote.id).catch(() => undefined);
    throw error;
  }

  // 3 — record the payment. The unique index on `signature` is what makes a
  // replayed transaction impossible to reuse for a second card.
  const paymentId = await insertPayment({
    quoteId: quote.id,
    userId: quote.userId,
    walletAddress: quote.walletAddress,
    asset: quote.paymentAsset,
    mint: quote.paymentMint,
    amount: quote.paymentAmount,
    signature,
  });

  // 4 — verify onchain. The client's opinion of success is irrelevant here.
  const usdc = await getUsdcAsset();
  let verification;
  try {
    verification = await verifyPayment({
      signature,
      expectedPayer: quote.walletAddress,
      expectedInputMint: quote.paymentMint,
      treasuryOwner: env().TREASURY_WALLET,
      usdcMint: usdc.mint,
      requiredUsdc: quote.requiredUsdc,
    });
  } catch (error) {
    await markPaymentFailed(paymentId, error instanceof AppError ? error.code : redact(error));
    throw error;
  }

  await markPaymentConfirmed({
    paymentId,
    receivedUsdc: verification.receivedUsdc,
    slot: verification.slot,
  });

  // 5 — persist the order and its idempotency key *before* touching the provider.
  const order = await insertOrder({
    userId: quote.userId,
    productId: product.id,
    quoteId: quote.id,
    paymentId,
    intent: quote.intent,
    paymentAsset: quote.paymentAsset,
    paymentAmount: quote.paymentAmount,
    paymentSignature: signature,
    providerPriceUsd: quote.providerPriceUsd,
    faceValueUsd: product.faceValueUsd,
    idempotencyKey: createIdempotencyKey(),
    status: "payment_confirmed",
  });

  // 6 — buy the card.
  const fulfilled = await fulfillOrder(order.id);

  const result: SettlementResult = {
    orderId: order.id,
    status: fulfilled.status,
    signature,
  };

  if (quote.intent === "gift") {
    const claimUrl = await ensureGift(fulfilled, quote);
    if (claimUrl) result.claimUrl = claimUrl;
  }

  return result;
}

async function landTransaction(quote: QuoteRow, signedTransaction: string): Promise<string> {
  // USDC never routes through a swap, so it is submitted straight to the RPC.
  if (quote.paymentAsset === "USDC") {
    return submitSignedTransaction({ signedTransaction });
  }

  if (!quote.jupiterRequestId) {
    throw new AppError("quote_expired", { detail: "swap quote has no Jupiter request id" });
  }

  const executed = await executeJupiterOrder({
    requestId: quote.jupiterRequestId,
    signedTransaction,
  });

  if (!executed.signature) {
    throw new AppError("transaction_failed", { detail: "Jupiter execute returned no signature" });
  }

  return executed.signature;
}

/**
 * Buys the gift card. Safe to call repeatedly: the provider is addressed with
 * the order's stored idempotency key, so a retry returns the original purchase
 * instead of making a new one.
 */
export async function fulfillOrder(orderId: string): Promise<OrderRow> {
  const order = await getOrder(orderId);
  if (!order) throw new AppError("not_found", { detail: "order not found" });

  if (order.status === "ready" || order.status === "claimed") return order;

  if (order.status !== "payment_confirmed" && order.status !== "provider_processing") {
    throw new AppError("internal", {
      detail: `cannot fulfil an order in state ${order.status}`,
    });
  }

  const product = await getProduct(order.productId);
  if (!product) throw new AppError("internal", { detail: "order references a missing product" });

  let providerOrder: ProviderOrder;
  try {
    providerOrder = await createGiftCardOrder({
      categoryId: product.categoryId,
      cardId: product.cardId,
      quantity: 1,
      idempotencyKey: order.idempotencyKey,
    });
  } catch (error) {
    const appError = toAppError(error);

    // The money is already ours. A provider timeout is not a failed purchase:
    // the order may well exist on their side, so it stays in flight and the
    // recovery sweep replays the same idempotency key.
    if (appError.code === "provider_timeout" || appError.code === "rate_limited") {
      return updateOrderStatus({
        orderId: order.id,
        status: "provider_processing",
        statusDetail: `provider unreachable: ${appError.code}`,
        incrementAttempts: true,
      });
    }

    // A definitive provider rejection with a confirmed payment is the one case
    // that must never be swallowed.
    return updateOrderStatus({
      orderId: order.id,
      status: "refund_required",
      statusDetail: `provider rejected the order: ${appError.detail ?? appError.code}`,
      incrementAttempts: true,
    });
  }

  return applyProviderOrder(order.id, providerOrder);
}

/** Folds a provider order response into our order state. */
export async function applyProviderOrder(
  orderId: string,
  providerOrder: ProviderOrder,
): Promise<OrderRow> {
  if (providerOrder.status === "completed" && providerOrder.cards.length > 0) {
    const encrypted = encryptJson({
      cards: providerOrder.cards,
      providerOrderId: providerOrder.id,
      storedAt: new Date().toISOString(),
    } satisfies StoredRedemption);

    const order = await attachRedemptionData({
      orderId,
      encrypted,
      fazercardsOrderId: providerOrder.id,
    });

    if (order.intent === "gift") await markGiftReady(order.id);
    return order;
  }

  if (providerOrder.status === "failed") {
    return updateOrderStatus({
      orderId,
      status: "refund_required",
      statusDetail: "provider reported the order as failed",
      fazercardsOrderId: providerOrder.id,
    });
  }

  if (providerOrder.status === "refunded") {
    return updateOrderStatus({
      orderId,
      status: "refund_required",
      statusDetail: "provider refunded the order",
      fazercardsOrderId: providerOrder.id,
    });
  }

  // Completed but without codes, or still processing: keep polling.
  return updateOrderStatus({
    orderId,
    status: "provider_processing",
    statusDetail: `provider status: ${providerOrder.status}`,
    fazercardsOrderId: providerOrder.id,
    incrementAttempts: true,
  });
}

export interface StoredRedemption {
  cards: RedemptionCard[];
  providerOrderId: string | null;
  storedAt: string;
}

/**
 * Advances an in-flight order. Called when a customer looks at their order,
 * and by the webhook handler. Re-issues the provider request with the original
 * idempotency key when we never got an order id back.
 */
export async function refreshOrder(orderId: string): Promise<OrderRow> {
  const order = await getOrder(orderId);
  if (!order) throw new AppError("not_found", { detail: "order not found" });

  if (order.status === "ready" || order.status === "claimed") return order;
  if (order.status !== "provider_processing" && order.status !== "payment_confirmed") return order;

  // No provider order id means the create call never came back. Replaying it
  // with the same key either returns the original order or places it once.
  if (!order.fazercardsOrderId) return fulfillOrder(order.id);

  try {
    const providerOrder = await getProviderOrder(order.fazercardsOrderId);
    return applyProviderOrder(order.id, providerOrder);
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === "provider_timeout") return order;
    throw appError;
  }
}

/**
 * Creates the shareable claim link for a gift order. The token is generated
 * once, stored only as a hash for lookup plus a ciphertext so the sender can
 * re-copy their own link, and never appears in a log or a URL we record.
 */
async function ensureGift(order: OrderRow, quote: QuoteRow): Promise<string> {
  const token = createClaimToken();

  const gift = await insertGift({
    orderId: order.id,
    senderUserId: order.userId,
    senderName: quote.senderName,
    message: quote.giftMessage,
    claimTokenHash: hashToken(token),
    encryptedClaimToken: encryptString(token),
    status: order.status === "ready" ? "ready" : "pending",
  });

  // On a retry the insert conflicts on `order_id` and keeps the original
  // token, so the link always comes from what is stored rather than from the
  // token we just generated.
  return claimUrlFromGift(gift.encryptedClaimToken);
}

export function claimUrl(token: string): string {
  return `${env().APP_URL.replace(/\/$/, "")}/g/${token}`;
}

export function claimUrlFromGift(encryptedClaimToken: string): string {
  return claimUrl(decryptString(encryptedClaimToken));
}

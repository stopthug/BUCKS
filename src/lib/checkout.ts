import "server-only";

import { randomUUID } from "node:crypto";

import QRCode from "qrcode";

import { GIFT_MESSAGE_MAX_LENGTH, GIFT_NAME_MAX_LENGTH, RECEIPT_EMAIL_MAX_LENGTH } from "@/lib/checkout-limits";
import { insertQuote, upsertProduct, type OrderIntent, type QuoteRow } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { AppError, isAppError } from "@/lib/errors";
import { assertFulfillable, getLiveOffer, type CoffeeOffer } from "@/lib/fazer/catalog";
import { getJupiterUsdPrice } from "@/lib/jupiter/client";
import { quoteCoffeePayment } from "@/lib/jupiter/pricing";
import { USD_DECIMALS, addBasisPoints, ceilToFractionDigits, divideCeil, parseDecimalToBaseUnits, toUiAmount, PAYMENT_UI_DECIMALS } from "@/lib/money";
import { getAsset, getUsdcAsset, type AssetConfig } from "@/lib/solana/assets";

/**
 * Quote construction for wallet-free checkout.
 *
 * The provider has to be able to fulfil the card before a user is asked to send
 * anything. Amounts are computed here, stored, and identified on-chain by an
 * exact unique `payment_amount` plus memo `bucks:{quoteId}`. The client never
 * signs a transaction in this app — it shows a Solana Pay QR to the treasury.
 */

/** Watch window: long enough to send from an external wallet. */
const QUOTE_TTL_SECONDS = 600;

export const PLATFORM_FEE_USD = 0n;

export { GIFT_MESSAGE_MAX_LENGTH, GIFT_NAME_MAX_LENGTH, RECEIPT_EMAIL_MAX_LENGTH };

export interface CheckoutQuote {
  quoteId: string;
  expiresAt: string;
  createdAt: string;
  asset: {
    symbol: string;
    label: string;
    decimals: number;
  };
  /** Input amount in the payment asset's base units, as a string. */
  payAmount: string;
  /** Exact UI amount to send / copy. No grouping. */
  payAmountUi: string;
  treasuryAddress: string;
  paymentMemo: string;
  solanaPayUrl: string;
  qrDataUrl: string;
  receiptEmail: string | null;
  card: {
    name: string;
    categoryName: string;
    faceValueUsd: string | null;
    providerPriceUsd: string;
  };
  costs: {
    platformFeeUsd: string;
    networkFeeLamports: string;
    expectedUsdc: string;
    guaranteedUsdc: string;
    routeLabel: string | null;
    slippageBps: number | null;
    routerFeeBps: number | null;
  };
}

export interface CreateQuoteInput {
  userId: string;
  categoryId: string;
  cardId: string;
  assetSymbol: string;
  intent: OrderIntent;
  senderName?: string | null;
  message?: string | null;
  receiptEmail?: string | null;
}

export async function createCheckoutQuote(input: CreateQuoteInput): Promise<CheckoutQuote> {
  const offer = await getLiveOffer(input.categoryId, input.cardId);
  await assertFulfillable(offer, 1);

  const product = await upsertProduct(offer);

  const asset = await getAsset(input.assetSymbol);
  const usdc = await getUsdcAsset();
  const requiredUsdc = scaleUsd(offer.priceUsd, usdc.decimals);

  const senderName = sanitiseName(input.senderName);
  const message = sanitiseMessage(input.message);
  const receiptEmail = sanitiseEmail(input.receiptEmail);

  const quoteId = randomUUID();
  const paymentMemo = `bucks:${quoteId}`;
  const suffix = uniqueAmountSuffix(quoteId, asset.decimals);

  const settlement =
    asset.symbol === "USDC"
      ? quoteDirectUsdc(requiredUsdc, suffix, asset.decimals)
      : await quotePaymentAsset({ asset, usdc, requiredUsdc, suffix });

  const quote = await insertQuote({
    id: quoteId,
    userId: input.userId,
    walletAddress: null,
    productId: product.id,
    intent: input.intent,
    paymentAsset: asset.symbol,
    paymentMint: asset.mint,
    paymentAmount: settlement.payAmount,
    requiredUsdc,
    providerPriceUsd: offer.priceUsd,
    routeLabel: settlement.routeLabel,
    jupiterRequestId: settlement.jupiterRequestId,
    networkFeeLamports: settlement.networkFeeLamports,
    unsignedTransaction: null,
    senderName: input.intent === "gift" ? senderName : null,
    giftMessage: input.intent === "gift" ? message : null,
    receiptEmail,
    paymentMemo,
    ttlSeconds: QUOTE_TTL_SECONDS,
  });

  return toCheckoutQuote({ quote, offer, asset, settlement, paymentMemo, receiptEmail });
}

interface Settlement {
  payAmount: bigint;
  routeLabel: string | null;
  jupiterRequestId: string | null;
  networkFeeLamports: bigint;
  expectedUsdc: bigint;
  guaranteedUsdc: bigint;
  slippageBps: number | null;
  routerFeeBps: number | null;
}

function quoteDirectUsdc(requiredUsdc: bigint, suffix: bigint, decimals: number): Settlement {
  return {
    payAmount: ceilToFractionDigits(requiredUsdc, decimals, PAYMENT_UI_DECIMALS) + suffix,
    routeLabel: null,
    jupiterRequestId: null,
    networkFeeLamports: 0n,
    expectedUsdc: requiredUsdc,
    guaranteedUsdc: requiredUsdc,
    slippageBps: null,
    routerFeeBps: null,
  };
}

async function quotePaymentAsset(args: {
  asset: AssetConfig;
  usdc: AssetConfig;
  requiredUsdc: bigint;
  suffix: bigint;
}): Promise<Settlement> {
  try {
    return await quoteViaJupiter(args);
  } catch (error) {
    if (isAppError(error) && (error.code === "no_route" || error.code === "liquidity_unavailable")) {
      return quoteDirectFromSpot(args);
    }
    throw error;
  }
}

async function quoteViaJupiter(args: {
  asset: AssetConfig;
  usdc: AssetConfig;
  requiredUsdc: bigint;
  suffix: bigint;
}): Promise<Settlement> {
  const { asset, usdc, requiredUsdc, suffix } = args;

  const quote = await quoteCoffeePayment({
    asset,
    usdcMint: usdc.mint,
    requiredUsdc,
  });

  return {
    payAmount: ceilToFractionDigits(quote.inAmount, asset.decimals, PAYMENT_UI_DECIMALS) + suffix,
    routeLabel: quote.routeLabel,
    jupiterRequestId: quote.requestId,
    networkFeeLamports: 0n,
    expectedUsdc: quote.expectedUsdc,
    guaranteedUsdc: quote.guaranteedUsdc,
    slippageBps: quote.slippageBps,
    routerFeeBps: quote.routerFeeBps,
  };
}

/** Direct send-to-treasury amount from a spot USD price (used for xStocks). */
async function quoteDirectFromSpot(args: {
  asset: AssetConfig;
  usdc: AssetConfig;
  requiredUsdc: bigint;
  suffix: bigint;
}): Promise<Settlement> {
  const { asset, usdc, requiredUsdc, suffix } = args;
  const usdPrice = await getJupiterUsdPrice(asset.mint);
  const priceUsdc = parseDecimalToBaseUnits(usdPrice.toFixed(usdc.decimals), usdc.decimals);
  const buffered = addBasisPoints(requiredUsdc, 100);
  const payAmount =
    ceilToFractionDigits(
      divideCeil(buffered * 10n ** BigInt(asset.decimals), priceUsdc),
      asset.decimals,
      PAYMENT_UI_DECIMALS,
    ) + suffix;

  return {
    payAmount,
    routeLabel: "spot",
    jupiterRequestId: null,
    networkFeeLamports: 0n,
    expectedUsdc: requiredUsdc,
    guaranteedUsdc: requiredUsdc,
    slippageBps: 100,
    routerFeeBps: null,
  };
}

/**
 * Extra units at 4 displayed decimals so two identical cards still produce
 * distinct on-chain amounts the watcher can match.
 */
function uniqueAmountSuffix(quoteId: string, decimals: number): bigint {
  const display = Math.min(PAYMENT_UI_DECIMALS, decimals);
  const factor = 10n ** BigInt(decimals - display);
  const hex = quoteId.replace(/-/g, "").slice(0, 4);
  const value = BigInt(`0x${hex}`);
  const tick = value % 99n;
  return (tick === 0n ? 1n : tick) * factor;
}

function solanaPayUrl(args: {
  recipient: string;
  amountUi: string;
  memo: string;
  splToken?: string;
}): string {
  const params = new URLSearchParams();
  params.set("amount", args.amountUi);
  if (args.splToken) params.set("spl-token", args.splToken);
  params.set("memo", args.memo);
  return `solana:${args.recipient}?${params.toString()}`;
}

async function qrDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: "M",
      color: { dark: "#2c2416", light: "#fff8ee" },
    });
  } catch {
    return "";
  }
}

async function toCheckoutQuote(args: {
  quote: QuoteRow;
  offer: CoffeeOffer;
  asset: AssetConfig;
  settlement: Settlement;
  paymentMemo: string;
  receiptEmail: string | null;
}): Promise<CheckoutQuote> {
  const { quote, offer, asset, settlement, paymentMemo, receiptEmail } = args;
  const treasuryAddress = env().TREASURY_WALLET;
  const payAmountUi = toUiAmount(settlement.payAmount, asset.decimals);
  const payUrl = solanaPayUrl({
    recipient: treasuryAddress,
    amountUi: payAmountUi,
    memo: paymentMemo,
    splToken: asset.isNative ? undefined : asset.mint,
  });

  return {
    quoteId: quote.id,
    expiresAt: quote.expiresAt.toISOString(),
    createdAt: quote.createdAt.toISOString(),
    asset: { symbol: asset.symbol, label: asset.label, decimals: asset.decimals },
    payAmount: settlement.payAmount.toString(),
    payAmountUi,
    treasuryAddress,
    paymentMemo,
    solanaPayUrl: payUrl,
    qrDataUrl: await qrDataUrl(payUrl),
    receiptEmail,
    card: {
      name: offer.name,
      categoryName: offer.categoryName,
      faceValueUsd: offer.faceValueUsd?.toString() ?? null,
      providerPriceUsd: offer.priceUsd.toString(),
    },
    costs: {
      platformFeeUsd: PLATFORM_FEE_USD.toString(),
      networkFeeLamports: settlement.networkFeeLamports.toString(),
      expectedUsdc: settlement.expectedUsdc.toString(),
      guaranteedUsdc: settlement.guaranteedUsdc.toString(),
      routeLabel: settlement.routeLabel,
      slippageBps: settlement.slippageBps,
      routerFeeBps: settlement.routerFeeBps,
    },
  };
}

/** Rescales a 6-decimal USD amount to the USDC mint's actual decimals. */
function scaleUsd(amountUsd: bigint, usdcDecimals: number): bigint {
  if (usdcDecimals === USD_DECIMALS) return amountUsd;
  if (usdcDecimals > USD_DECIMALS) {
    return amountUsd * 10n ** BigInt(usdcDecimals - USD_DECIMALS);
  }
  const divisor = 10n ** BigInt(USD_DECIMALS - usdcDecimals);
  return (amountUsd + divisor - 1n) / divisor;
}

/**
 * Gift text is user-authored and ends up on a public claim page, so it is
 * stripped to plain printable text here. React escapes on render too; this is
 * about what we agree to store.
 */
export function sanitiseMessage(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = stripUnsafe(value);
  if (!cleaned) return null;
  if (cleaned.length > GIFT_MESSAGE_MAX_LENGTH) {
    throw new AppError("message_too_long", { detail: `${cleaned.length} characters` });
  }
  return cleaned;
}

export function sanitiseName(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = stripUnsafe(value).slice(0, GIFT_NAME_MAX_LENGTH);
  return cleaned || null;
}

export function sanitiseEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.normalize("NFKC").trim().toLowerCase();
  if (!cleaned) return null;
  if (cleaned.length > RECEIPT_EMAIL_MAX_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    throw new AppError("invalid_request", { detail: "email" });
  }
  return cleaned;
}

function stripUnsafe(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

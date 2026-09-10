import "server-only";

import { GIFT_MESSAGE_MAX_LENGTH, GIFT_NAME_MAX_LENGTH } from "@/lib/checkout-limits";
import { insertQuote, upsertProduct, type OrderIntent, type QuoteRow } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { assertFulfillable, getLiveOffer, type CoffeeOffer } from "@/lib/fazer/catalog";
import { quoteCoffeePayment } from "@/lib/jupiter/pricing";
import { USD_DECIMALS } from "@/lib/money";
import { getAsset, getUsdcAsset, type AssetConfig } from "@/lib/solana/assets";
import { getAssetBalance } from "@/lib/solana/balances";
import { buildUsdcTransfer } from "@/lib/solana/transfer";

/**
 * Quote construction.
 *
 * Two rules shape this file. First, the provider has to be able to fulfil the
 * card *before* a user is asked to sign anything — checking stock and reseller
 * float afterwards would mean taking money we cannot honour. Second, every
 * amount is computed here on the server and stored; the client receives
 * display values and an opaque quote id, and can influence neither.
 */

/** Short enough that a stale swap route cannot be signed. */
const QUOTE_TTL_SECONDS = 75;
/** Lamports kept aside so a wallet is never left unable to pay a signature fee. */
const LAMPORT_FEE_RESERVE = 15_000n;

/** $BUCKS takes nothing. External costs are itemised instead of marked up. */
export const PLATFORM_FEE_USD = 0n;

export { GIFT_MESSAGE_MAX_LENGTH, GIFT_NAME_MAX_LENGTH };

export interface CheckoutQuote {
  quoteId: string;
  expiresAt: string;
  /** Base64 transaction for the wallet to sign. */
  transaction: string;
  asset: {
    symbol: string;
    label: string;
    decimals: number;
  };
  /** Input amount in the payment asset's base units, as a string. */
  payAmount: string;
  card: {
    name: string;
    categoryName: string;
    /** Base units of USD (6dp), as strings. */
    faceValueUsd: string | null;
    providerPriceUsd: string;
  };
  costs: {
    platformFeeUsd: string;
    networkFeeLamports: string;
    /** Expected USDC delivered to settlement, base units. */
    expectedUsdc: string;
    /** Minimum USDC the payment guarantees. */
    guaranteedUsdc: string;
    routeLabel: string | null;
    slippageBps: number | null;
    routerFeeBps: number | null;
  };
}

export interface CreateQuoteInput {
  userId: string;
  walletAddress: string;
  categoryId: string;
  cardId: string;
  assetSymbol: string;
  intent: OrderIntent;
  senderName?: string | null;
  message?: string | null;
}

export async function createCheckoutQuote(input: CreateQuoteInput): Promise<CheckoutQuote> {
  // 1 — live offer, live stock, live reseller balance.
  const offer = await getLiveOffer(input.categoryId, input.cardId);
  await assertFulfillable(offer, 1);

  const product = await upsertProduct(offer);

  const asset = await getAsset(input.assetSymbol);
  const usdc = await getUsdcAsset();
  const requiredUsdc = scaleUsd(offer.priceUsd, usdc.decimals);

  const senderName = sanitiseName(input.senderName);
  const message = sanitiseMessage(input.message);

  const settlement =
    asset.symbol === "USDC"
      ? await quoteDirectUsdc({ asset, input, requiredUsdc })
      : await quoteViaJupiter({ asset, usdc, input, requiredUsdc });

  // 2 — persist the authoritative numbers.
  const quote = await insertQuote({
    userId: input.userId,
    walletAddress: input.walletAddress,
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
    unsignedTransaction: settlement.transaction,
    senderName: input.intent === "gift" ? senderName : null,
    giftMessage: input.intent === "gift" ? message : null,
    ttlSeconds: QUOTE_TTL_SECONDS,
  });

  return toCheckoutQuote({ quote, offer, asset, settlement });
}

interface Settlement {
  payAmount: bigint;
  transaction: string;
  routeLabel: string | null;
  jupiterRequestId: string | null;
  networkFeeLamports: bigint;
  expectedUsdc: bigint;
  guaranteedUsdc: bigint;
  slippageBps: number | null;
  routerFeeBps: number | null;
}

/** USDC already is the settlement asset, so it moves as a plain transfer. */
async function quoteDirectUsdc(args: {
  asset: AssetConfig;
  input: CreateQuoteInput;
  requiredUsdc: bigint;
}): Promise<Settlement> {
  const { asset, input, requiredUsdc } = args;

  const balance = await getAssetBalance(input.walletAddress, asset);
  if (balance < requiredUsdc) {
    throw new AppError("insufficient_balance", { detail: "USDC balance below card price" });
  }

  const transfer = await buildUsdcTransfer({
    payer: input.walletAddress,
    treasury: env().TREASURY_WALLET,
    usdcMint: asset.mint,
    usdcDecimals: asset.decimals,
    amount: requiredUsdc,
    reference: `${input.categoryId}:${input.cardId}`,
  });

  return {
    payAmount: requiredUsdc,
    transaction: transfer.transaction,
    routeLabel: null,
    jupiterRequestId: null,
    networkFeeLamports: transfer.estimatedFeeLamports,
    expectedUsdc: requiredUsdc,
    guaranteedUsdc: requiredUsdc,
    slippageBps: null,
    routerFeeBps: null,
  };
}

async function quoteViaJupiter(args: {
  asset: AssetConfig;
  usdc: AssetConfig;
  input: CreateQuoteInput;
  requiredUsdc: bigint;
}): Promise<Settlement> {
  const { asset, usdc, input, requiredUsdc } = args;

  const quote = await quoteCoffeePayment({
    asset,
    usdcMint: usdc.mint,
    requiredUsdc,
    taker: input.walletAddress,
    receiver: env().TREASURY_WALLET,
  });

  if (!quote.transaction) {
    throw new AppError("no_route", { detail: "Jupiter returned no transaction to sign" });
  }

  await assertWalletCanPay({
    walletAddress: input.walletAddress,
    asset,
    amount: quote.inAmount,
    networkFeeLamports: quote.networkFeeLamports,
  });

  return {
    payAmount: quote.inAmount,
    transaction: quote.transaction,
    routeLabel: quote.routeLabel,
    jupiterRequestId: quote.requestId,
    networkFeeLamports: quote.networkFeeLamports,
    expectedUsdc: quote.expectedUsdc,
    guaranteedUsdc: quote.guaranteedUsdc,
    slippageBps: quote.slippageBps,
    routerFeeBps: quote.routerFeeBps,
  };
}

/**
 * Distinguishes "you don't hold enough of this token" from "you hold enough
 * but have no SOL for the fee", because the fixes are completely different.
 */
async function assertWalletCanPay(args: {
  walletAddress: string;
  asset: AssetConfig;
  amount: bigint;
  networkFeeLamports: bigint;
}): Promise<void> {
  const { walletAddress, asset, amount, networkFeeLamports } = args;

  if (asset.isNative) {
    const lamports = await getAssetBalance(walletAddress, asset);
    if (lamports < amount + networkFeeLamports + LAMPORT_FEE_RESERVE) {
      if (lamports < amount) {
        throw new AppError("insufficient_balance", { detail: "SOL balance below swap input" });
      }
      throw new AppError("insufficient_sol_for_fees", {
        detail: "SOL balance leaves nothing for fees",
      });
    }
    return;
  }

  const balance = await getAssetBalance(walletAddress, asset);
  if (balance < amount) {
    throw new AppError("insufficient_balance", {
      detail: `${asset.symbol} balance below swap input`,
    });
  }

  // Zero network fee means Jupiter is sponsoring it, so no SOL is needed.
  if (networkFeeLamports > 0n) {
    const sol = await getAssetBalance(walletAddress, { ...asset, isNative: true });
    if (sol < networkFeeLamports + LAMPORT_FEE_RESERVE) {
      throw new AppError("insufficient_sol_for_fees", {
        detail: "wallet holds too little SOL for the network fee",
      });
    }
  }
}

function toCheckoutQuote(args: {
  quote: QuoteRow;
  offer: CoffeeOffer;
  asset: AssetConfig;
  settlement: Settlement;
}): CheckoutQuote {
  const { quote, offer, asset, settlement } = args;

  return {
    quoteId: quote.id,
    expiresAt: quote.expiresAt.toISOString(),
    transaction: settlement.transaction,
    asset: { symbol: asset.symbol, label: asset.label, decimals: asset.decimals },
    payAmount: settlement.payAmount.toString(),
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
  // Round up: never quote less than the card costs.
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

function stripUnsafe(value: string): string {
  return value
    .normalize("NFKC")
    // Control characters, zero-width joiners, and bidi overrides.
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

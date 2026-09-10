import "server-only";

import { AppError } from "@/lib/errors";
import { addBasisPoints, divideCeil } from "@/lib/money";
import type { AssetConfig } from "@/lib/solana/assets";

import { getJupiterOrder, type JupiterOrder } from "./client";

/**
 * Jupiter's `/order` endpoint is ExactIn only, but a gift card costs an exact
 * amount of USD. So we solve for the input:
 *
 *   1. price the trade backwards (USDC -> asset) to get a first estimate,
 *   2. add a buffer and quote forwards until the *guaranteed* output
 *      (`otherAmountThreshold`, i.e. after slippage) covers the card,
 *   3. build the transaction for that input amount.
 *
 * Underwriting against the guaranteed output rather than the expected output is
 * what makes onchain verification deterministic: the swap either delivers at
 * least the card price to the treasury or it reverts.
 */

/** Head-room over the reverse quote, absorbing spread and price movement. */
const INITIAL_BUFFER_BPS = 150;
/** Extra head-room added on each corrective iteration. */
const CORRECTION_BUFFER_BPS = 75;
const MAX_ITERATIONS = 4;
const DEFAULT_SLIPPAGE_BPS = 50;

export interface CoffeeQuote {
  /** Input amount in the payment asset's base units. */
  inAmount: bigint;
  /** Expected USDC output in base units. */
  expectedUsdc: bigint;
  /** Worst-case USDC output the swap will still accept. Always >= required. */
  guaranteedUsdc: bigint;
  routeLabel: string;
  requestId: string;
  /** Base64 transaction for the wallet to sign. Null for price-only quotes. */
  transaction: string | null;
  networkFeeLamports: bigint;
  slippageBps: number;
  priceImpactPct: number | null;
  /** Jupiter's own fee, in bps. Disclosed to the user as an external cost. */
  routerFeeBps: number | null;
}

function guaranteedOut(order: JupiterOrder): bigint {
  const threshold = order.otherAmountThreshold ?? order.outAmount;
  return BigInt(threshold);
}

function routeLabel(order: JupiterOrder): string {
  const labels = (order.routePlan ?? [])
    .map((step) => step.swapInfo.label)
    .filter((label): label is string => Boolean(label));

  if (labels.length > 0) return [...new Set(labels)].join(" + ");
  return order.router ?? "jupiter";
}

function networkFeeLamports(order: JupiterOrder): bigint {
  const total =
    (order.signatureFeeLamports ?? 0) +
    (order.prioritizationFeeLamports ?? 0) +
    (order.rentFeeLamports ?? 0);
  return BigInt(Math.max(0, Math.round(total)));
}

/**
 * Solves for the input amount of `asset` that guarantees `requiredUsdc` lands
 * in the treasury. Pass `taker`/`receiver` to also get a signable transaction.
 */
export async function quoteCoffeePayment(input: {
  asset: AssetConfig;
  usdcMint: string;
  requiredUsdc: bigint;
  taker?: string;
  receiver?: string;
  slippageBps?: number;
}): Promise<CoffeeQuote> {
  const { asset, usdcMint, requiredUsdc } = input;
  const slippageBps = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

  if (asset.mint === usdcMint) {
    throw new AppError("invalid_request", {
      detail: "USDC is paid directly and must not be routed through a swap",
    });
  }

  if (requiredUsdc <= 0n) {
    throw new AppError("invalid_request", { detail: "required USDC must be positive" });
  }

  // Step 1 — reverse quote for a starting estimate.
  const reverse = await getJupiterOrder({
    inputMint: usdcMint,
    outputMint: asset.mint,
    amount: requiredUsdc,
  });

  const estimate = BigInt(reverse.outAmount);
  if (estimate <= 0n) {
    throw new AppError("liquidity_unavailable", {
      detail: `reverse quote returned ${reverse.outAmount} for ${asset.symbol}`,
    });
  }

  // Step 2 — converge on an input amount whose guaranteed output covers the card.
  let candidate = addBasisPoints(estimate, INITIAL_BUFFER_BPS);
  let priced: JupiterOrder | null = null;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    const order = await getJupiterOrder({
      inputMint: asset.mint,
      outputMint: usdcMint,
      amount: candidate,
      slippageBps,
    });

    const guaranteed = guaranteedOut(order);

    if (guaranteed >= requiredUsdc) {
      priced = order;
      break;
    }

    if (guaranteed <= 0n) {
      throw new AppError("liquidity_unavailable", {
        detail: `no output for ${candidate} ${asset.symbol}`,
      });
    }

    // Scale up proportionally to the shortfall, then add head-room.
    const scaled = divideCeil(candidate * requiredUsdc, guaranteed);
    const next = addBasisPoints(scaled, CORRECTION_BUFFER_BPS);
    candidate = next > candidate ? next : candidate + candidate / 100n + 1n;
  }

  if (!priced) {
    throw new AppError("liquidity_unavailable", {
      detail: `could not cover ${requiredUsdc} USDC with ${asset.symbol} in ${MAX_ITERATIONS} attempts`,
    });
  }

  // Step 3 — build the transaction for the settled input amount.
  if (input.taker && input.receiver) {
    const built = await getJupiterOrder({
      inputMint: asset.mint,
      outputMint: usdcMint,
      amount: BigInt(priced.inAmount),
      taker: input.taker,
      receiver: input.receiver,
      slippageBps,
    });

    // Prices move between the pricing call and the build call. If the built
    // route no longer covers the card, the quote is refused rather than
    // silently underfunding the order.
    if (guaranteedOut(built) < requiredUsdc) {
      throw new AppError("quote_expired", {
        detail: `built route guarantees ${guaranteedOut(built)} < ${requiredUsdc}`,
      });
    }

    if (!built.transaction) {
      throw new AppError("no_route", { detail: "Jupiter returned no transaction" });
    }

    return toQuote(built, slippageBps);
  }

  return toQuote(priced, slippageBps);
}

function toQuote(order: JupiterOrder, slippageBps: number): CoffeeQuote {
  return {
    inAmount: BigInt(order.inAmount),
    expectedUsdc: BigInt(order.outAmount),
    guaranteedUsdc: guaranteedOut(order),
    routeLabel: routeLabel(order),
    requestId: order.requestId,
    transaction: order.transaction ?? null,
    networkFeeLamports: networkFeeLamports(order),
    slippageBps: order.slippageBps ?? slippageBps,
    priceImpactPct: order.priceImpact ?? null,
    routerFeeBps: order.feeBps ?? null,
  };
}

/**
 * Indicative "1 unit of asset is worth N USDC", used to show wallet balances in
 * dollars. Returns null when the asset has no route, which the UI renders as a
 * missing price rather than a zero.
 */
export async function getIndicativeUsdcPrice(input: {
  asset: AssetConfig;
  usdcMint: string;
}): Promise<bigint | null> {
  try {
    const probe = 10n ** BigInt(input.asset.decimals);
    const order = await getJupiterOrder({
      inputMint: input.asset.mint,
      outputMint: input.usdcMint,
      amount: probe,
    });
    return BigInt(order.outAmount);
  } catch {
    return null;
  }
}

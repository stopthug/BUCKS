import "server-only";

import { z } from "zod";

import { env } from "@/lib/env";
import { AppError, redact } from "@/lib/errors";

/**
 * Jupiter Swap API v2 (`/order` + `/execute`).
 *
 * `/order` returns a quote and, when a `taker` is supplied, a fully assembled
 * transaction. The user signs it in their wallet; the signed bytes come back to
 * us and we hand them to `/execute`, which lands the transaction and returns
 * the signature. Keeping `/execute` server-side is what allows RFQ routes
 * (where a market maker co-signs) to work at all, and keeps the API key off the
 * client.
 */

const ORDER_TIMEOUT_MS = 12_000;
const EXECUTE_TIMEOUT_MS = 45_000;

export const jupiterOrderSchema = z.object({
  mode: z.string().optional(),
  inputMint: z.string(),
  outputMint: z.string(),
  inAmount: z.string(),
  outAmount: z.string(),
  /** Minimum output after slippage. This is the number we underwrite against. */
  otherAmountThreshold: z.string().optional(),
  swapMode: z.string().optional(),
  slippageBps: z.number().optional(),
  priceImpact: z.number().optional(),
  inUsdValue: z.number().optional(),
  outUsdValue: z.number().optional(),
  routePlan: z
    .array(
      z.object({
        swapInfo: z.object({
          label: z.string().optional(),
          inputMint: z.string(),
          outputMint: z.string(),
        }),
        percent: z.number().optional(),
      }),
    )
    .optional(),
  router: z.string().optional(),
  transaction: z.string().nullable().optional(),
  requestId: z.string(),
  lastValidBlockHeight: z.union([z.string(), z.number()]).optional(),
  gasless: z.boolean().optional(),
  signatureFeeLamports: z.number().optional(),
  prioritizationFeeLamports: z.number().optional(),
  rentFeeLamports: z.number().optional(),
  feeBps: z.number().optional(),
  expireAt: z.union([z.string(), z.number()]).nullable().optional(),
  errorCode: z.number().optional(),
  errorMessage: z.string().optional(),
  error: z.string().optional(),
});

export type JupiterOrder = z.infer<typeof jupiterOrderSchema>;

const executeSchema = z.object({
  status: z.string().optional(),
  signature: z.string().optional(),
  slot: z.union([z.string(), z.number()]).optional(),
  code: z.number().optional(),
  error: z.string().optional(),
  totalInputAmount: z.string().optional(),
  totalOutputAmount: z.string().optional(),
});

export type JupiterExecuteResult = z.infer<typeof executeSchema>;

function headers(): Record<string, string> {
  const { JUPITER_API_KEY } = env();
  const base: Record<string, string> = { Accept: "application/json" };
  if (JUPITER_API_KEY) base["x-api-key"] = JUPITER_API_KEY;
  return base;
}

export interface OrderParams {
  inputMint: string;
  outputMint: string;
  /** Input amount in base units. `/order` only supports ExactIn. */
  amount: bigint;
  /** Wallet that signs. Omit for a price-only quote. */
  taker?: string;
  /** Wallet that receives the output tokens. Must differ from `taker`. */
  receiver?: string;
  slippageBps?: number;
}

const PRICE_TIMEOUT_MS = 8_000;
const priceItemSchema = z.object({
  usdPrice: z.number().optional(),
  price: z.number().optional(),
  stockData: z.object({ price: z.number().optional() }).optional(),
});

/**
 * Spot USD price for wallet-free quotes when a swap route does not exist.
 * xStocks often price as equities here even when `/order` has no pool.
 */
export async function getJupiterUsdPrice(mint: string): Promise<number> {
  const url = `https://lite-api.jup.ag/price/v3?ids=${encodeURIComponent(mint)}`;
  const response = await fetchJson(url, { headers: { Accept: "application/json" } }, PRICE_TIMEOUT_MS);
  const record = response.body && typeof response.body === "object" ? (response.body as Record<string, unknown>) : null;
  const parsed = record ? priceItemSchema.safeParse(record[mint]) : null;
  const price = parsed?.success
    ? (parsed.data.usdPrice ?? parsed.data.price ?? parsed.data.stockData?.price)
    : undefined;

  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new AppError("liquidity_unavailable", { detail: `no Jupiter spot price for ${mint}` });
  }

  return price;
}

export async function getJupiterOrder(params: OrderParams): Promise<JupiterOrder> {
  const url = new URL(`${env().JUPITER_API_BASE_URL.replace(/\/$/, "")}/order`);
  url.searchParams.set("inputMint", params.inputMint);
  url.searchParams.set("outputMint", params.outputMint);
  url.searchParams.set("amount", params.amount.toString());
  if (params.taker) url.searchParams.set("taker", params.taker);
  if (params.receiver) url.searchParams.set("receiver", params.receiver);
  if (params.slippageBps !== undefined) {
    url.searchParams.set("slippageBps", String(params.slippageBps));
  }

  const response = await fetchJson(url.toString(), { headers: headers() }, ORDER_TIMEOUT_MS);
  const parsed = jupiterOrderSchema.safeParse(response.body);

  if (!parsed.success) {
    const message = extractError(response.body);
    throw classifyOrderFailure(message, response.status);
  }

  const order = parsed.data;

  // A quoted price with an empty transaction means the router could price the
  // swap but not build it — insufficient funds, missing ATA, and so on.
  if (params.taker && order.transaction === "") {
    throw classifyBuildFailure(order);
  }

  return order;
}

export async function executeJupiterOrder(input: {
  requestId: string;
  signedTransaction: string;
}): Promise<JupiterExecuteResult> {
  const url = `${env().JUPITER_API_BASE_URL.replace(/\/$/, "")}/execute`;

  const response = await fetchJson(
    url,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: input.requestId,
        signedTransaction: input.signedTransaction,
      }),
    },
    EXECUTE_TIMEOUT_MS,
  );

  const parsed = executeSchema.safeParse(response.body);
  if (!parsed.success) {
    throw new AppError("transaction_failed", { detail: redact(response.body) });
  }

  const result = parsed.data;

  if (result.status && result.status.toLowerCase() !== "success") {
    // -1 is "cached order missing", i.e. the quote aged out before signing.
    if (result.code === -1 || result.code === -2003) {
      throw new AppError("quote_expired", { detail: result.error ?? result.status });
    }
    throw new AppError("transaction_failed", { detail: result.error ?? result.status });
  }

  if (!result.signature) {
    throw new AppError("transaction_failed", { detail: "execute returned no signature" });
  }

  return result;
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { error: "non-JSON response from Jupiter" };
    }
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("quote_expired", { detail: `Jupiter timeout: ${url}` });
    }
    throw new AppError("no_route", { detail: redact(error) });
  } finally {
    clearTimeout(timer);
  }
}

function extractError(body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as { error?: unknown; errorMessage?: unknown; message?: unknown };
    for (const value of [record.error, record.errorMessage, record.message]) {
      if (typeof value === "string" && value) return value;
    }
  }
  return "unknown Jupiter error";
}

function classifyOrderFailure(message: string, status: number): AppError {
  if (/no route|not tradable|no routes|cannot find/i.test(message)) {
    return new AppError("no_route", { detail: message });
  }
  if (/liquidity/i.test(message)) {
    return new AppError("liquidity_unavailable", { detail: message });
  }
  if (status === 429) {
    return new AppError("rate_limited", { detail: message });
  }
  return new AppError("no_route", { detail: `${status}: ${message}` });
}

function classifyBuildFailure(order: JupiterOrder): AppError {
  const detail = order.errorMessage ?? order.error ?? `router ${order.router} errorCode ${order.errorCode}`;

  if (order.router === "jupiterz") {
    // 1 insufficient balance, 2 missing ATA, 3 unbuildable quote
    if (order.errorCode === 1) return new AppError("insufficient_balance", { detail });
    return new AppError("no_route", { detail });
  }

  switch (order.errorCode) {
    case 1:
      return new AppError("insufficient_balance", { detail });
    case 2:
      return new AppError("insufficient_sol_for_fees", { detail });
    default:
      return new AppError("no_route", { detail });
  }
}

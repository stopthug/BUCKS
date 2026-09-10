import { errorCopy } from "@/lib/errors";

/**
 * Browser-side API client.
 *
 * Errors from the server arrive as `{ error, message }`; this preserves both
 * so the UI can react to a code (offer sold out → refresh the menu) while
 * showing copy it did not have to invent.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("internal", "the network dropped out. try again.", 0);
  }

  const body = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | null;

  if (!response.ok) {
    const code = body?.error ?? "internal";
    throw new ApiError(code, body?.message ?? errorCopy(code), response.status);
  }

  return body as T;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface CatalogAsset {
  symbol: "BUCKS" | "SBUXx" | "SOL" | "USDC";
  label: string;
  mint: string;
  decimals: number;
}

export interface BalancesResponse {
  address: string;
  balances: Array<{
    symbol: string;
    label: string;
    mint: string;
    decimals: number;
    amount: string;
  }>;
}

export interface QuoteResponse {
  quoteId: string;
  expiresAt: string;
  transaction: string;
  asset: { symbol: string; label: string; decimals: number };
  payAmount: string;
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

export interface SettlementResponse {
  orderId: string;
  status: string;
  signature: string;
  claimUrl?: string;
}

export interface RedemptionResponse {
  cards: Array<{
    code?: string;
    pin?: string;
    serial?: string;
    expiresAt?: string;
    instructions?: string;
    extra: Record<string, string>;
  }>;
}

export interface OrderResponse {
  order: {
    id: string;
    intent: "purchase" | "gift";
    status: string;
    paymentAsset: string;
    paymentAmount: string;
    providerPriceUsd: string;
    faceValueUsd: string | null;
    cardName: string;
    categoryName: string;
    createdAt: string;
    fulfilledAt: string | null;
    hasRedemption: boolean;
    paymentSignature: string | null;
  };
}

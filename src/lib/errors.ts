/**
 * Every failure the product can produce has a stable code and a piece of
 * user-facing copy. API routes return the code, the UI renders the message,
 * and nothing leaks a stack trace or a provider response body to the browser.
 */

export const ERROR_COPY = {
  // Auth / session
  unauthorized: "Approve the payment in your wallet to keep going.",
  nonce_invalid: "That login request expired. Try connecting again.",
  signature_invalid: "We couldn’t verify that signature.",
  rate_limited: "Too many requests. Give it a second.",
  invalid_request: "Something about that request was off. Try again.",
  not_found: "We couldn’t find that.",
  forbidden: "That isn’t yours to open.",

  // Provider catalog / fulfillment capacity
  provider_unconfigured: "Starbucks cards are sold out right now.",
  starbucks_unavailable: "Starbucks cards are sold out right now.",
  offer_unavailable: "That card just sold out. Pick another value.",
  out_of_stock: "That card just sold out. Pick another value.",
  provider_balance_low: "Coffee purchases are paused for a bit.",
  provider_timeout: "The card seller is slow right now. You were not charged.",
  provider_failed: "The card seller couldn’t finish this order.",
  provider_processing: "Your card is still being prepared. This page updates itself.",

  // Quoting
  asset_not_configured: "That token isn’t available yet.",
  no_route: "No route for that token right now. Try USDC or SOL.",
  liquidity_unavailable: "Not enough liquidity to price that right now.",
  quote_expired: "That price expired. Refresh for a new one.",
  quote_used: "That quote was already used.",

  // Wallet / payment
  insufficient_balance: "Not enough in your wallet for this one.",
  insufficient_sol_for_fees: "You need a little more SOL for the network fee.",
  wallet_rejected: "You cancelled. Nothing was charged.",
  transaction_failed: "That transaction didn’t land. Nothing was charged.",
  transaction_not_found: "We can’t see that transaction on-chain yet. Try again shortly.",
  verification_failed: "We couldn’t verify that payment on-chain.",
  payment_amount_mismatch: "The amount received didn’t match the quote.",
  signature_reused: "That transaction was already used for another order.",
  payment_pending: "We’re still confirming your payment.",

  // Gifting / claiming
  already_claimed: "This coffee has already been claimed.",
  gift_not_ready: "This coffee isn’t ready yet. Check back in a moment.",
  message_too_long: "Keep the message under 120 characters.",

  // Recovery
  refund_required: "Your payment went through, but the card didn’t. We’re on it.",

  internal: "Something broke on our side. Your payment is safe and recorded.",
} as const;

export type ErrorCode = keyof typeof ERROR_COPY;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Extra detail kept server-side for logs; never serialised to the client. */
  readonly detail?: string;

  constructor(code: ErrorCode, options: { status?: number; detail?: string } = {}) {
    super(ERROR_COPY[code]);
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? defaultStatus(code);
    this.detail = options.detail;
  }

  toJSON(): { error: ErrorCode; message: string } {
    return { error: this.code, message: ERROR_COPY[this.code] };
  }
}

function defaultStatus(code: ErrorCode): number {
  switch (code) {
    case "unauthorized":
    case "nonce_invalid":
    case "signature_invalid":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "invalid_request":
    case "message_too_long":
      return 400;
    case "already_claimed":
    case "quote_used":
    case "signature_reused":
      return 409;
    case "rate_limited":
      return 429;
    case "provider_unconfigured":
    case "starbucks_unavailable":
    case "provider_balance_low":
    case "provider_timeout":
    case "liquidity_unavailable":
      return 503;
    case "internal":
      return 500;
    default:
      return 422;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function errorCopy(code: string | null | undefined): string {
  if (code && code in ERROR_COPY) return ERROR_COPY[code as ErrorCode];
  return ERROR_COPY.internal;
}

/**
 * Redacts credential-shaped values before anything reaches a log sink.
 * Redemption codes are never handed to the logger in the first place: they are
 * encrypted the moment they arrive from the provider.
 */
export function redact(value: unknown): string {
  const text = typeof value === "string" ? value : safeStringify(value);
  return text.replace(
    /([A-Za-z0-9_-]*(?:api[_-]?key|secret|token|authorization|password|pin|code)[A-Za-z0-9_-]*)(["'\s:=]+)([^\s",}]+)/gi,
    "$1$2[redacted]",
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

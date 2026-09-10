/**
 * Every failure the product can produce has a stable code and a piece of
 * user-facing copy. API routes return the code, the UI renders the message,
 * and nothing leaks a stack trace or a provider response body to the browser.
 */

export const ERROR_COPY = {
  // Auth / session
  unauthorized: "connect your wallet to continue.",
  nonce_invalid: "that login request expired. try connecting again.",
  signature_invalid: "we could not verify that signature.",
  rate_limited: "too many requests. give it a moment.",
  invalid_request: "something about that request was off. try again.",
  not_found: "we could not find that.",
  forbidden: "that isn't yours to open.",

  // Provider catalog / fulfillment capacity
  provider_unconfigured: "coffee cards are temporarily unavailable.",
  starbucks_unavailable: "coffee cards are temporarily unavailable.",
  offer_unavailable: "that card just sold out. pick another value.",
  out_of_stock: "that card just sold out. pick another value.",
  provider_balance_low: "coffee purchases are temporarily unavailable.",
  provider_timeout: "our card provider is slow right now. we did not charge you.",
  provider_failed: "the card provider could not complete this order.",
  provider_processing: "your card is still being prepared. this page updates itself.",

  // Quoting
  asset_not_configured: "that asset isn't available yet.",
  no_route: "no route for that asset right now. try USDC or SOL.",
  liquidity_unavailable: "not enough liquidity to price that right now.",
  quote_expired: "that price expired. refresh for a new quote.",
  quote_used: "that quote was already used.",

  // Wallet / payment
  insufficient_balance: "not enough in your wallet for this one.",
  insufficient_sol_for_fees: "you need a little more SOL to cover the network fee.",
  wallet_rejected: "you cancelled the transaction. nothing was charged.",
  transaction_failed: "that transaction did not land. nothing was charged.",
  transaction_not_found: "we can't see that transaction onchain yet. try again shortly.",
  verification_failed: "we could not verify that payment onchain.",
  payment_amount_mismatch: "the amount received did not match the quote.",
  signature_reused: "that transaction was already used for another order.",
  payment_pending: "we're still confirming your payment.",

  // Gifting / claiming
  already_claimed: "this coffee has already been claimed.",
  gift_not_ready: "this coffee isn't ready yet. check back in a moment.",
  message_too_long: "keep the message under 120 characters.",

  // Recovery
  refund_required: "your payment went through but the card did not. our team is on it.",

  internal: "something broke on our side. your payment is safe and recorded.",
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

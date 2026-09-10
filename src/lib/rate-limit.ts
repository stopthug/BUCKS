import "server-only";

import { query } from "@/lib/db/client";
import { AppError } from "@/lib/errors";

/**
 * Fixed-window rate limiting backed by Postgres, so the budget is shared
 * across serverless instances instead of being per-lambda. An in-process cache
 * short-circuits obvious floods without a round trip.
 */

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  authNonce: { limit: 10, windowSeconds: 60 },
  authVerify: { limit: 10, windowSeconds: 60 },
  quote: { limit: 20, windowSeconds: 60 },
  confirm: { limit: 15, windowSeconds: 60 },
  watch: { limit: 40, windowSeconds: 60 },
  catalog: { limit: 60, windowSeconds: 60 },
  claim: { limit: 12, windowSeconds: 60 },
  claimView: { limit: 60, windowSeconds: 60 },
  reveal: { limit: 30, windowSeconds: 60 },
  webhook: { limit: 600, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

const globalForLimit = globalThis as unknown as {
  bucksLocalLimits?: Map<string, { count: number; resetAt: number }>;
};

function localCache(): Map<string, { count: number; resetAt: number }> {
  globalForLimit.bucksLocalLimits ??= new Map();
  return globalForLimit.bucksLocalLimits;
}

export async function enforceRateLimit(
  name: keyof typeof RATE_LIMITS,
  identifier: string,
): Promise<void> {
  const rule = RATE_LIMITS[name];
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const windowIndex = Math.floor(now / windowMs);
  const bucket = `${name}:${identifier}:${windowIndex}`;

  const local = localCache().get(bucket);
  if (local && local.resetAt > now) {
    local.count += 1;
    if (local.count > rule.limit) {
      throw new AppError("rate_limited", { detail: bucket });
    }
  } else {
    localCache().set(bucket, { count: 1, resetAt: (windowIndex + 1) * windowMs });
  }

  // Opportunistic sweep of the local cache.
  if (localCache().size > 5_000) {
    for (const [key, value] of localCache()) {
      if (value.resetAt <= now) localCache().delete(key);
    }
  }

  try {
    const rows = await query<{ count: number }>(
      `INSERT INTO rate_limits (bucket, count, window_start)
       VALUES ($1, 1, now())
       ON CONFLICT (bucket) DO UPDATE SET count = rate_limits.count + 1
       RETURNING count`,
      [bucket],
    );

    const count = rows[0]?.count ?? 1;
    if (count > rule.limit) {
      throw new AppError("rate_limited", { detail: bucket });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    // A database blip must not become an open door *or* a hard outage: the
    // in-process counter above still applies.
    console.warn("[rate-limit] database counter unavailable");
  }
}

/** Best-effort client identifier for anonymous endpoints. */
export function clientIdentifier(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "unknown";
}

/** Called from a scheduled job or opportunistically; keeps the table small. */
export async function pruneRateLimits(): Promise<void> {
  await query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour'`);
}

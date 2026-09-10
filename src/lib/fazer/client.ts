import "server-only";

import { z } from "zod";

import { env, hasFazerCredentials } from "@/lib/env";
import { AppError, redact, type ErrorCode } from "@/lib/errors";

import { fazerErrorSchema } from "./types";
import { devMockResponse } from "./dev-mock";

/**
 * Thin, server-only HTTP client for the FazerCards reseller API.
 *
 * The API key is read from the environment at call time and never returned,
 * logged, or forwarded to the browser. Every failure is converted into an
 * `AppError` carrying user-safe copy; provider bodies stay in server logs.
 */

const DEFAULT_TIMEOUT_MS = 12_000;

export interface FazerRequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  timeoutMs?: number;
  /** Retries are only ever applied to idempotent calls. */
  retries?: number;
  signal?: AbortSignal;
}

export class FazerTimeoutError extends Error {
  constructor(path: string) {
    super(`FazerCards request timed out: ${path}`);
    this.name = "FazerTimeoutError";
  }
}

export class FazerApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "FazerApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string, query: FazerRequestOptions["query"]): string {
  const base = env().FAZER_API_BASE_URL.replace(/\/$/, "");
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export async function fazerRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: FazerRequestOptions = {},
): Promise<T> {
  const config = env();

  if (!hasFazerCredentials()) {
    throw new AppError("provider_unconfigured", {
      detail: "FAZER_API_KEY is not set",
    });
  }

  if (config.FAZER_DEV_MOCK) {
    return schema.parse(devMockResponse(path, options));
  }

  const method = options.method ?? "GET";
  const retries = options.retries ?? (method === "GET" ? 2 : 0);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = buildUrl(path, options.query);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abortListener = () => controller.abort();
    options.signal?.addEventListener("abort", abortListener, { once: true });

    try {
      const headers: Record<string, string> = {
        "X-API-Key": config.FAZER_API_KEY ?? "",
        Accept: "application/json",
      };
      if (options.body !== undefined) headers["Content-Type"] = "application/json";
      // The provider treats the same key as the same purchase forever, which is
      // exactly what stops a retry from buying a second gift card.
      if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

      const response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
        cache: "no-store",
      });

      const text = await response.text();
      const json: unknown = text ? safeJsonParse(text) : null;

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        if (attempt < retries) {
          await sleep(jitter(Math.max(retryAfter, 1) * 1000));
          continue;
        }
        throw new AppError("rate_limited", { detail: `provider 429 on ${path}` });
      }

      if (!response.ok || !isOk(json)) {
        const parsed = fazerErrorSchema.safeParse(json);
        const message = parsed.success
          ? (parsed.data.error ?? "provider error")
          : `HTTP ${response.status}`;
        const code = parsed.success ? parsed.data.code : undefined;

        // 5xx on a read is worth another attempt; 4xx never is.
        if (response.status >= 500 && attempt < retries) {
          lastError = new FazerApiError(response.status, message, code);
          await sleep(jitter(400 * (attempt + 1)));
          continue;
        }

        throw new FazerApiError(response.status, message, code);
      }

      return schema.parse(json);
    } catch (error) {
      if (error instanceof AppError || error instanceof FazerApiError) throw error;

      const aborted = error instanceof Error && error.name === "AbortError";
      lastError = aborted ? new FazerTimeoutError(path) : error;

      if (attempt < retries) {
        await sleep(jitter(400 * (attempt + 1)));
        continue;
      }
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abortListener);
    }
  }

  if (lastError instanceof FazerTimeoutError) throw lastError;
  throw new FazerApiError(502, `FazerCards request failed: ${redact(lastError)}`);
}

function isOk(json: unknown): boolean {
  return Boolean(json && typeof json === "object" && (json as { ok?: unknown }).ok === true);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "provider returned a non-JSON response" };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  return Math.round(ms * (0.85 + Math.random() * 0.3));
}

/** Maps provider-layer failures onto product-level error codes. */
export function toAppError(error: unknown, fallback: ErrorCode = "provider_failed"): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof FazerTimeoutError) {
    return new AppError("provider_timeout", { detail: error.message });
  }

  if (error instanceof FazerApiError) {
    if (error.status === 401 || error.status === 403) {
      return new AppError("provider_unconfigured", { detail: error.message });
    }
    if (error.status === 404) {
      return new AppError("offer_unavailable", { detail: error.message });
    }
    if (error.status === 503) {
      return new AppError("starbucks_unavailable", { detail: error.message });
    }
    if (/balance|funds/i.test(error.message)) {
      return new AppError("provider_balance_low", { detail: error.message });
    }
    if (/stock|sold out|unavailable/i.test(error.message)) {
      return new AppError("out_of_stock", { detail: error.message });
    }
    return new AppError(fallback, { detail: error.message });
  }

  return new AppError(fallback, { detail: redact(error) });
}

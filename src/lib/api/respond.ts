import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, ERROR_COPY, redact, type ErrorCode } from "@/lib/errors";

/**
 * Every API route funnels through here so a failure is always a `{ error,
 * message }` pair with a safe status, and internal detail only ever reaches
 * the server log.
 */

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: { "cache-control": "no-store", ...(init?.headers ?? {}) },
  });
}

export function fail(code: ErrorCode, status?: number): NextResponse {
  const error = new AppError(code, status === undefined ? {} : { status });
  return NextResponse.json(error.toJSON(), {
    status: error.status,
    headers: { "cache-control": "no-store" },
  });
}

export async function handle(
  routeName: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof AppError) {
      if (error.status >= 500 || error.code === "refund_required") {
        console.error(`[${routeName}] ${error.code}: ${redact(error.detail ?? error.message)}`);
      } else {
        console.warn(`[${routeName}] ${error.code}`);
      }
      return NextResponse.json(error.toJSON(), {
        status: error.status,
        headers: { "cache-control": "no-store" },
      });
    }

    if (error instanceof ZodError) {
      console.warn(`[${routeName}] validation failed: ${redact(error.issues)}`);
      return NextResponse.json(
        { error: "invalid_request", message: ERROR_COPY.invalid_request },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    console.error(`[${routeName}] unhandled: ${redact(error)}`);
    return NextResponse.json(
      { error: "internal", message: ERROR_COPY.internal },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

/** Parses a JSON body, converting malformed input into a 400. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("invalid_request", { detail: "body is not valid JSON" });
  }
}

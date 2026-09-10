import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { queryOne } from "@/lib/db/client";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

/**
 * Stateless, HMAC-signed session in an HTTP-only cookie. There is nothing in
 * it worth stealing beyond identity, and every ownership decision is still
 * re-checked against the database on each request.
 */

const COOKIE_NAME = "bucks_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface Session {
  userId: string;
  /** Empty for guest checkout sessions that are not tied to a wallet. */
  address: string;
  issuedAt: number;
}

interface SessionPayload extends Session {
  expiresAt: number;
}

function sign(payload: string): string {
  return createHmac("sha256", env().SESSION_SECRET).update(payload).digest("base64url");
}

function serialise(session: Session): string {
  const payload: SessionPayload = {
    ...session,
    expiresAt: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function deserialise(value: string): Session | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(body);

  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) return null;
    if (typeof payload.userId !== "string" || typeof payload.address !== "string") return null;
    return { userId: payload.userId, address: payload.address, issuedAt: payload.issuedAt };
  } catch {
    return null;
  }
}

export async function createSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, serialise(session), {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return deserialise(raw);
}

/**
 * Session plus a database check. Wallet sessions must still match a linked
 * wallet; guest checkout sessions only need the user row to exist so they can
 * reveal a card without connecting.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AppError("unauthorized");

  if (session.address) {
    const row = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM wallets WHERE user_id = $1 AND address = $2`,
      [session.userId, session.address],
    );

    if (!row) throw new AppError("unauthorized", { detail: "session wallet no longer linked" });
    return session;
  }

  const user = await queryOne<{ id: string }>(`SELECT id FROM users WHERE id = $1`, [session.userId]);
  if (!user) throw new AppError("unauthorized", { detail: "guest session user missing" });
  return session;
}

/**
 * Keeps the checkout user in the session cookie so reveal works without a
 * wallet. Does not overwrite a session that already belongs to this user.
 */
export async function ensureCheckoutSession(userId: string): Promise<void> {
  const existing = await getSession();
  if (existing?.userId === userId) return;

  await createSession({
    userId,
    address: "",
    issuedAt: Date.now(),
  });
}

/** Creates a user with no wallet. Used for send-to-treasury checkout. */
export async function createGuestUser(email?: string | null): Promise<string> {
  const user = await queryOne<{ id: string }>(
    `INSERT INTO users (email) VALUES ($1) RETURNING id`,
    [email ?? null],
  );
  if (!user) throw new AppError("internal", { detail: "failed to create guest user" });
  return user.id;
}

export async function touchUser(userId: string, email?: string | null): Promise<void> {
  if (email) {
    await queryOne(
      `UPDATE users SET last_seen_at = now(), email = COALESCE(email, $2) WHERE id = $1 RETURNING id`,
      [userId, email],
    );
    return;
  }

  await queryOne(`UPDATE users SET last_seen_at = now() WHERE id = $1 RETURNING id`, [userId]);
}

/**
 * Finds or creates the user behind a verified wallet. A wallet maps to exactly
 * one user, enforced by a unique constraint.
 */
export async function upsertUserForWallet(address: string): Promise<string> {
  const existing = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM wallets WHERE address = $1 AND chain = 'solana:mainnet'`,
    [address],
  );

  if (existing) {
    await queryOne(`UPDATE users SET last_seen_at = now() WHERE id = $1 RETURNING id`, [
      existing.user_id,
    ]);
    return existing.user_id;
  }

  const user = await queryOne<{ id: string }>(`INSERT INTO users DEFAULT VALUES RETURNING id`);
  if (!user) throw new AppError("internal", { detail: "failed to create user" });

  await queryOne(
    `INSERT INTO wallets (user_id, address) VALUES ($1, $2)
     ON CONFLICT (address, chain) DO NOTHING
     RETURNING id`,
    [user.id, address],
  );

  return user.id;
}

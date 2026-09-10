import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { decryptJson, hashToken } from "@/lib/crypto/encryption";
import { isPlausibleClaimToken } from "@/lib/crypto/tokens";
import { claimGift, getGiftByTokenHash, type GiftWithContext } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { StoredRedemption } from "@/lib/fulfillment";
import { refreshOrder } from "@/lib/fulfillment";
import type { RedemptionCard } from "@/lib/fazer/types";

/**
 * Claiming needs no wallet and no account: whoever holds the link gets the
 * card. The token is the credential, so it is only ever compared by hash and
 * the claim itself is serialised in the database.
 *
 * One concession to reality: after a successful claim we drop a signed,
 * HTTP-only cookie for that gift. It lets the person who claimed it reopen the
 * page and see their code again instead of losing it to an accidental refresh,
 * while anyone else still sees "this coffee has already been claimed". The
 * gift is still claimable exactly once.
 */

const COOKIE_PREFIX = "bucks_claim_";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface ClaimView {
  status: "ready" | "pending" | "claimed" | "unavailable";
  faceValueUsd: string | null;
  cardName: string;
  categoryName: string;
  senderName: string | null;
  message: string | null;
  claimedAt: string | null;
  /** True when this browser is the one that claimed it. */
  canReveal: boolean;
}

function requireToken(token: string): string {
  if (!isPlausibleClaimToken(token)) {
    throw new AppError("not_found", { detail: "malformed claim token" });
  }
  return hashToken(token);
}

async function loadGift(token: string): Promise<GiftWithContext> {
  const context = await getGiftByTokenHash(requireToken(token));
  if (!context) throw new AppError("not_found", { detail: "no gift for token" });
  return context;
}

export async function getClaimView(token: string): Promise<ClaimView> {
  let context = await loadGift(token);

  // A recipient may open the link before the provider finished. Nudge it.
  if (context.gift.status === "pending") {
    await refreshOrder(context.order.id).catch(() => undefined);
    context = await loadGift(token);
  }

  const status = viewStatus(context);

  return {
    status,
    faceValueUsd: (context.order.faceValueUsd ?? context.product.faceValueUsd)?.toString() ?? null,
    cardName: context.product.name,
    categoryName: context.product.categoryName,
    senderName: context.gift.senderName,
    message: context.gift.message,
    claimedAt: context.gift.claimedAt?.toISOString() ?? null,
    canReveal: status === "claimed" ? await hasClaimCookie(context.gift.id) : false,
  };
}

function viewStatus(context: GiftWithContext): ClaimView["status"] {
  if (context.gift.status === "claimed") return "claimed";
  if (context.order.status === "ready") return "ready";
  if (context.order.status === "refund_required" || context.order.status === "provider_failed") {
    return "unavailable";
  }
  return "pending";
}

export interface ClaimResult {
  cards: RedemptionCard[];
  faceValueUsd: string | null;
  cardName: string;
}

/** Claims the gift. Succeeds at most once per token, enforced in Postgres. */
export async function claim(token: string): Promise<ClaimResult> {
  const context = await loadGift(token);

  if (context.gift.status === "claimed") {
    // Let the original claimer back in; everyone else is refused.
    if (await hasClaimCookie(context.gift.id)) return reveal(context);
    throw new AppError("already_claimed");
  }

  if (context.order.status !== "ready") {
    await refreshOrder(context.order.id).catch(() => undefined);
    const refreshed = await loadGift(token);
    if (refreshed.order.status !== "ready") {
      if (refreshed.order.status === "refund_required") throw new AppError("refund_required");
      throw new AppError("gift_not_ready");
    }
  }

  const claimed = await claimGift(requireToken(token));
  await setClaimCookie(claimed.giftId);

  return reveal(await loadGift(token));
}

/** Re-reveals to the browser that already claimed this gift. */
export async function revealClaimed(token: string): Promise<ClaimResult> {
  const context = await loadGift(token);

  if (context.gift.status !== "claimed") throw new AppError("gift_not_ready");
  if (!(await hasClaimCookie(context.gift.id))) throw new AppError("already_claimed");

  return reveal(context);
}

function reveal(context: GiftWithContext): ClaimResult {
  if (!context.order.encryptedRedemptionData) {
    throw new AppError("gift_not_ready", { detail: "no redemption data stored" });
  }

  const stored = decryptJson<StoredRedemption>(context.order.encryptedRedemptionData);

  return {
    cards: stored.cards,
    faceValueUsd: (context.order.faceValueUsd ?? context.product.faceValueUsd)?.toString() ?? null,
    cardName: context.product.name,
  };
}

// ---------------------------------------------------------------------------
// Claim cookie
// ---------------------------------------------------------------------------

function cookieName(giftId: string): string {
  return `${COOKIE_PREFIX}${giftId}`;
}

function cookieValue(giftId: string): string {
  return createHmac("sha256", env().SESSION_SECRET)
    .update(`claim:${giftId}`)
    .digest("base64url");
}

async function setClaimCookie(giftId: string): Promise<void> {
  const store = await cookies();
  store.set(cookieName(giftId), cookieValue(giftId), {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

async function hasClaimCookie(giftId: string): Promise<boolean> {
  const store = await cookies();
  const present = store.get(cookieName(giftId))?.value;
  if (!present) return false;

  const expected = cookieValue(giftId);
  const left = Buffer.from(present, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

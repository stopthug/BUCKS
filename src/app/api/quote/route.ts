import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api/respond";
import { upsertUserForWallet } from "@/lib/auth/session";
import { createCheckoutQuote, GIFT_MESSAGE_MAX_LENGTH, GIFT_NAME_MAX_LENGTH } from "@/lib/checkout";
import { AppError } from "@/lib/errors";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  categoryId: z.string().trim().min(1).max(128),
  cardId: z.string().trim().min(1).max(128),
  asset: z.enum(["BUCKS", "SBUXx", "SOL", "USDC"]),
  intent: z.enum(["purchase", "gift"]),
  walletAddress: z
    .string()
    .trim()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "not a Solana address"),
  senderName: z.string().max(GIFT_NAME_MAX_LENGTH).nullish(),
  message: z.string().max(GIFT_MESSAGE_MAX_LENGTH).nullish(),
});

/**
 * Prices a purchase and returns a transaction to sign. The payer is the
 * wallet that will sign — no site login is required. All amounts are computed
 * and stored server-side; the client only echoes the quote id and signed bytes.
 */
export async function POST(request: Request) {
  return handle("quote", async () => {
    const body = bodySchema.parse(await readJson(request));
    await enforceRateLimit("quote", `${clientIdentifier(request)}:${body.walletAddress}`);

    try {
      new PublicKey(body.walletAddress);
    } catch {
      throw new AppError("invalid_request", { detail: "wallet address" });
    }

    const userId = await upsertUserForWallet(body.walletAddress);

    const quote = await createCheckoutQuote({
      userId,
      walletAddress: body.walletAddress,
      categoryId: body.categoryId,
      cardId: body.cardId,
      assetSymbol: body.asset,
      intent: body.intent,
      senderName: body.senderName ?? null,
      message: body.message ?? null,
    });

    return ok(quote);
  });
}

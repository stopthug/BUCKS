import { z } from "zod";

import { handle, ok } from "@/lib/api/respond";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getWalletBalances } from "@/lib/solana/balances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addressSchema = z
  .string()
  .trim()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "not a Solana address");

/**
 * Balances for the four supported assets, read from the same RPC that prices
 * the swap so the checkout screen and the quote never disagree. This is public
 * chain data; no session required.
 */
export async function GET(request: Request) {
  return handle("balances", async () => {
    await enforceRateLimit("catalog", clientIdentifier(request));

    const address = addressSchema.parse(new URL(request.url).searchParams.get("address"));
    const balances = await getWalletBalances(address);

    return ok({ address, balances });
  });
}

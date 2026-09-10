import { z } from "zod";

import { handle, ok } from "@/lib/api/respond";
import { claim, getClaimView, revealClaimed } from "@/lib/claim";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const paramsSchema = z.object({ token: z.string().min(20).max(128) });

const actionSchema = z
  .object({ action: z.enum(["claim", "reveal"]).default("claim") })
  .default({ action: "claim" });

/** Public preview of a gift. Never includes the code. */
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return handle("claim/[token]", async () => {
    await enforceRateLimit("claimView", clientIdentifier(request));

    const { token } = paramsSchema.parse(await context.params);
    return ok(await getClaimView(token));
  });
}

/** Claims the gift, or re-reveals it to the browser that already claimed it. */
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return handle("claim/[token]", async () => {
    await enforceRateLimit("claim", clientIdentifier(request));

    const { token } = paramsSchema.parse(await context.params);

    const body = await request
      .json()
      .then((value) => actionSchema.parse(value))
      .catch(() => ({ action: "claim" as const }));

    const result = body.action === "reveal" ? await revealClaimed(token) : await claim(token);

    return ok(result);
  });
}

import { handle, ok } from "@/lib/api/respond";
import { envStatus } from "@/lib/env";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe deploy diagnostics. Names only — never secret values.
 */
export async function GET(request: Request) {
  return handle("status", async () => {
    await enforceRateLimit("catalog", clientIdentifier(request));
    return ok(envStatus());
  });
}

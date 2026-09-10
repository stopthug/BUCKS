import { handle, ok } from "@/lib/api/respond";
import { getPairMarket } from "@/lib/market/pair";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle("market", async () => {
    await enforceRateLimit("catalog", clientIdentifier(request));
    return ok(await getPairMarket());
  });
}

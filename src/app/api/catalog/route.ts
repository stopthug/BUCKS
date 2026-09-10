import { handle, ok } from "@/lib/api/respond";
import { loadCoffeeMenu } from "@/lib/catalog-view";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getSupportedAssets } from "@/lib/solana/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Starbucks catalog the storefront is showing right now.
 *
 * This is the same view as the homepage: live provider inventory when a
 * FazerCards key is configured, otherwise the non-purchasable preview.
 */
export async function GET(request: Request) {
  return handle("catalog", async () => {
    await enforceRateLimit("catalog", clientIdentifier(request));

    const menu = await loadCoffeeMenu();

    let assets: Array<{
      symbol: string;
      label: string;
      mint: string;
      decimals: number;
    }> = [];
    try {
      assets = (await getSupportedAssets()).map((asset) => ({
        symbol: asset.symbol,
        label: asset.label,
        mint: asset.mint,
        decimals: asset.decimals,
      }));
    } catch {
      assets = [];
    }

    return ok({
      available: menu.available,
      purchasable: menu.purchasable,
      reason: menu.reason,
      offers: menu.offers,
      assets,
      sandbox: menu.sandbox,
    });
  });
}

import { handle, ok } from "@/lib/api/respond";
import { env, hasFazerCredentials } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getCoffeeCatalog, getResellerBalanceUsd } from "@/lib/fazer/catalog";
import { toAppError } from "@/lib/fazer/client";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getSupportedAssets } from "@/lib/solana/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The live gift-card catalog for this reseller account, plus whether we can
 * actually fulfil right now. `available: false` is a real answer — the UI shows
 * "gift cards are temporarily unavailable" rather than placeholder inventory.
 */
export async function GET(request: Request) {
  return handle("catalog", async () => {
    await enforceRateLimit("catalog", clientIdentifier(request));

    const assets = (await getSupportedAssets()).map((asset) => ({
      symbol: asset.symbol,
      label: asset.label,
      mint: asset.mint,
      decimals: asset.decimals,
    }));

    if (!hasFazerCredentials()) {
      return ok({
        available: false,
        reason: "provider_unconfigured",
        offers: [],
        assets,
        sandbox: false,
      });
    }

    try {
      const [catalog, resellerBalanceUsd] = await Promise.all([
        getCoffeeCatalog(),
        getResellerBalanceUsd().catch(() => null),
      ]);

      const offers = catalog.offers
        .filter((offer) =>
          // Hide anything the reseller float cannot cover: better to not show
          // a card than to fail at the end of checkout.
          resellerBalanceUsd === null ? true : resellerBalanceUsd >= offer.priceUsd,
        )
        .map((offer) => ({
          categoryId: offer.categoryId,
          cardId: offer.cardId,
          name: offer.name,
          categoryName: offer.categoryName,
          imageUrl: offer.imageUrl,
          faceValueUsd: offer.faceValueUsd?.toString() ?? null,
          providerPriceUsd: offer.priceUsd.toString(),
          stock: offer.stock,
        }));

      if (offers.length === 0) {
        return ok({
          available: false,
          reason: resellerBalanceUsd === null ? "starbucks_unavailable" : "provider_balance_low",
          offers: [],
          assets,
          sandbox: env().FAZER_DEV_MOCK,
        });
      }

      return ok({
        available: true,
        reason: null,
        offers,
        assets,
        sandbox: env().FAZER_DEV_MOCK,
        fetchedAt: new Date(catalog.fetchedAt).toISOString(),
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : toAppError(error);

      // Availability is a normal state of the world, not a server error.
      return ok({
        available: false,
        reason: appError.code,
        offers: [],
        assets,
        sandbox: env().FAZER_DEV_MOCK,
      });
    }
  });
}

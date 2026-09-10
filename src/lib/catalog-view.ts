import "server-only";

import { env, hasFazerCredentials } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getCoffeeCatalog, getResellerBalanceUsd } from "@/lib/fazer/catalog";
import { toAppError } from "@/lib/fazer/client";
import type { CoffeeMenu, MenuOffer } from "@/lib/menu";

/**
 * Server-render-safe view of the Starbucks menu.
 *
 * Pages call this instead of fetching their own API, so the first paint already
 * has real inventory. It never throws: a missing key, an empty catalog or a
 * provider outage all come back as `available: false` with a reason, which the
 * UI renders as "coffee cards are temporarily unavailable" rather than a crash
 * or a placeholder price.
 */
export async function loadCoffeeMenu(): Promise<CoffeeMenu> {
  let sandbox = false;
  try {
    sandbox = env().FAZER_DEV_MOCK;
  } catch {
    return { available: false, reason: "provider_unconfigured", offers: [], sandbox: false };
  }

  if (!hasFazerCredentials()) {
    return { available: false, reason: "provider_unconfigured", offers: [], sandbox };
  }

  try {
    const [catalog, resellerBalanceUsd] = await Promise.all([
      getCoffeeCatalog(),
      getResellerBalanceUsd().catch(() => null),
    ]);

    const offers = catalog.offers
      .filter((offer) => (resellerBalanceUsd === null ? true : resellerBalanceUsd >= offer.priceUsd))
      .map(
        (offer): MenuOffer => ({
          categoryId: offer.categoryId,
          cardId: offer.cardId,
          name: offer.name,
          categoryName: offer.categoryName,
          imageUrl: offer.imageUrl,
          faceValueUsd: offer.faceValueUsd?.toString() ?? null,
          providerPriceUsd: offer.priceUsd.toString(),
          stock: offer.stock,
        }),
      );

    if (offers.length === 0) {
      return {
        available: false,
        reason: resellerBalanceUsd === null ? "starbucks_unavailable" : "provider_balance_low",
        offers: [],
        sandbox,
      };
    }

    return { available: true, reason: null, offers, sandbox };
  } catch (error) {
    const appError = error instanceof AppError ? error : toAppError(error);
    return { available: false, reason: appError.code, offers: [], sandbox };
  }
}

import "server-only";

import { env, hasFazerCredentials } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getCoffeeCatalog, getResellerBalanceUsd } from "@/lib/fazer/catalog";
import { toAppError } from "@/lib/fazer/client";
import type { CoffeeMenu, MenuOffer } from "@/lib/menu";
import { previewStarbucksMenu } from "@/lib/starbucks-preview";

/**
 * Server-render-safe view of the Starbucks menu.
 *
 * Pages call this instead of fetching their own API, so the first paint already
 * has inventory. A missing key, an empty catalog or a provider outage falls
 * back to the preview cards so the storefront is never a blank error on Vercel.
 * Checkout stays closed unless the live provider actually answered.
 */
export async function loadCoffeeMenu(): Promise<CoffeeMenu> {
  let sandbox = false;
  try {
    sandbox = env().FAZER_DEV_MOCK;
  } catch {
    return previewStarbucksMenu();
  }

  if (!hasFazerCredentials()) {
    return previewStarbucksMenu();
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
      return previewStarbucksMenu();
    }

    return { available: true, purchasable: true, reason: null, offers, sandbox };
  } catch (error) {
    const appError = error instanceof AppError ? error : toAppError(error);
    console.warn(`[catalog] falling back to preview: ${appError.code}`);
    return previewStarbucksMenu();
  }
}

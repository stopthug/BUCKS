import "server-only";

import { env, hasFazerCredentials } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getCoffeeCatalog, type CoffeeOffer } from "@/lib/fazer/catalog";
import { toAppError } from "@/lib/fazer/client";
import { upsertProduct } from "@/lib/db/queries";
import type { CoffeeMenu, MenuOffer } from "@/lib/menu";
import { previewStarbucksMenu } from "@/lib/starbucks-preview";

/**
 * Server-render-safe view of the Starbucks menu.
 *
 * Pages call this instead of fetching their own API, so the first paint already
 * has inventory. A missing key still falls back to the non-purchasable preview
 * so a fresh local checkout can be designed. Once `FAZER_API_KEY` is set, a
 * provider failure or empty catalog is shown honestly — never swapped for
 * "Test catalog" sample cards.
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
    const catalog = await getCoffeeCatalog();
    const offers = catalog.offers.map(toMenuOffer);

    void snapshotCatalog(catalog.offers);

    if (offers.length === 0) {
      return {
        available: false,
        purchasable: false,
        reason: "starbucks_unavailable",
        offers: [],
        sandbox,
      };
    }

    return {
      available: true,
      purchasable: offers.some((offer) => offer.stock > 0),
      reason: null,
      offers,
      sandbox,
    };
  } catch (error) {
    const appError = error instanceof AppError ? error : toAppError(error);
    if (sandbox) {
      console.warn(`[catalog] falling back to preview: ${appError.code}`);
      return previewStarbucksMenu();
    }
    console.warn(`[catalog] live catalog unavailable: ${appError.code}`);
    return {
      available: false,
      purchasable: false,
      reason: appError.code,
      offers: [],
      sandbox: false,
    };
  }
}

function toMenuOffer(offer: CoffeeOffer): MenuOffer {
  return {
    categoryId: offer.categoryId,
    cardId: offer.cardId,
    name: offer.name,
    categoryName: offer.categoryName,
    imageUrl: offer.imageUrl,
    faceValueUsd: offer.faceValueUsd?.toString() ?? null,
    providerPriceUsd: offer.priceUsd.toString(),
    stock: offer.stock,
  };
}

function snapshotCatalog(offers: CoffeeOffer[]): void {
  void Promise.all(offers.map((offer) => upsertProduct(offer))).catch((error) => {
    const appError = error instanceof AppError ? error : toAppError(error);
    console.warn(`[catalog] product snapshot failed: ${appError.code}`);
  });
}

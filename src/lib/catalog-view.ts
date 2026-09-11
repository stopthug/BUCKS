import "server-only";

import { connection } from "next/server";

import { env, envStatus, hasFazerCredentials } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getCoffeeCatalog, type CoffeeOffer } from "@/lib/fazer/catalog";
import { toAppError } from "@/lib/fazer/client";
import { upsertProduct } from "@/lib/db/queries";
import type { CoffeeMenu, MenuOffer } from "@/lib/menu";
import { previewStarbucksMenu } from "@/lib/starbucks-preview";

function emptyMenu(reason: CoffeeMenu["reason"]): CoffeeMenu {
  return {
    available: false,
    purchasable: false,
    reason,
    offers: [],
    sandbox: false,
  };
}

/**
 * Server-render-safe view of the Starbucks menu.
 *
 * Pages call this instead of fetching their own API, so the first paint already
 * has inventory. Locally, a missing key still falls back to the non-purchasable
 * preview. Production never shows those sample cards — missing credentials or a
 * provider failure is an empty menu, not fake stock.
 */
export async function loadCoffeeMenu(): Promise<CoffeeMenu> {
  await connection();

  const production = process.env.NODE_ENV === "production";
  let sandbox = false;
  const status = envStatus();
  console.info("[catalog] credentials", {
    hasKey: status.hasFazerKey,
    envOk: status.ok,
    missing: status.missing,
    production,
  });

  try {
    sandbox = env().FAZER_DEV_MOCK;
  } catch (error) {
    console.warn(
      "[catalog] env failed",
      error instanceof Error ? error.message.split("\n")[0] : "unknown",
      status.missing,
    );
    return production ? emptyMenu("provider_unconfigured") : previewStarbucksMenu();
  }

  if (!hasFazerCredentials()) {
    if (production) {
      console.warn("[catalog] FAZER_API_KEY missing in production — not serving sample cards");
      return emptyMenu("provider_unconfigured");
    }
    return previewStarbucksMenu();
  }

  try {
    const catalog = await getCoffeeCatalog();
    const offers = catalog.offers.map(toMenuOffer);

    void snapshotCatalog(catalog.offers);

    if (offers.length === 0) {
      return emptyMenu("starbucks_unavailable");
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
    if (sandbox && !production) {
      console.warn(`[catalog] falling back to preview: ${appError.code}`);
      return previewStarbucksMenu();
    }
    console.warn(`[catalog] live catalog unavailable: ${appError.code}`);
    return emptyMenu(appError.code);
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

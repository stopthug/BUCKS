import type { ErrorCode } from "@/lib/errors";

/**
 * Menu shapes shared by the server loader and the browser.
 *
 * These live apart from `lib/catalog-view.ts` on purpose: that module is
 * `server-only` because it talks to the provider, and a client component
 * importing it for a type would drag the whole provider client — API key
 * handling included — toward the browser bundle.
 *
 * Money crosses this boundary as decimal strings of base units, never as
 * `bigint` or `number`.
 */

export interface MenuOffer {
  categoryId: string;
  cardId: string;
  name: string;
  categoryName: string;
  /** Category cover from the provider, or a local fixture path. */
  imageUrl: string | null;
  /** Face value in USD base units (6dp), or null when the provider name has none. */
  faceValueUsd: string | null;
  /** What the provider charges, in USD base units (6dp). */
  providerPriceUsd: string;
  stock: number;
}

export interface CoffeeMenu {
  available: boolean;
  /** False when the cards are a preview and checkout cannot fulfil yet. */
  purchasable: boolean;
  reason: ErrorCode | null;
  offers: MenuOffer[];
  /** True when served from a fixture or preview catalog. */
  sandbox: boolean;
}

export interface MenuCategory {
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  offers: MenuOffer[];
}

/** Deduplicates by face value, for surfaces that only show denominations. */
export function distinctDenominations(offers: MenuOffer[]): MenuOffer[] {
  const seen = new Set<string>();
  const result: MenuOffer[] = [];

  for (const offer of offers) {
    const key = offer.faceValueUsd ?? offer.name;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(offer);
  }

  return result;
}

/** Banner shown when the catalog is a fixture or a non-purchasable preview. */
export function catalogNotice(menu: CoffeeMenu): string | null {
  if (!menu.sandbox) return null;
  if (!menu.purchasable) return "preview catalog — checkout opens when inventory is live";
  return "development fixture — not live provider data";
}

export function groupOffersByCategory(offers: MenuOffer[]): MenuCategory[] {
  const groups = new Map<string, MenuCategory>();

  for (const offer of offers) {
    const existing = groups.get(offer.categoryId);
    if (existing) {
      existing.offers.push(offer);
      if (!existing.imageUrl && offer.imageUrl) existing.imageUrl = offer.imageUrl;
      continue;
    }

    groups.set(offer.categoryId, {
      categoryId: offer.categoryId,
      categoryName: offer.categoryName,
      imageUrl: offer.imageUrl,
      offers: [offer],
    });
  }

  return [...groups.values()];
}

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
  reason: ErrorCode | null;
  offers: MenuOffer[];
  /** True when served from the local development fixture. */
  sandbox: boolean;
}

export interface MenuCategory {
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  offers: MenuOffer[];
}

export function isCoffeeBrand(name: string): boolean {
  return /\bstarbucks\b|\bsbux\b/i.test(name);
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

/** One card per brand for the homepage grid — prefer a $25 face value. */
export function featuredShowcase(offers: MenuOffer[]): MenuOffer[] {
  const target = 25_000_000n;

  return groupOffersByCategory(offers).flatMap((group) => {
    const first = group.offers[0];
    if (!first) return [];

    let best = first;
    let bestDistance = distance(faceOf(best), target);

    for (const offer of group.offers.slice(1)) {
      const next = distance(faceOf(offer), target);
      if (next < bestDistance) {
        best = offer;
        bestDistance = next;
      }
    }

    return [best];
  });
}

function faceOf(offer: MenuOffer): bigint {
  return BigInt(offer.faceValueUsd ?? offer.providerPriceUsd);
}

function distance(value: bigint, target: bigint): bigint {
  return value > target ? value - target : target - value;
}

import "server-only";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { parseFaceValueUsd, parseUsd } from "@/lib/money";

import { fazerRequest, toAppError } from "./client";
import {
  balanceResponseSchema,
  giftCardCategoriesResponseSchema,
  giftCardOffersResponseSchema,
  type FazerGiftCardCategory,
  type FazerGiftCardOffer,
} from "./types";

/**
 * Starbucks availability is discovered at runtime by walking the reseller's
 * own gift-card catalog. Covers come from `include_ui=1`. Nothing about
 * Starbucks is hardcoded beyond the name match, and if the account carries no
 * Starbucks category the product says so rather than inventing inventory.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;
const CATEGORY_PAGE_SIZE = 200;
const MAX_CATEGORY_PAGES = 40;

/** Matches "Starbucks", "Starbucks US", "STARBUCKS (Global)", "SBUX". */
const STARBUCKS_PATTERN = /\bstarbucks\b|\bsbux\b/i;

export interface CoffeeOffer {
  categoryId: string;
  categoryName: string;
  cardId: string;
  name: string;
  imageUrl: string | null;
  /** Face value in USD base units, or null when the provider name has none. */
  faceValueUsd: bigint | null;
  /** What FazerCards charges us, in USD base units. */
  priceUsd: bigint;
  stock: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
}

export interface CoffeeCatalog {
  offers: CoffeeOffer[];
  categories: Array<{ id: string; name: string; imageUrl: string | null }>;
  fetchedAt: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const globalForCache = globalThis as unknown as {
  bucksFazerCache?: Map<string, CacheEntry<unknown>>;
  bucksFazerInflight?: Map<string, Promise<unknown>>;
};

function cache(): Map<string, CacheEntry<unknown>> {
  globalForCache.bucksFazerCache ??= new Map();
  return globalForCache.bucksFazerCache;
}

function inflight(): Map<string, Promise<unknown>> {
  globalForCache.bucksFazerInflight ??= new Map();
  return globalForCache.bucksFazerInflight;
}

/**
 * Cache-through with single-flight, so a burst of checkout page loads produces
 * one provider call instead of dozens (the catalog read limit is 120/min).
 */
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache().get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const existing = inflight().get(key);
  if (existing) return existing as Promise<T>;

  const promise = load()
    .then((value) => {
      cache().set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight().delete(key);
    });

  inflight().set(key, promise);
  return promise;
}

export function invalidateCatalogCache(): void {
  cache().clear();
}

/**
 * Turns the provider's `imageurl` into something the browser can load.
 * Mock fixtures already use local `/cards/*.svg` paths; live responses may be
 * a full URL, a media path, or a bare filename.
 */
export function resolveProviderImageUrl(imageurl?: string | null): string | null {
  if (!imageurl) return null;
  const value = imageurl.trim();
  if (!value) return null;
  if (value.startsWith("/cards/")) return value;
  if (/^https?:\/\//i.test(value)) return value;

  const origin = new URL(env().FAZER_API_BASE_URL).origin;
  if (value.startsWith("/")) return `${origin}${value}`;
  return `${origin}/api/v2/media/game-key-covers/${encodeURIComponent(value)}`;
}

/** Walks every page of `GET /giftcards`, including cover art. */
async function fetchAllCategories(): Promise<FazerGiftCardCategory[]> {
  const items: FazerGiftCardCategory[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_CATEGORY_PAGES; page += 1) {
    const response = await fazerRequest("/giftcards", giftCardCategoriesResponseSchema, {
      query: { limit: CATEGORY_PAGE_SIZE, cursor, include_ui: 1 },
    });

    items.push(...response.items);

    const next = response.meta?.next_cursor;
    if (!next || response.meta?.has_more === false) break;
    cursor = next;
  }

  return items;
}

export async function listStarbucksCategories(): Promise<FazerGiftCardCategory[]> {
  return cached("starbucks-categories", CACHE_TTL_MS, async () => {
    const categories = await fetchAllCategories();
    return categories.filter((category) => STARBUCKS_PATTERN.test(category.name));
  });
}

async function fetchOffers(categoryId: string): Promise<{
  categoryName: string;
  imageUrl: string | null;
  offers: FazerGiftCardOffer[];
}> {
  const response = await fazerRequest("/giftcards/cards", giftCardOffersResponseSchema, {
    query: { category_id: categoryId, include_ui: 1 },
  });
  return {
    categoryName: response.name,
    imageUrl: resolveProviderImageUrl(response.imageurl),
    offers: response.offers,
  };
}

function toCoffeeOffer(
  categoryId: string,
  categoryName: string,
  imageUrl: string | null,
  offer: FazerGiftCardOffer,
): CoffeeOffer | null {
  if (!offer.card_id) return null;
  if (offer.stock <= 0) return null;

  return {
    categoryId,
    categoryName,
    cardId: offer.card_id,
    name: offer.name,
    imageUrl,
    faceValueUsd: parseFaceValueUsd(offer.name),
    priceUsd: parseUsd(offer.price_usd),
    stock: offer.stock,
    minOrderQuantity: Math.max(1, offer.min_order_quantity),
    maxOrderQuantity: Math.max(1, offer.max_order_quantity),
  };
}

/**
 * The live Starbucks catalog for this reseller account. Offers with no
 * `card_id` or no stock are dropped: we only ever show what can be bought.
 */
export async function getCoffeeCatalog(): Promise<CoffeeCatalog> {
  return cached("coffee-catalog", CACHE_TTL_MS, async () => {
    const categories = await listStarbucksCategories();

    if (categories.length === 0) {
      throw new AppError("starbucks_unavailable", {
        detail: "no Starbucks category in the FazerCards account catalog",
      });
    }

    const offers: CoffeeOffer[] = [];
    const catalogCategories: CoffeeCatalog["categories"] = [];

    for (const category of categories) {
      const fetched = await fetchOffers(category.category_id);
      const imageUrl = fetched.imageUrl ?? resolveProviderImageUrl(category.imageurl);
      const categoryName = fetched.categoryName || category.name;
      let inStock = 0;

      for (const offer of fetched.offers) {
        const mapped = toCoffeeOffer(category.category_id, categoryName, imageUrl, offer);
        if (!mapped) continue;
        offers.push(mapped);
        inStock += 1;
      }

      if (inStock > 0) {
        catalogCategories.push({ id: category.category_id, name: categoryName, imageUrl });
      }
    }

    offers.sort((a, b) => {
      const brand = a.categoryName.localeCompare(b.categoryName);
      if (brand !== 0) return brand;
      const left = a.faceValueUsd ?? a.priceUsd;
      const right = b.faceValueUsd ?? b.priceUsd;
      return left === right ? 0 : left < right ? -1 : 1;
    });

    return {
      offers,
      categories: catalogCategories,
      fetchedAt: Date.now(),
    };
  });
}

/**
 * Re-reads a single offer live. Called immediately before a user is asked to
 * pay, because a 10-minute-old stock number is not good enough to charge on.
 */
export async function getLiveOffer(
  categoryId: string,
  cardId: string,
): Promise<CoffeeOffer> {
  const { categoryName, imageUrl, offers } = await fetchOffers(categoryId);

  if (!STARBUCKS_PATTERN.test(categoryName)) {
    throw new AppError("offer_unavailable", { detail: `category ${categoryId} is not Starbucks` });
  }

  const offer = offers.find((entry) => entry.card_id === cardId);

  if (!offer || !offer.card_id) {
    throw new AppError("offer_unavailable", { detail: `card ${cardId} not in category ${categoryId}` });
  }

  const mapped = toCoffeeOffer(categoryId, categoryName, imageUrl, offer);
  if (!mapped) {
    throw new AppError("out_of_stock", { detail: `card ${cardId} has no stock` });
  }

  return mapped;
}

/** Reseller balance in USD base units. Cached briefly; account reads are 30/min. */
export async function getResellerBalanceUsd(): Promise<bigint> {
  return cached("reseller-balance", 30_000, async () => {
    const response = await fazerRequest("/balance", balanceResponseSchema, {});
    return parseUsd(response.balance);
  });
}

/**
 * The gate that stops us taking money we cannot fulfil: the reseller float has
 * to cover this card before the user is asked to sign anything.
 */
export async function assertFulfillable(offer: CoffeeOffer, quantity = 1): Promise<void> {
  if (offer.stock < quantity) {
    throw new AppError("out_of_stock", { detail: `stock ${offer.stock} < ${quantity}` });
  }

  const required = offer.priceUsd * BigInt(quantity);

  let balance: bigint;
  try {
    balance = await getResellerBalanceUsd();
  } catch (error) {
    throw toAppError(error, "provider_balance_low");
  }

  if (balance < required) {
    throw new AppError("provider_balance_low", {
      detail: `reseller balance below card price`,
    });
  }
}

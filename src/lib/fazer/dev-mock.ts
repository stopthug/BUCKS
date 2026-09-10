import "server-only";

import { env } from "@/lib/env";

import type { FazerRequestOptions } from "./client";

/**
 * Local development fixture for the FazerCards API.
 *
 * This exists only so the checkout and gifting flows can be exercised without
 * a funded reseller account. It is reachable exclusively through
 * `FAZER_DEV_MOCK=1`, which `lib/env.ts` refuses to accept when
 * `NODE_ENV === "production"`, and the real provider integration is never
 * replaced by it. Anything served from here is flagged `sandbox: true` all the
 * way to the UI, which renders a visible development banner.
 */

interface MockOrder {
  order_id: string;
  status: "processing" | "completed";
  cards: Array<{ code: string; pin: string }>;
  created_at: number;
}

interface MockOffer {
  card_id: string;
  name: string;
  price_usd: string;
  stock: number;
}

interface MockCategory {
  category_id: string;
  name: string;
  note: string;
  imageurl: string;
  offers: MockOffer[];
}

const globalForMock = globalThis as unknown as { bucksMockOrders?: Map<string, MockOrder> };

function orders(): Map<string, MockOrder> {
  globalForMock.bucksMockOrders ??= new Map();
  return globalForMock.bucksMockOrders;
}

const MOCK_CATEGORIES: MockCategory[] = [
  {
    category_id: "dev-starbucks",
    name: "Starbucks US",
    note: "development fixture",
    imageurl: "/cards/starbucks.svg",
    offers: [
      { card_id: "dev-sbux-5", name: "Starbucks US $5", price_usd: "5.2100", stock: 42 },
      { card_id: "dev-sbux-10", name: "Starbucks US $10", price_usd: "10.4200", stock: 37 },
      { card_id: "dev-sbux-25", name: "Starbucks US $25", price_usd: "26.0500", stock: 12 },
      { card_id: "dev-sbux-50", name: "Starbucks US $50", price_usd: "52.1000", stock: 4 },
    ],
  },
  {
    category_id: "dev-amazon",
    name: "Amazon US",
    note: "development fixture",
    imageurl: "/cards/amazon.svg",
    offers: [
      { card_id: "dev-amzn-10", name: "Amazon US $10", price_usd: "10.1500", stock: 80 },
      { card_id: "dev-amzn-25", name: "Amazon US $25", price_usd: "25.3800", stock: 54 },
      { card_id: "dev-amzn-50", name: "Amazon US $50", price_usd: "50.7500", stock: 21 },
    ],
  },
  {
    category_id: "dev-steam",
    name: "Steam US",
    note: "development fixture",
    imageurl: "/cards/steam.svg",
    offers: [
      { card_id: "dev-steam-20", name: "Steam Wallet US $20", price_usd: "20.4000", stock: 33 },
      { card_id: "dev-steam-50", name: "Steam Wallet US $50", price_usd: "51.0000", stock: 18 },
    ],
  },
  {
    category_id: "dev-netflix",
    name: "Netflix US",
    note: "development fixture",
    imageurl: "/cards/netflix.svg",
    offers: [
      { card_id: "dev-nfx-25", name: "Netflix US $25", price_usd: "25.6000", stock: 16 },
      { card_id: "dev-nfx-50", name: "Netflix US $50", price_usd: "51.2000", stock: 9 },
    ],
  },
  {
    category_id: "dev-spotify",
    name: "Spotify US",
    note: "development fixture",
    imageurl: "/cards/spotify.svg",
    offers: [
      { card_id: "dev-spot-10", name: "Spotify US $10", price_usd: "10.3000", stock: 44 },
      { card_id: "dev-spot-30", name: "Spotify US $30", price_usd: "30.9000", stock: 22 },
    ],
  },
  {
    category_id: "dev-apple",
    name: "Apple US",
    note: "development fixture",
    imageurl: "/cards/apple.svg",
    offers: [
      { card_id: "dev-aapl-15", name: "App Store & iTunes US $15", price_usd: "15.4500", stock: 27 },
      { card_id: "dev-aapl-25", name: "App Store & iTunes US $25", price_usd: "25.7500", stock: 19 },
    ],
  },
  {
    category_id: "dev-google-play",
    name: "Google Play US",
    note: "development fixture",
    imageurl: "/cards/google-play.svg",
    offers: [
      { card_id: "dev-gp-10", name: "Google Play US $10", price_usd: "10.2500", stock: 31 },
      { card_id: "dev-gp-25", name: "Google Play US $25", price_usd: "25.6250", stock: 14 },
    ],
  },
  {
    category_id: "dev-playstation",
    name: "PlayStation US",
    note: "development fixture",
    imageurl: "/cards/playstation.svg",
    offers: [
      { card_id: "dev-psn-25", name: "PlayStation Store US $25", price_usd: "25.8000", stock: 11 },
      { card_id: "dev-psn-50", name: "PlayStation Store US $50", price_usd: "51.6000", stock: 7 },
    ],
  },
];

export function devMockResponse(path: string, options: FazerRequestOptions): unknown {
  if (env().NODE_ENV === "production") {
    throw new Error("Development fixtures are disabled in production.");
  }

  if (path.startsWith("/giftcards/cards")) {
    const fallback = MOCK_CATEGORIES[0]!;
    const categoryId = String(options.query?.category_id ?? fallback.category_id);
    const category = MOCK_CATEGORIES.find((entry) => entry.category_id === categoryId) ?? fallback;
    return {
      ok: true,
      kind: "gift_card",
      category_id: category.category_id,
      name: category.name,
      note: category.note,
      imageurl: category.imageurl,
      offers: category.offers.map((offer) => ({
        ...offer,
        min_order_quantity: 1,
        max_order_quantity: 10,
      })),
    };
  }

  if (path.startsWith("/giftcards/order")) {
    return { ok: true, order: createMockOrder(options) };
  }

  if (path.startsWith("/giftcards")) {
    return {
      ok: true,
      kind: "gift_card",
      items: MOCK_CATEGORIES.map((category) => ({
        category_id: category.category_id,
        name: category.name,
        note: category.note,
        imageurl: category.imageurl,
      })),
      meta: { total: MOCK_CATEGORIES.length, limit: 200, next_cursor: null, has_more: false },
    };
  }

  if (path.startsWith("/balance")) {
    return { ok: true, balance: "1000.0000", currency: "USD" };
  }

  if (path.startsWith("/orders/")) {
    const id = path.split("/").pop() ?? "";
    const existing = orders().get(id);
    if (!existing) return { ok: false, error: "order not found" };

    // Mimic asynchronous fulfilment: the first poll is still processing.
    if (existing.status === "processing" && Date.now() - existing.created_at > 3_000) {
      existing.status = "completed";
    }
    return { ok: true, order: existing };
  }

  throw new Error(`No development fixture for ${path}`);
}

function createMockOrder(options: FazerRequestOptions): MockOrder {
  const key = options.idempotencyKey ?? String(Math.random());
  const existing = [...orders().values()].find((order) => order.order_id === `ord-${hash(key)}`);
  if (existing) return existing;

  const order: MockOrder = {
    order_id: `ord-${hash(key)}`,
    status: "processing",
    cards: [{ code: `DEV-${hash(key)}-FIXTURE`, pin: String(1000 + (hash(key) % 9000)) }],
    created_at: Date.now(),
  };
  orders().set(order.order_id, order);
  return order;
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 100_000;
  }
  return result;
}

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
    name: "Amazon",
    note: "development fixture — filtered out of the storefront",
    imageurl: "/cards/starbucks.svg",
    offers: [],
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

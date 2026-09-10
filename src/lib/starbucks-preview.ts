import type { CoffeeMenu, MenuOffer } from "@/lib/menu";

/**
 * Starbucks values shown when the live provider is not configured.
 * Used so Vercel / a fresh deploy still has a storefront to look at.
 * Checkout stays closed until a real FazerCards key is set.
 */
export const STARBUCKS_PREVIEW_OFFERS: MenuOffer[] = [
  {
    categoryId: "preview-starbucks",
    cardId: "preview-sbux-5",
    name: "Starbucks US $5",
    categoryName: "Starbucks",
    imageUrl: "/cards/starbucks.svg",
    faceValueUsd: "5000000",
    providerPriceUsd: "5210000",
    stock: 42,
  },
  {
    categoryId: "preview-starbucks",
    cardId: "preview-sbux-10",
    name: "Starbucks US $10",
    categoryName: "Starbucks",
    imageUrl: "/cards/starbucks.svg",
    faceValueUsd: "10000000",
    providerPriceUsd: "10420000",
    stock: 37,
  },
  {
    categoryId: "preview-starbucks",
    cardId: "preview-sbux-25",
    name: "Starbucks US $25",
    categoryName: "Starbucks",
    imageUrl: "/cards/starbucks.svg",
    faceValueUsd: "25000000",
    providerPriceUsd: "26050000",
    stock: 12,
  },
  {
    categoryId: "preview-starbucks",
    cardId: "preview-sbux-50",
    name: "Starbucks US $50",
    categoryName: "Starbucks",
    imageUrl: "/cards/starbucks.svg",
    faceValueUsd: "50000000",
    providerPriceUsd: "52100000",
    stock: 4,
  },
];

export function previewStarbucksMenu(): CoffeeMenu {
  return {
    available: true,
    purchasable: false,
    reason: null,
    offers: STARBUCKS_PREVIEW_OFFERS,
    sandbox: true,
  };
}

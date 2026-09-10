import type { Metadata } from "next";

import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { Reveal } from "@/components/ui/reveal";
import { loadCoffeeMenu, loadGiftMenu } from "@/lib/catalog-view";
import { isCoffeeBrand } from "@/lib/menu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "buy a card.",
  description: "Buy a Starbucks, Amazon, Steam, Netflix or other gift card with $BUCKS, SOL or USDC.",
};

export default async function CoffeePage({ searchParams }: PageProps<"/coffee">) {
  const params = await searchParams;
  const categoryId = typeof params.category === "string" ? params.category : undefined;
  const menu = categoryId ? await loadGiftMenu() : await loadCoffeeMenu();
  const coffeeOnly = !categoryId && menu.offers.every((offer) => isCoffeeBrand(offer.categoryName));

  return (
    <div className="px-4 pt-32 pb-16 sm:px-6 sm:pt-40">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">{coffeeOnly ? "buy coffee" : "buy a card"}</p>
          <h1 className="mt-4 text-[clamp(2.5rem,9vw,4.5rem)] leading-none font-medium tracking-[-0.04em]">
            <span className="text-sheen">{coffeeOnly ? "get coffee." : "pick a card."}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[0.9375rem] leading-relaxed text-cream-400">
            pick a card, pay with crypto, reveal the code. 0% platform fee.
          </p>
        </header>
      </Reveal>

      <div className="mt-12">
        <CheckoutFlow menu={menu} mode="purchase" initialCategoryId={categoryId} />
      </div>
    </div>
  );
}

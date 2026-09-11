import type { Metadata } from "next";

import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { Reveal } from "@/components/ui/reveal";
import { loadCoffeeMenu } from "@/lib/catalog-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get a gift card",
  description: "Buy a Starbucks gift card with USDC, SOL, or SBUXx.",
};

export default async function CoffeePage({ searchParams }: PageProps<"/coffee">) {
  const params = await searchParams;
  const cardId = typeof params.card === "string" ? params.card : undefined;
  const menu = await loadCoffeeMenu();

  return (
    <div className="px-4 pt-16 pb-8 sm:px-6 sm:pt-20">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">Checkout</p>
          <h1 className="font-display mt-1 text-[clamp(1.55rem,4vw,2.1rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Pick your card.
          </h1>
        </header>
      </Reveal>

      <div className="mt-4">
        <CheckoutFlow menu={menu} mode="purchase" initialCardId={cardId} />
      </div>
    </div>
  );
}

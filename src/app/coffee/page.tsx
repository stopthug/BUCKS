import type { Metadata } from "next";

import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { Reveal } from "@/components/ui/reveal";
import { loadCoffeeMenu } from "@/lib/catalog-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "get coffee.",
  description: "Buy a Starbucks gift card with $BUCKS, SBUXx, SOL or USDC.",
};

export default async function CoffeePage({ searchParams }: PageProps<"/coffee">) {
  const params = await searchParams;
  const cardId = typeof params.card === "string" ? params.card : undefined;
  const menu = await loadCoffeeMenu();

  return (
    <div className="px-4 pt-32 pb-16 sm:px-6 sm:pt-40">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">buy coffee</p>
          <h1 className="mt-4 text-[clamp(2.5rem,9vw,4.5rem)] leading-none font-medium tracking-[-0.04em]">
            <span className="text-sheen">get coffee.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[0.9375rem] leading-relaxed text-cream-400">
            pick a Starbucks card, pay with your wallet, reveal the code. 0% platform fee.
          </p>
        </header>
      </Reveal>

      <div className="mt-12">
        <CheckoutFlow menu={menu} mode="purchase" initialCardId={cardId} />
      </div>
    </div>
  );
}

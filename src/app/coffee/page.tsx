import type { Metadata } from "next";

import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { Reveal } from "@/components/ui/reveal";
import { loadCoffeeMenu } from "@/lib/catalog-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get a gift card",
  description: "Buy a Starbucks gift card with $BUCKS, SBUXx, SOL, or USDC.",
};

export default async function CoffeePage({ searchParams }: PageProps<"/coffee">) {
  const params = await searchParams;
  const cardId = typeof params.card === "string" ? params.card : undefined;
  const menu = await loadCoffeeMenu();

  return (
    <div className="px-4 pt-32 pb-24 sm:px-6 sm:pt-36">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">Checkout</p>
          <h1 className="font-display mt-4 text-[clamp(2.4rem,8vw,4.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Pick your card.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink-soft">
            Choose a value, pay with your wallet, get the code. No platform fee.
          </p>
        </header>
      </Reveal>

      <div className="mt-12">
        <CheckoutFlow menu={menu} mode="purchase" initialCardId={cardId} />
      </div>
    </div>
  );
}

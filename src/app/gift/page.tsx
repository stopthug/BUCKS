import type { Metadata } from "next";

import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { Reveal } from "@/components/ui/reveal";
import { loadCoffeeMenu } from "@/lib/catalog-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Send a gift",
  description: "Buy a Starbucks card and send it as a link. They don’t need a wallet to open it.",
};

export default async function GiftPage({ searchParams }: PageProps<"/gift">) {
  const params = await searchParams;
  const cardId = typeof params.card === "string" ? params.card : undefined;
  const menu = await loadCoffeeMenu();

  return (
    <div className="px-4 pt-16 pb-8 sm:px-6 sm:pt-20">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">Gift</p>
          <h1 className="font-display mt-1 text-[clamp(1.5rem,4vw,2.1rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Send someone a coffee.
          </h1>
        </header>
      </Reveal>

      <div className="mt-4">
        <CheckoutFlow menu={menu} mode="gift" initialCardId={cardId} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";

import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { Reveal } from "@/components/ui/reveal";
import { loadCoffeeMenu } from "@/lib/catalog-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "send someone a coffee.",
  description: "Buy a Starbucks card with your wallet and send it as a link. No wallet needed to claim.",
};

export default async function GiftPage({ searchParams }: PageProps<"/gift">) {
  const params = await searchParams;
  const cardId = typeof params.card === "string" ? params.card : undefined;
  const menu = await loadCoffeeMenu();

  return (
    <div className="px-4 pt-32 pb-16 sm:px-6 sm:pt-40">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">send a coffee</p>
          <h1 className="mt-4 text-[clamp(2.25rem,8vw,4rem)] leading-[0.95] font-medium tracking-[-0.04em]">
            <span className="text-sheen">send someone</span>
            <span className="text-sheen font-display block italic">a coffee.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-cream-400">
            buy it with your wallet.
            <br />
            send them a link.
          </p>
        </header>
      </Reveal>

      <div className="mt-12">
        <CheckoutFlow menu={menu} mode="gift" initialCardId={cardId} />
      </div>
    </div>
  );
}

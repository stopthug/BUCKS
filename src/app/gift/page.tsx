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
    <div className="px-4 pt-32 pb-24 sm:px-6 sm:pt-36">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">Gift</p>
          <h1 className="font-display mt-4 text-[clamp(2.25rem,8vw,4rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Send someone a coffee.
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-[1.125rem] leading-relaxed text-ink">
            You pay. They get a Starbucks gift card link. They don’t need a wallet to open it.
          </p>
        </header>
      </Reveal>

      <div className="mt-12">
        <CheckoutFlow menu={menu} mode="gift" initialCardId={cardId} />
      </div>
    </div>
  );
}

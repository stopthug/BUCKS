import { FeaturedCards } from "@/components/home/featured-cards";
import { Hero } from "@/components/home/hero";
import { PairSection } from "@/components/home/pair-section";
import { Statement, Utility } from "@/components/home/utility";
import { loadGiftMenu } from "@/lib/catalog-view";
import { getPairMarket } from "@/lib/market/pair";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [menu, market] = await Promise.all([
    loadGiftMenu(),
    getPairMarket().catch(() => null),
  ]);

  return (
    <>
      <Hero />
      <FeaturedCards menu={menu} />
      <Utility />
      <Statement />
      {market ? <PairSection market={market} /> : null}
    </>
  );
}

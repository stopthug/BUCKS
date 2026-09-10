import type { Metadata } from "next";

import { PairSection } from "@/components/home/pair-section";
import { GlassCard } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { getPairMarket } from "@/lib/market/pair";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trade $BUCKS / SBUXx",
  description: "$BUCKS is designed to trade against SBUXx, tokenized Starbucks stock on Solana.",
};

export default async function TradePage() {
  const market = await getPairMarket().catch(() => null);

  return (
    <div className="px-4 pt-32 pb-24 sm:px-6 sm:pt-36">
      <Reveal>
        <header className="mx-auto max-w-3xl text-center">
          <p className="label-mono">The pair</p>
          <h1 className="font-display mt-4 text-[clamp(2.25rem,7vw,3.75rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            $BUCKS / SBUXx
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[1.05rem] leading-relaxed text-ink-soft">
            SBUXx is tokenized Starbucks stock on Solana. $BUCKS is built to trade next to it —
            and to buy the same coffee.
          </p>
        </header>
      </Reveal>

      <div className="mt-14">
        {market ? (
          <PairSection market={market} />
        ) : (
          <div className="mx-auto max-w-6xl">
            <GlassCard className="p-12 text-center">
              <p className="text-lg text-ink">The pair isn’t live yet.</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                When it is, the price will show up here.
              </p>
            </GlassCard>
          </div>
        )}
      </div>

      <Reveal>
        <div className="mx-auto mt-16 max-w-3xl">
          <GlassCard className="p-8">
            <p className="label-mono">Please read</p>
            <ul className="mt-5 space-y-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              <li>$BUCKS is a community project. Starbucks did not create or endorse it.</li>
              <li>
                $BUCKS is not backed by Starbucks shares. Trading against SBUXx does not mean you
                can redeem $BUCKS for stock.
              </li>
              <li>SBUXx is run by someone else. Their rules, not ours.</li>
              <li>
                You can pay for a gift card with $BUCKS, SBUXx, SOL, or USDC because we can price
                them — not because of any deal with Starbucks.
              </li>
            </ul>
          </GlassCard>
        </div>
      </Reveal>
    </div>
  );
}

import type { Metadata } from "next";

import { PairSection } from "@/components/home/pair-section";
import { GlassCard } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { getPairMarket } from "@/lib/market/pair";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "trade $BUCKS / SBUXx",
  description: "$BUCKS is paired with SBUXx, the tokenized Starbucks stock asset on Solana.",
};

export default async function TradePage() {
  const market = await getPairMarket().catch(() => null);

  return (
    <div className="px-4 pt-32 pb-16 sm:px-6 sm:pt-40">
      <Reveal>
        <header className="mx-auto max-w-3xl text-center">
          <p className="label-mono">the pair</p>
          <h1 className="mt-4 text-[clamp(2.25rem,7vw,3.75rem)] leading-[0.98] font-medium tracking-[-0.04em]">
            <span className="text-sheen">$BUCKS</span>
            <span className="text-cream-500"> / </span>
            <span className="text-sheen">SBUXx</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-cream-400">
            SBUXx is a third-party tokenized Starbucks stock asset on Solana. $BUCKS is designed to
            trade against it — and to be spendable on the same coffee.
          </p>
        </header>
      </Reveal>

      <div className="mt-14">
        {market ? (
          <PairSection market={market} />
        ) : (
          <div className="mx-auto max-w-6xl px-0">
            <GlassCard className="p-12 text-center">
              <p className="text-lg text-cream-200">$BUCKS / SBUXx pair coming soon.</p>
            </GlassCard>
          </div>
        )}
      </div>

      <Reveal>
        <div className="mx-auto mt-16 max-w-3xl">
          <GlassCard className="p-8">
            <p className="label-mono">read this part</p>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-cream-400">
              <li>
                $BUCKS is an independent community project. Starbucks Corporation did not create,
                sponsor, endorse or partner with it.
              </li>
              <li>
                $BUCKS is not backed by Starbucks shares. Trading against SBUXx does not make
                $BUCKS redeemable for SBUXx, for stock, or for any claim on a company.
              </li>
              <li>
                SBUXx is issued and operated by a third party. Its availability, eligibility and
                terms are theirs, not ours.
              </li>
              <li>
                The gift-card utility on this site works with $BUCKS, SBUXx, SOL and USDC because
                any of them can be priced and settled — not because of any relationship with
                Starbucks.
              </li>
            </ul>
          </GlassCard>
        </div>
      </Reveal>
    </div>
  );
}

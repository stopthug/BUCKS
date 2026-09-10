import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "About",
  description: "$BUCKS is a coffee token on Solana. Buy a Starbucks card, or send one as a gift.",
};

export default function AboutPage() {
  return (
    <div className="px-4 pt-32 pb-24 sm:px-6 sm:pt-36">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">About</p>
          <h1 className="font-display mt-4 text-[clamp(2.25rem,7vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            A coffee token that buys coffee.
          </h1>
        </header>
      </Reveal>

      <div className="mx-auto mt-14 max-w-2xl space-y-4">
        <Reveal>
          <GlassCard className="p-8">
            <h2 className="text-lg font-medium tracking-[-0.02em] text-ink">What this is</h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              $BUCKS is a Solana token with one job: buy a Starbucks gift card. You can keep the
              card, or send it as a link.
            </p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              There’s no staking, farming, or points. Pick a card, pay, get a code.
            </p>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.05}>
          <GlassCard className="p-8">
            <h2 className="text-lg font-medium tracking-[-0.02em] text-ink">How buying works</h2>
            <ol className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              <li>
                <span className="font-medium text-ink">Live stock.</span> Cards come from a
                reseller. We show what’s actually available, at the real price.
              </li>
              <li>
                <span className="font-medium text-ink">A live price.</span> Your payment is priced
                in USDC. If you pay with USDC, there’s no swap.
              </li>
              <li>
                <span className="font-medium text-ink">One signature.</span> You approve one
                transaction. We never ask for a seed phrase.
              </li>
              <li>
                <span className="font-medium text-ink">Checked on-chain.</span> We read the payment
                back from Solana before we buy the card.
              </li>
              <li>
                <span className="font-medium text-ink">Codes stay private.</span> Gift card codes
                are encrypted, never logged, and only shown to the person who should see them.
              </li>
            </ol>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassCard className="p-8">
            <h2 className="text-lg font-medium tracking-[-0.02em] text-ink">What we are not</h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              $BUCKS is a community project. Starbucks did not make this, sponsor it, or partner
              with us. SBUXx is someone else’s token.
            </p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              $BUCKS is not backed by Starbucks shares and cannot be redeemed for SBUXx. It’s a
              token, a website, and a button that buys coffee.
            </p>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-center">
            <ButtonLink href="/coffee" size="lg">
              Get a gift card
            </ButtonLink>
            <ButtonLink href="/gift" variant="secondary" size="lg">
              Send a gift
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

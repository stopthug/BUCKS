import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "about",
  description:
    "$BUCKS is an independent community coffee token on Solana: buy a Starbucks card, or send one.",
};

export default function AboutPage() {
  return (
    <div className="px-4 pt-32 pb-16 sm:px-6 sm:pt-40">
      <Reveal>
        <header className="mx-auto max-w-2xl text-center">
          <p className="label-mono">about</p>
          <h1 className="mt-4 text-[clamp(2.25rem,7vw,3.5rem)] leading-[0.98] font-medium tracking-[-0.04em]">
            <span className="text-sheen">a coffee token</span>
            <span className="text-sheen font-display block italic">that buys coffee.</span>
          </h1>
        </header>
      </Reveal>

      <div className="mx-auto mt-14 max-w-2xl space-y-4">
        <Reveal>
          <GlassCard className="p-8">
            <h2 className="text-lg font-medium tracking-[-0.02em] text-cream-50">what this is</h2>
            <p className="mt-4 text-sm leading-relaxed text-cream-400">
              $BUCKS is a Solana coffee token built around one idea: Starbucks stock is tokenized,
              so the same portfolio that holds it should be able to buy the actual coffee. The site
              does two things — sell you a Starbucks gift card, or let you buy one for someone else
              and send it as a link.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-cream-400">
              There is no staking, no farming, no points, no leaderboard. You pick a Starbucks card,
              pay, and get a code. Or you send the coffee as a link.
            </p>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.05}>
          <GlassCard className="p-8">
            <h2 className="text-lg font-medium tracking-[-0.02em] text-cream-50">how it works</h2>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed text-cream-400">
              <li>
                <span className="text-cream-200">live inventory.</span> Cards come from a
                third-party reseller API. We look up available Starbucks categories at runtime and
                read real stock, real prices, and cover images. Nothing is hardcoded, so if they
                have none, we show none.
              </li>
              <li>
                <span className="text-cream-200">a server-side price.</span> Your payment is priced
                against the live market through Jupiter, in USDC terms. USDC payments skip the swap
                entirely.
              </li>
              <li>
                <span className="text-cream-200">one signature.</span> You approve a single
                transaction. We never ask for a private key or a seed phrase, and we never hold
                either.
              </li>
              <li>
                <span className="text-cream-200">onchain verification.</span> Our server reads the
                transaction back from Solana and checks the signature, status, payer, mint, amount
                and destination before a card is bought. A frontend claiming success counts for
                nothing.
              </li>
              <li>
                <span className="text-cream-200">encrypted at rest.</span> Redemption codes are
                encrypted the moment they arrive, never logged, never put in a URL, and only
                decrypted for the person entitled to see them.
              </li>
            </ol>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassCard className="p-8">
            <h2 className="text-lg font-medium tracking-[-0.02em] text-cream-50">
              what we are not
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream-400">
              $BUCKS is an independent community project and is not affiliated with or endorsed by
              Starbucks Corporation. Starbucks is a trademark of its respective owner. SBUXx is a
              third-party tokenized asset. Availability and eligibility may vary.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-cream-400">
              $BUCKS is not backed by Starbucks shares, is not redeemable for SBUXx, and is not an
              official anything. It is a token, a website, and a working coffee button.
            </p>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-center">
            <ButtonLink href="/coffee" size="lg">
              buy coffee
            </ButtonLink>
            <ButtonLink href="/gift" variant="secondary" size="lg">
              send a coffee
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

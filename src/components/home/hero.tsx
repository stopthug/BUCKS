import { ButtonLink } from "@/components/ui/button";
import { GlassPill, StatusDot } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";

/**
 * Hero. One idea, two actions, then the card grid below does the rest.
 */
export function Hero() {
  return (
    <section className="relative px-4 pt-32 pb-6 sm:px-6 sm:pt-44 sm:pb-10">
      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <GlassPill className="px-4 py-2">
            <StatusDot />
            <span className="font-mono text-[0.6875rem] tracking-[0.16em] uppercase">
              coffee + gift cards
            </span>
          </GlassPill>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-7 text-[clamp(2.75rem,10vw,6.5rem)] leading-[0.92] font-medium tracking-[-0.045em]">
            <span className="text-sheen block">buy real cards</span>
            <span className="text-sheen font-display block italic">with crypto.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-cream-400 sm:text-base">
            Starbucks coffee, Amazon, Steam, Netflix and more. Pay with $BUCKS, SOL or USDC.
            Keep the code, or send it as a link.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="#cards" size="lg" className="w-full sm:w-auto">
              see the cards
            </ButtonLink>
            <ButtonLink href="/gift" variant="secondary" size="lg" className="w-full sm:w-auto">
              send a gift
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

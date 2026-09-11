import { GlassCard } from "@/components/ui/glass";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";

const STEPS = [
  {
    number: "1",
    title: "Pick a card",
    body: "Choose $5, $10, $25, or $50. If it isn’t in stock, it won’t be here.",
  },
  {
    number: "2",
    title: "Pay with crypto",
    body: "Pay with $BUCKS, SBUXx, SOL, or USDC. No platform fee. Your wallet opens when you pay.",
  },
  {
    number: "3",
    title: "Use it — or gift it",
    body: "Reveal the code yourself, or send a link. They don’t need a wallet to open it.",
  },
] as const;

export function Utility() {
  return (
    <section className="relative px-4 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="max-w-2xl">
            <p className="label-mono">How it works</p>
            <h2 className="font-display mt-2 text-[clamp(1.75rem,4.5vw,2.6rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-ink">
              Three steps. That’s it.
            </h2>
            <p className="mt-3 max-w-lg text-[1.05rem] leading-relaxed text-ink">
              Partnered with Starbucks. Buy a gift card with crypto, or send one to a friend.
            </p>
          </div>
        </Reveal>

        <RevealGroup className="mt-6 grid gap-3 md:grid-cols-3">
          {STEPS.map((step) => (
            <RevealItem key={step.number}>
              <GlassCard className="group h-full p-5 transition-all duration-500 hover:-translate-y-1 sm:p-6">
                <p className="font-display text-2xl font-extrabold text-ink-soft">{step.number}</p>
                <p className="mt-3 text-lg leading-snug font-medium tracking-[-0.02em] text-ink">
                  {step.title}
                </p>
                <p className="mt-2 text-[1rem] leading-relaxed text-ink">{step.body}</p>
              </GlassCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function Statement() {
  return (
    <section className="relative px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <GlassCard className="p-6 sm:p-8">
            <p className="label-mono">Why $BUCKS</p>
            <p className="font-display mt-3 max-w-2xl text-[clamp(1.35rem,3.5vw,1.9rem)] leading-[1.15] font-extrabold tracking-[-0.03em] text-ink">
              A coffee token you can actually spend on coffee.
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <Column
                title="The token"
                body="$BUCKS is meant to trade next to SBUXx — tokenized Starbucks stock on Solana."
              />
              <Column
                title="The card"
                body="You get a real Starbucks gift card — we’re partnered with Starbucks. Not a fake code, not a screenshot."
              />
              <Column
                title="The payment"
                body="We check the transaction on Solana before we buy the card. No “trust us, it paid.”"
              />
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

function Column({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

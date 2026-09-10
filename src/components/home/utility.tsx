import { GlassCard } from "@/components/ui/glass";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";

const STEPS = [
  {
    number: "01",
    title: "pick a Starbucks card.",
    body: "choose a value from live inventory. if it isn't really in stock, it isn't on the menu.",
  },
  {
    number: "02",
    title: "pay with crypto.",
    body: "connect a wallet, choose $BUCKS, SBUXx, SOL or USDC, and approve one transaction. 0% platform fee.",
  },
  {
    number: "03",
    title: "get the card — or send it.",
    body: "reveal the code yourself, or turn it into a link anyone can open. no wallet needed to claim.",
  },
] as const;

export function Utility() {
  return (
    <section className="relative px-4 pt-24 sm:px-6 sm:pt-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="text-[clamp(2rem,6vw,3.75rem)] leading-[1] font-medium tracking-[-0.04em]">
              <span className="block text-cream-50">internet money.</span>
              <span className="font-display block text-cream-500 italic">real coffee.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-cream-400">
              buy a Starbucks card with your wallet, or send one to a friend. that&rsquo;s the
              whole product.
            </p>
          </div>
        </Reveal>

        <RevealGroup className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <RevealItem key={step.number}>
              <GlassCard className="group h-full p-6 transition-all duration-500 hover:-translate-y-1 sm:p-7">
                <p className="font-display text-3xl text-crema-300/70 italic">{step.number}</p>
                <p className="mt-6 text-lg leading-snug font-medium tracking-[-0.02em] text-cream-50">
                  {step.title}
                </p>
                <p className="mt-3 text-[0.875rem] leading-relaxed text-cream-500">{step.body}</p>
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
    <section className="relative px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <GlassCard className="p-8 text-center sm:p-14">
            <p className="label-mono">the idea</p>
            <p className="font-display mt-6 text-[clamp(1.75rem,5.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-cream-50">
              A coffee stock.
              <br />
              A coffee card.
              <span className="text-cream-500 italic"> One tap.</span>
            </p>

            <div className="mt-12 grid gap-8 text-left sm:grid-cols-3">
              <Column
                title="the pair"
                body="$BUCKS trades against SBUXx, tokenized Starbucks stock on Solana. the story and the spend point at the same place."
              />
              <Column
                title="the card"
                body="Starbucks gift cards from live provider inventory. no synthetic catalog, no invented codes."
              />
              <Column
                title="settlement"
                body="we check the payment on Solana before a card is issued. the site saying 'paid' is never enough."
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
      <p className="label-mono">{title}</p>
      <p className="mt-3 text-[0.8125rem] leading-relaxed text-cream-400">{body}</p>
    </div>
  );
}

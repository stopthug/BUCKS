import { ButtonLink } from "@/components/ui/button";
import { GlassCard, SectionHeading, StatusDot } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import type { CoffeeMenu } from "@/lib/menu";
import { errorCopy } from "@/lib/errors";
import { formatUsd } from "@/lib/money";

/**
 * Live inventory listing, in the spirit of the reference's brand table: a
 * quiet grid of rows with a status pill on the right. Every row is a real
 * offer from the provider catalog, priced at what it actually costs.
 */
export function MenuSection({ menu }: { menu: CoffeeMenu }) {
  return (
    <section className="relative px-4 pt-28 sm:px-6 sm:pt-36">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-mono">on the counter</p>
              <SectionHeading className="mt-3" lead="every card is real." trail="live inventory." />
            </div>
            {menu.available ? (
              <ButtonLink href="/coffee" variant="secondary" size="md">
                buy coffee
              </ButtonLink>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <GlassCard className="mt-10 overflow-hidden">
            {menu.available ? (
              <>
                <div className="hidden grid-cols-[1.6fr_1fr_1fr_auto] gap-4 border-b border-cream-200/8 px-6 py-4 sm:grid sm:px-8">
                  <p className="label-mono">card</p>
                  <p className="label-mono">value</p>
                  <p className="label-mono">you pay</p>
                  <p className="label-mono text-right">status</p>
                </div>

                <ul>
                  {menu.offers.slice(0, 8).map((offer) => (
                    <li
                      key={`${offer.categoryId}:${offer.cardId}`}
                      className="border-b border-cream-200/6 px-6 py-5 transition-colors duration-300 last:border-0 hover:bg-cream-100/4 sm:grid sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:items-center sm:gap-4 sm:px-8"
                    >
                      <div className="flex items-center gap-3">
                        <CardChip />
                        <div className="min-w-0">
                          <p className="truncate text-[0.9375rem] text-cream-100">
                            {offer.categoryName}
                          </p>
                          <p className="truncate text-xs text-cream-500">{offer.name}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-lg font-medium tracking-[-0.02em] text-cream-50 sm:mt-0">
                        {offer.faceValueUsd ? formatUsd(BigInt(offer.faceValueUsd)) : "—"}
                      </p>

                      <p className="mt-1 font-mono text-sm text-cream-400 sm:mt-0">
                        {formatUsd(BigInt(offer.providerPriceUsd))}
                      </p>

                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest-500/15 px-2.5 py-1 text-[0.6875rem] text-forest-300 sm:mt-0 sm:justify-self-end">
                        <StatusDot />
                        {offer.stock > 20 ? "in stock" : `${offer.stock} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="px-6 py-16 text-center sm:px-8">
                <p className="text-lg text-cream-200">{errorCopy(menu.reason)}</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream-500">
                  this list is generated from our provider&rsquo;s live catalog. nothing is
                  hardcoded, so when they have no Starbucks stock, we show none.
                </p>
              </div>
            )}
          </GlassCard>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-5 text-xs leading-relaxed text-cream-500">
            &ldquo;you pay&rdquo; is the provider&rsquo;s cost for the card. $BUCKS adds a 0%
            platform fee. network and swap costs are shown before you sign.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** A small card-shaped glyph: rounded rectangle with a magnetic stripe. */
function CardChip() {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-end rounded-lg p-1"
      style={{
        background: "linear-gradient(150deg, #2d6a46 0%, #1f4d34 55%, #123123 100%)",
        boxShadow:
          "inset 0 1px 2px rgba(255,255,255,0.18), 0 8px 18px -10px rgba(0,0,0,0.9)",
      }}
    >
      <span className="h-1 w-full rounded-full bg-cream-100/30" />
    </span>
  );
}

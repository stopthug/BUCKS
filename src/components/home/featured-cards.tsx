import Link from "next/link";

import { CardArt } from "@/components/cards/card-art";
import { ButtonLink } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/glass";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { errorCopy } from "@/lib/errors";
import { featuredShowcase, type CoffeeMenu } from "@/lib/menu";
import { formatUsd } from "@/lib/money";

/**
 * The storefront. Live cards from the provider API, with cover art as the
 * thing you actually look at — not a table of numbers.
 */
export function FeaturedCards({ menu }: { menu: CoffeeMenu }) {
  const cards = featuredShowcase(menu.offers);

  return (
    <section id="cards" className="relative px-4 pt-10 pb-8 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-mono">the cards</p>
              <h2 className="mt-3 text-[clamp(1.75rem,5vw,3rem)] leading-[1.05] font-medium tracking-[-0.04em] text-cream-50">
                real gift cards.
                <span className="font-display text-cream-500 italic"> pick one.</span>
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-cream-500">
                fetched live from our card provider. if it isn&rsquo;t in stock, it isn&rsquo;t here.
              </p>
            </div>
            <ButtonLink href="/gift" variant="secondary" size="md">
              send as a gift
            </ButtonLink>
          </div>
        </Reveal>

        {menu.available ? (
          <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((offer, index) => (
              <RevealItem key={`${offer.categoryId}:${offer.cardId}`}>
                <Link
                  href={`/coffee?category=${encodeURIComponent(offer.categoryId)}`}
                  className="group glass block overflow-hidden rounded-glass transition-all duration-500 hover:-translate-y-1 hover:border-cream-200/20"
                >
                  <CardArt
                    src={offer.imageUrl}
                    alt={`${offer.categoryName} gift card`}
                    className="rounded-none"
                    priority={index < 4}
                  />
                  <div className="px-4 py-4">
                    <p className="truncate text-[0.9375rem] font-medium tracking-[-0.02em] text-cream-50">
                      {offer.categoryName}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-cream-400">
                        from {offer.faceValueUsd ? formatUsd(BigInt(offer.faceValueUsd)) : formatUsd(BigInt(offer.providerPriceUsd))}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-forest-300">
                        <StatusDot />
                        in stock
                      </span>
                    </div>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <Reveal delay={0.08}>
            <div className="glass mt-10 rounded-glass px-6 py-16 text-center">
              <p className="text-lg text-cream-200">{errorCopy(menu.reason)}</p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream-500">
                we only list cards we can actually deliver. this stays empty until inventory is back.
              </p>
            </div>
          </Reveal>
        )}

        {menu.sandbox ? (
          <p className="mt-5 text-center font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-crema-300">
            development fixture — not live provider data
          </p>
        ) : null}
      </div>
    </section>
  );
}

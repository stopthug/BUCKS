import Link from "next/link";

import { CardArt } from "@/components/cards/card-art";
import { ButtonLink } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/glass";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { errorCopy } from "@/lib/errors";
import { catalogNotice, distinctDenominations, type CoffeeMenu } from "@/lib/menu";
import { formatUsd } from "@/lib/money";

/**
 * Starbucks cards from the live provider catalog. Cover art plus the value
 * is the thing you look at — not a table of numbers.
 */
export function FeaturedCards({ menu }: { menu: CoffeeMenu }) {
  const cards = distinctDenominations(menu.offers).slice(0, 8);
  const notice = catalogNotice(menu);

  return (
    <section id="cards" className="relative px-4 pt-10 pb-8 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-mono">starbucks cards</p>
              <h2 className="mt-3 text-[clamp(1.75rem,5vw,3rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-ink">
                Real coffee cards. Pick a value.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                Live Starbucks inventory. If it isn’t in stock, it isn’t here.
              </p>
            </div>
            <ButtonLink href="/gift" variant="secondary" size="md">
              Send a gift
            </ButtonLink>
          </div>
        </Reveal>

        {menu.available ? (
          <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((offer, index) => {
              const value = offer.faceValueUsd
                ? formatUsd(BigInt(offer.faceValueUsd))
                : offer.name;

              return (
                <RevealItem key={`${offer.categoryId}:${offer.cardId}`}>
                  <Link
                    href={`/coffee?card=${encodeURIComponent(offer.cardId)}`}
                    className="group block overflow-visible rounded-glass transition-all duration-500 hover:-translate-y-1"
                  >
                    <div className="relative">
                      <CardArt
                        alt={`${offer.categoryName} ${value} gift card`}
                        faceValueUsd={offer.faceValueUsd}
                        seed={offer.cardId}
                        className="rounded-none"
                        priority={index < 4}
                      />
                    </div>
                    <div className="px-4 py-4">
                      <p className="truncate text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                        {offer.categoryName}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-sm text-ink-soft">
                          {formatUsd(BigInt(offer.providerPriceUsd))} at checkout
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-forest-300">
                          <StatusDot />
                          {menu.purchasable
                            ? offer.stock > 20
                              ? "in stock"
                              : `${offer.stock} left`
                            : "preview"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </RevealItem>
              );
            })}
          </RevealGroup>
        ) : (
          <Reveal delay={0.08}>
            <div className="glass mt-10 rounded-glass px-6 py-16 text-center">
              <p className="text-lg text-cream-200">{errorCopy(menu.reason)}</p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream-500">
                we only list Starbucks cards we can actually deliver. this stays empty until
                inventory is back.
              </p>
            </div>
          </Reveal>
        )}

        {notice ? (
          <p className="mt-5 text-center font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-crema-300">
            {notice}
          </p>
        ) : null}
      </div>
    </section>
  );
}

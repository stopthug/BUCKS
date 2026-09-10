import Link from "next/link";

import { CardArt } from "@/components/cards/card-art";
import { ButtonLink } from "@/components/ui/button";
import { GlassPill, StatusDot } from "@/components/ui/glass";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { errorCopy } from "@/lib/errors";
import { catalogNotice, distinctDenominations, type CoffeeMenu } from "@/lib/menu";
import { formatUsd } from "@/lib/money";

/**
 * Hero plus the Starbucks cards. The thumbnails sit under the headline so
 * they are the first thing you see, not something you have to scroll for.
 */
export function Hero({ menu }: { menu: CoffeeMenu }) {
  const cards = distinctDenominations(menu.offers).slice(0, 4);
  const notice = catalogNotice(menu);

  return (
    <section className="relative px-4 pt-32 pb-8 sm:px-6 sm:pt-40">
      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <GlassPill className="px-4 py-2">
            <StatusDot />
            <span className="font-mono text-[0.6875rem] tracking-[0.16em] uppercase">
              $BUCKS / SBUXx
            </span>
          </GlassPill>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-7 text-[clamp(2.75rem,10vw,6.5rem)] leading-[0.92] font-medium tracking-[-0.045em]">
            <span className="text-sheen block">coffee meets</span>
            <span className="text-sheen font-display block italic">stocks.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-cream-400 sm:text-base">
            $BUCKS is paired with Starbucks stock on Solana. Pay with $BUCKS, SBUXx, SOL or USDC
            to buy a real Starbucks card — or send one as a link.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/coffee" size="lg" className="w-full sm:w-auto">
              buy coffee
            </ButtonLink>
            <ButtonLink href="/gift" variant="secondary" size="lg" className="w-full sm:w-auto">
              send a coffee
            </ButtonLink>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.24} y={28}>
        <div id="cards" className="relative mx-auto mt-14 max-w-6xl sm:mt-16">
          {menu.available ? (
            <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((offer, index) => {
                const value = offer.faceValueUsd
                  ? formatUsd(BigInt(offer.faceValueUsd))
                  : offer.name;

                return (
                  <RevealItem key={`${offer.categoryId}:${offer.cardId}`}>
                    <Link
                      href={`/coffee?card=${encodeURIComponent(offer.cardId)}`}
                      className="group glass block overflow-hidden rounded-glass transition-all duration-500 hover:-translate-y-1 hover:border-cream-200/20"
                    >
                      <div className="relative">
                        <CardArt
                          src={offer.imageUrl}
                          alt={`${offer.categoryName} ${value} gift card`}
                          className="rounded-none"
                          priority={index < 4}
                        />
                        <p className="absolute right-4 bottom-4 text-3xl font-medium tracking-[-0.04em] text-cream-50 drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)]">
                          {value}
                        </p>
                      </div>
                      <div className="px-4 py-4">
                        <p className="truncate text-[0.9375rem] font-medium tracking-[-0.02em] text-cream-50">
                          Starbucks
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-sm text-cream-400">
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
            <div className="glass rounded-glass px-6 py-14 text-center">
              <p className="text-lg text-cream-200">{errorCopy(menu.reason)}</p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream-500">
                we only list Starbucks cards we can actually deliver. this stays empty until
                inventory is back.
              </p>
            </div>
          )}

          {notice ? (
            <p className="mt-5 text-center font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-crema-300">
              {notice}
            </p>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}

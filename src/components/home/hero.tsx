import Link from "next/link";

import { StarbucksPartner } from "@/components/brand/starbucks-mark";
import { CardArt } from "@/components/cards/card-art";
import { CheckoutSplit } from "@/components/checkout/checkout-split";
import {
  DoodleCardsIcon,
  DoodleEnvelopeIcon,
  DoodleHeartIcon,
  DoodleTagIcon,
} from "@/components/home/doodle-cards";
import { HeroFan } from "@/components/home/hero-fan";
import { ButtonLink } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/glass";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { errorCopy } from "@/lib/errors";
import { catalogNotice, doodleSeedForOffer, stockLabel, type CoffeeMenu } from "@/lib/menu";
import { formatUsd } from "@/lib/money";

const WAYS = [
  {
    title: "Send a gift link",
    body: "You pay. They open a link. No wallet needed on their side.",
    href: "/gift",
    action: "Send a gift",
    icon: DoodleEnvelopeIcon,
  },
  {
    title: "Pay with crypto",
    body: "Buy with $BUCKS, SBUXx, SOL, or USDC. No platform fee.",
    href: "/coffee",
    action: "Get a gift card",
    icon: DoodleHeartIcon,
  },
  {
    title: "Use it in the app",
    body: "A real Starbucks gift card. Scan it, or read the code at the till.",
    href: "/coffee",
    action: "Get a gift card",
    icon: DoodleCardsIcon,
  },
  {
    title: "Keep it or share it",
    body: "Buy one for yourself, or send four. Same checkout.",
    href: "/gift",
    action: "Send a gift",
    icon: DoodleTagIcon,
  },
] as const;

export function Hero({ menu }: { menu: CoffeeMenu }) {
  const cards = menu.offers.slice(0, 12);
  const notice = catalogNotice(menu);

  return (
    <>
      <section className="relative px-4 pt-20 pb-8 sm:px-6 sm:pt-24 sm:pb-10">
        <div className="relative mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[1fr_minmax(0,20rem)_1fr] lg:gap-3">
          <div className="hidden lg:order-1 lg:block">
            <HeroFan side="left" />
          </div>

          <div className="text-center lg:order-2">
            <Reveal>
              <StarbucksPartner size="lg" />
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="font-display mt-3 text-[clamp(2rem,8vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.04em] text-ink">
                Gift the perfect cup
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mx-auto mt-3 max-w-sm text-[1.05rem] leading-relaxed text-ink">
                Official Starbucks gift cards, paid with $BUCKS, SBUXx, SOL, or USDC.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[1.05rem] leading-relaxed text-ink">
                Keep one, or send the link.
              </p>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="mt-5 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="/coffee" size="lg" className="w-full sm:w-auto">
                  Get a gift card
                </ButtonLink>
                <ButtonLink href="/gift" variant="secondary" size="lg" className="w-full sm:w-auto">
                  Send a gift
                </ButtonLink>
              </div>
            </Reveal>

            <div className="mt-8 lg:hidden">
              <HeroFan side="left" compact />
            </div>
          </div>

          <div className="hidden lg:order-3 lg:block">
            <HeroFan side="right" />
          </div>
        </div>
      </section>

      <section className="relative px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {WAYS.map((way) => (
            <div key={way.title} className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center text-ink">
                <way.icon />
              </span>
              <h2 className="mt-3 text-lg font-extrabold tracking-[-0.02em] text-ink">{way.title}</h2>
              <p className="mx-auto mt-1.5 max-w-[16rem] text-[0.8125rem] leading-relaxed text-ink sm:text-[0.9375rem]">
                {way.body}
              </p>
              <Link href={way.href} className="btn-doodle-ghost mt-3 inline-flex h-9 items-center rounded-[1.2rem] px-3 text-[0.8rem] sm:h-10 sm:px-5 sm:text-[0.9rem]">
                {way.action}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="relative px-4 pb-10 sm:px-6">
        <div id="cards" className="relative mx-auto max-w-4xl">
          <div className="mb-4 text-center">
            <p className="label-mono">Gift cards</p>
            <h2 className="mt-1 text-[clamp(1.55rem,4vw,2.1rem)] font-extrabold tracking-[-0.03em] text-ink">
              Starbucks gift cards
            </h2>
          </div>
          {menu.available ? (
            <RevealGroup className={cards.length === 1 ? undefined : "grid gap-4 sm:grid-cols-1"}>
              {cards.map((offer) => {
                const value = offer.faceValueUsd
                  ? formatUsd(BigInt(offer.faceValueUsd))
                  : offer.name;
                const soldOut = offer.stock <= 0;

                return (
                  <RevealItem key={`${offer.categoryId}:${offer.cardId}`}>
                    <CheckoutSplit
                      art={
                        <CardArt
                          alt={`${offer.categoryName} ${value} gift card`}
                          className="w-full"
                          faceValueUsd={offer.faceValueUsd}
                          seed={doodleSeedForOffer(offer)}
                        />
                      }
                    >
                      <h3 className="text-xl font-extrabold tracking-[-0.02em] text-ink">
                        Buy a gift card
                      </h3>
                      <p className="mt-0.5 text-sm font-semibold text-ink-soft">{offer.categoryName}</p>
                      <div className="glass-soft mt-3 rounded-[1.05rem] px-3 py-2.5">
                        <p className="text-[0.975rem] font-extrabold text-ink">{value}</p>
                        <p className="mt-0.5 text-[0.8125rem] font-semibold text-ink">
                          {formatUsd(BigInt(offer.providerPriceUsd))}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold text-ink-soft">
                          <StatusDot />
                          {menu.sandbox && !menu.purchasable ? "Preview" : stockLabel(offer.stock)}
                        </p>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <ButtonLink
                          href={`/coffee?card=${encodeURIComponent(offer.cardId)}`}
                          size="lg"
                          className="flex-1"
                        >
                          {soldOut ? "Out of stock" : "Get a gift card"}
                        </ButtonLink>
                        <ButtonLink
                          href={`/gift?card=${encodeURIComponent(offer.cardId)}`}
                          variant="secondary"
                          size="lg"
                          className="flex-1"
                        >
                          Send a gift
                        </ButtonLink>
                      </div>
                    </CheckoutSplit>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          ) : (
            <div className="doodle-panel px-6 py-14 text-center">
              <p className="text-2xl font-extrabold tracking-[-0.02em] text-ink">{errorCopy(menu.reason)}</p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
                {menu.reason === "provider_unconfigured"
                  ? "This deploy doesn’t have the card supplier connected yet. That’s a server setting, not an empty shelf."
                  : "We only list cards we can send. Check back when stock returns."}
              </p>
            </div>
          )}

          {notice ? (
            <p className="mt-5 text-center text-sm text-ink-soft">{notice}</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

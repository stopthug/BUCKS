import Link from "next/link";

import { CardArt } from "@/components/cards/card-art";
import {
  DoodleCardsIcon,
  DoodleCupIcon,
  DoodleEnvelopeIcon,
  DoodleHeartIcon,
  DoodleTagIcon,
} from "@/components/home/doodle-cards";
import { HeroFan } from "@/components/home/hero-fan";
import { ButtonLink } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/glass";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import { errorCopy } from "@/lib/errors";
import { catalogNotice, distinctDenominations, type CoffeeMenu } from "@/lib/menu";
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
  const cards = distinctDenominations(menu.offers).slice(0, 4);
  const notice = catalogNotice(menu);

  return (
    <>
      <section className="relative bg-mint px-4 pt-28 pb-16 sm:px-6 sm:pt-32 sm:pb-20">
        <Scribbles />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_minmax(0,22rem)_1fr] lg:gap-4">
          <div className="order-2 lg:order-1">
            <HeroFan side="left" />
          </div>

          <div className="order-1 text-center lg:order-2">
            <Reveal>
              <span className="mx-auto flex size-12 items-center justify-center text-ink">
                <DoodleCupIcon />
              </span>
              <p className="label-mono mt-3">Starbucks gift cards</p>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="font-display mt-3 text-[clamp(2.4rem,6.5vw,4.25rem)] leading-[1.02] font-extrabold tracking-[-0.04em] text-ink">
                Gift the perfect cup
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mx-auto mt-5 max-w-sm text-[1.05rem] leading-relaxed text-ink-soft">
                A real Starbucks card. Paid with $BUCKS, SBUXx, SOL, or USDC. Keep it, or send the
                link.
              </p>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="/coffee" size="lg">
                  Get a gift card
                </ButtonLink>
                <ButtonLink href="/gift" variant="secondary" size="lg">
                  Send a gift
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          <div className="order-3">
            <HeroFan side="right" />
          </div>
        </div>
      </section>

      <section className="bg-paper px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {WAYS.map((way) => (
            <div key={way.title} className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center text-ink">
                <way.icon />
              </span>
              <h2 className="mt-4 text-lg font-extrabold tracking-[-0.02em] text-ink">{way.title}</h2>
              <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-ink-soft">
                {way.body}
              </p>
              <Link href={way.href} className="btn-doodle-ghost mt-5 inline-flex h-10 items-center rounded-[1.2rem] px-5">
                {way.action}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-paper px-4 pb-16 sm:px-6">
        <div id="cards" className="relative mx-auto max-w-6xl">
          {menu.available ? (
            <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((offer, index) => {
                const value = offer.faceValueUsd
                  ? formatUsd(BigInt(offer.faceValueUsd))
                  : offer.name;

                return (
                  <RevealItem key={`${offer.categoryId}:${offer.cardId}`}>
                    <Link
                      href={`/coffee?card=${encodeURIComponent(offer.cardId)}`}
                      className="group block"
                    >
                      <div
                        className={cn(
                          "relative transition-transform duration-300 group-hover:rotate-0",
                          ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"][index % 4],
                        )}
                      >
                        <CardArt
                          alt={`${offer.categoryName} ${value} gift card`}
                          faceValueUsd={offer.faceValueUsd}
                          seed={offer.cardId}
                          className="rounded-none bg-transparent shadow-none"
                          priority={index < 4}
                        />
                      </div>
                      <div className="px-2 pt-3">
                        <p className="text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink">Starbucks</p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="text-sm text-ink-soft">
                            {formatUsd(BigInt(offer.providerPriceUsd))} at checkout
                          </p>
                          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-forest-500">
                            <StatusDot />
                            {menu.purchasable
                              ? offer.stock > 20
                                ? "In stock"
                                : `${offer.stock} left`
                              : "Preview"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          ) : (
            <div className="doodle-panel px-6 py-14 text-center">
              <p className="text-2xl font-extrabold tracking-[-0.02em] text-ink">{errorCopy(menu.reason)}</p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
                We only list cards we can send. Check back when stock returns.
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

function Scribbles() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-ink/20"
      viewBox="0 0 1200 640"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path d="M40 90c20-10 20 10 40 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M92 70l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1100 140c-24-8-18 16-42 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M80 520c30 8 28-16 58-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M160 430c8-18 4-8 18-24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M1040 480c-18 10-12-14-34-2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1120 88l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M600 40c18-6 16 10 34 2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

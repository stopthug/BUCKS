import { ButtonLink } from "@/components/ui/button";
import { GlassCard, SectionHeading, StatusDot } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import type { PairMarket } from "@/lib/market/pair";

/**
 * $BUCKS / SBUXx.
 *
 * Every number here comes from the configured DEX pair. With no pair
 * configured the section says the pair is coming soon and shows nothing else —
 * no invented price, no decorative chart, no fake sparkline.
 */
export function PairSection({ market }: { market: PairMarket }) {
  return (
    <section className="relative px-4 pb-10 sm:px-6" id="pair">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-mono">The pair</p>
              <SectionHeading
                className="mt-3"
                lead="Paired with Starbucks stock."
                trail={market.configured ? undefined : "Soon."}
              />
            </div>

            {market.configured && market.tradeUrl ? (
              <ButtonLink href={market.tradeUrl} variant="secondary" size="md">
                Trade
              </ButtonLink>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <GlassCard className="mt-6 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-cream-200/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex items-center gap-3">
                <p className="text-xl font-medium tracking-[-0.02em] text-ink">
                  $BUCKS <span className="text-ink-soft">/</span> SBUXx
                </p>
                {market.configured ? (
                  <span className="inline-flex items-center gap-1.5 bg-forest-500/15 px-2.5 py-1 text-[0.6875rem] text-forest-500">
                    <StatusDot />
                    {market.dexId ?? "live"}
                  </span>
                ) : null}
              </div>

              {market.configured && market.priceChange24hPct !== null ? (
                <p
                  className={`font-mono text-sm ${
                    market.priceChange24hPct >= 0 ? "text-forest-500" : "text-roast-500"
                  }`}
                >
                  {market.priceChange24hPct >= 0 ? "+" : ""}
                  {market.priceChange24hPct.toFixed(2)}% · 24h
                </p>
              ) : null}
            </div>

            {market.configured ? (
              <>
                <dl className="grid gap-px bg-cream-200/6 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Price" value={formatPrice(market)} />
                  <Metric label="Liquidity" value={formatUsdNumber(market.liquidityUsd)} />
                  <Metric label="Volume 24h" value={formatUsdNumber(market.volume24hUsd)} />
                  <Metric
                    label="Pair address"
                    value={market.pairAddress ? shorten(market.pairAddress) : "—"}
                    mono
                    title={market.pairAddress ?? undefined}
                  />
                </dl>

                <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <p className="text-xs leading-relaxed text-ink-soft">
                    Prices come from the live DEX pair. Trading against SBUXx does not mean you can
                    redeem $BUCKS for SBUXx.
                  </p>
                  {market.dexscreenerUrl ? (
                    <a
                      href={market.dexscreenerUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="shrink-0 text-[0.8125rem] text-ink-soft transition-colors hover:text-ink"
                    >
                      View chart →
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="px-6 py-16 text-center sm:px-8">
                <p className="text-lg text-ink">The pair isn’t live yet.</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                  There’s no pair address set, so there’s no price to show.
                </p>
              </div>
            )}
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  mono,
  title,
}: {
  label: string;
  value: string;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div className="bg-foam/70 px-6 py-6 sm:px-8">
      <dt className="label-mono">{label}</dt>
      <dd
        title={title}
        className={`mt-3 text-xl tracking-[-0.02em] text-ink ${mono ? "font-mono text-base" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatPrice(market: PairMarket): string {
  if (market.priceUsd) return `$${market.priceUsd}`;
  if (market.priceNative && market.quoteSymbol) {
    return `${market.priceNative} ${market.quoteSymbol}`;
  }
  return "—";
}

function formatUsdNumber(value: number | null): string {
  if (value === null) return "—";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

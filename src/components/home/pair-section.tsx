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
    <section className="relative px-4 sm:px-6" id="pair">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-mono">the pair</p>
              <SectionHeading
                className="mt-3"
                lead="paired with Starbucks stock."
                trail={market.configured ? undefined : "soon."}
              />
            </div>

            {market.configured && market.tradeUrl ? (
              <ButtonLink href={market.tradeUrl} variant="secondary" size="md">
                trade
              </ButtonLink>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <GlassCard className="mt-10 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-cream-200/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex items-center gap-3">
                <p className="text-xl font-medium tracking-[-0.02em] text-cream-50">
                  $BUCKS <span className="text-cream-500">/</span> SBUXx
                </p>
                {market.configured ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-500/15 px-2.5 py-1 text-[0.6875rem] text-forest-300">
                    <StatusDot />
                    {market.dexId ?? "live"}
                  </span>
                ) : null}
              </div>

              {market.configured && market.priceChange24hPct !== null ? (
                <p
                  className={`font-mono text-sm ${
                    market.priceChange24hPct >= 0 ? "text-forest-300" : "text-crema-300"
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
                  <Metric label="price" value={formatPrice(market)} />
                  <Metric label="liquidity" value={formatUsdNumber(market.liquidityUsd)} />
                  <Metric label="volume 24h" value={formatUsdNumber(market.volume24hUsd)} />
                  <Metric
                    label="pair address"
                    value={market.pairAddress ? shorten(market.pairAddress) : "—"}
                    mono
                    title={market.pairAddress ?? undefined}
                  />
                </dl>

                <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <p className="text-xs leading-relaxed text-cream-500">
                    market data from the configured DEX pair. pairing with SBUXx does not make
                    $BUCKS redeemable for SBUXx.
                  </p>
                  {market.dexscreenerUrl ? (
                    <a
                      href={market.dexscreenerUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="shrink-0 text-[0.8125rem] text-cream-400 transition-colors hover:text-cream-100"
                    >
                      view chart →
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="px-6 py-16 text-center sm:px-8">
                <p className="text-lg text-cream-200">$BUCKS / SBUXx pair coming soon.</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream-500">
                  no pair address is configured yet, so there is no price to show. we would rather
                  show nothing than draw a chart that isn&rsquo;t real.
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
    <div className="bg-espresso-900/40 px-6 py-6 sm:px-8">
      <dt className="label-mono">{label}</dt>
      <dd
        title={title}
        className={`mt-3 text-xl tracking-[-0.02em] text-cream-50 ${mono ? "font-mono text-base" : "font-medium"}`}
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

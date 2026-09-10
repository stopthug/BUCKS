"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import type { QuoteResponse } from "@/lib/client/api";
import { formatBaseUnits, formatTokenAmount, formatUsd } from "@/lib/money";

/**
 * Payment breakdown.
 *
 * Nothing is folded into a single "total": the card's value, the provider's
 * cost, our fee (zero), and the network/swap costs are separate lines, because
 * hiding an external cost inside a total is how people end up feeling cheated.
 */
export function PaymentSummary({ quote }: { quote: QuoteResponse }) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="label-mono">You pay</p>
          <p className="mt-2 text-[clamp(1.75rem,7vw,2.5rem)] leading-none font-medium tracking-[-0.03em] text-ink">
            {formatTokenAmount(BigInt(quote.payAmount), quote.asset.decimals)}{" "}
            <span className="text-lg text-ink-soft">{quote.asset.label}</span>
          </p>
        </div>
        <QuoteTimer expiresAt={quote.expiresAt} />
      </div>

      <div className="hairline h-px" />

      <dl className="space-y-3 text-sm">
        <Row
          label="Gift card value"
          value={quote.card.faceValueUsd ? formatUsd(BigInt(quote.card.faceValueUsd)) : quote.card.name}
        />
        <Row label="Card cost" value={formatUsd(BigInt(quote.card.providerPriceUsd))} />
        <Row label="Platform fee" value={formatUsd(BigInt(quote.costs.platformFeeUsd))} accent />
        <Row
          label="Network / swap"
          value={describeNetworkCosts(quote)}
          hint={quote.costs.routeLabel ? `via ${quote.costs.routeLabel}` : undefined}
        />
      </dl>

      <p className="text-xs leading-relaxed text-ink-soft">
        {quote.asset.symbol === "USDC"
          ? "USDC goes straight through — no swap."
          : `Your ${quote.asset.label} is swapped to USDC. The swap only goes through if it delivers at least ${formatUsd(BigInt(quote.costs.guaranteedUsdc))}.`}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right">
        <span className={cn("font-mono", accent ? "text-forest-500" : "text-ink")}>
          {value}
        </span>
        {hint ? <span className="mt-0.5 block text-[0.6875rem] text-ink-soft">{hint}</span> : null}
      </dd>
    </div>
  );
}

function describeNetworkCosts(quote: QuoteResponse): string {
  const lamports = BigInt(quote.costs.networkFeeLamports);
  if (lamports === 0n) return "covered";
  return `≈ ${formatBaseUnits(lamports, 9, { maxFractionDigits: 6 })} SOL`;
}

/**
 * Quotes are short-lived on purpose. Showing the countdown means an expiry is
 * expected rather than a surprise failure at signing time.
 */
export function QuoteTimer({ expiresAt }: { expiresAt: string }) {
  // A ticking clock rather than a countdown in state, so `expiresAt` changing
  // recomputes the remaining time without an effect writing state.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
  const expired = remaining <= 0;

  return (
    <div className="text-right">
      <p className="label-mono">{expired ? "Expired" : "Price holds"}</p>
      <p
        className={cn(
          "mt-1.5 font-mono text-sm tabular-nums",
          expired ? "text-roast-500" : "text-ink-soft",
        )}
      >
        {expired ? "Refresh" : `${remaining}s`}
      </p>
    </div>
  );
}

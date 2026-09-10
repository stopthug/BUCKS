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
          <p className="label-mono">you pay</p>
          <p className="mt-2 text-[clamp(1.75rem,7vw,2.5rem)] leading-none font-medium tracking-[-0.03em] text-cream-50">
            {formatTokenAmount(BigInt(quote.payAmount), quote.asset.decimals)}{" "}
            <span className="text-lg text-cream-400">{quote.asset.label}</span>
          </p>
        </div>
        <QuoteTimer expiresAt={quote.expiresAt} />
      </div>

      <div className="hairline h-px" />

      <dl className="space-y-3 text-sm">
        <Row
          label="gift card value"
          value={quote.card.faceValueUsd ? formatUsd(BigInt(quote.card.faceValueUsd)) : quote.card.name}
        />
        <Row label="card cost" value={formatUsd(BigInt(quote.card.providerPriceUsd))} />
        <Row label="$BUCKS platform fee" value={formatUsd(BigInt(quote.costs.platformFeeUsd))} accent />
        <Row
          label="network / swap costs"
          value={describeNetworkCosts(quote)}
          hint={quote.costs.routeLabel ? `via ${quote.costs.routeLabel}` : undefined}
        />
      </dl>

      <p className="text-xs leading-relaxed text-cream-500">
        {quote.asset.symbol === "USDC"
          ? "USDC is transferred directly — no swap, no extra hop."
          : `your ${quote.asset.label} is swapped to USDC at settlement. the swap is guaranteed to deliver at least ${formatUsd(BigInt(quote.costs.guaranteedUsdc))} or it does not execute at all.`}
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
      <dt className="text-cream-500">{label}</dt>
      <dd className="text-right">
        <span className={cn("font-mono", accent ? "text-forest-300" : "text-cream-100")}>
          {value}
        </span>
        {hint ? <span className="mt-0.5 block text-[0.6875rem] text-cream-500">{hint}</span> : null}
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
      <p className="label-mono">{expired ? "expired" : "price holds"}</p>
      <p
        className={cn(
          "mt-1.5 font-mono text-sm tabular-nums",
          expired ? "text-crema-300" : "text-cream-300",
        )}
      >
        {expired ? "refresh" : `${remaining}s`}
      </p>
    </div>
  );
}

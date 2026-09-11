"use client";

import Link from "next/link";
import { useState } from "react";

import { AssetGlyph } from "@/components/checkout/asset-picker";
import { QuoteTimer } from "@/components/checkout/summary";
import { Button } from "@/components/ui/button";
import { GlassCard, StatusDot } from "@/components/ui/glass";
import type { QuoteResponse } from "@/lib/client/api";
import type { MenuOffer } from "@/lib/menu";
import { formatUsd } from "@/lib/money";

export function PayPanel({
  offer,
  quote,
  expired,
  error,
  onBackToCart,
}: {
  offer: MenuOffer;
  quote: QuoteResponse;
  expired: boolean;
  error: { code: string; message: string } | null;
  onBackToCart: () => void;
}) {
  const face = offer.faceValueUsd ? formatUsd(BigInt(offer.faceValueUsd)) : offer.name;
  const price = formatUsd(BigInt(offer.providerPriceUsd));
  const placed = new Date(quote.createdAt).toLocaleString();
  const helpHref = `mailto:?subject=${encodeURIComponent(`Help with BUCKS order ${quote.quoteId}`)}&body=${encodeURIComponent(`Quote ${quote.quoteId}`)}`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[clamp(1.75rem,5vw,2.35rem)] font-extrabold tracking-[-0.035em] text-ink">
            Complete your payment
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Send {quote.payAmountUi} {quote.asset.symbol} on Solana to the address below.
          </p>
        </div>
        <Link
          href="/account"
          className="shrink-0 text-[0.8125rem] font-bold text-ink-soft transition-colors hover:text-ink"
        >
          ← My Orders
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:items-start">
        <GlassCard className="p-4 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AssetGlyph symbol={quote.asset.symbol} />
              <p className="text-[0.975rem] font-extrabold text-ink">Pay with {quote.asset.symbol}</p>
            </div>
            <QuoteTimer expiresAt={quote.expiresAt} />
          </div>

          {quote.qrDataUrl ? (
            <div className="mt-6 flex justify-center">
              <img
                src={quote.qrDataUrl}
                alt={`Solana Pay QR for ${quote.payAmountUi} ${quote.asset.symbol}`}
                className="size-[min(13.5rem,calc(100vw-6rem))] rounded-[1.1rem] border-2 border-ink bg-foam p-2 sm:size-[15rem]"
              />
            </div>
          ) : null}

          <p className="mt-5 text-center text-[clamp(1.75rem,6vw,2.35rem)] leading-none font-extrabold tracking-[-0.04em] text-ink">
            {quote.payAmountUi}{" "}
            <span className="text-lg font-bold text-ink-soft">{quote.asset.symbol}</span>
          </p>

          <div className="mt-4 flex justify-center">
            <CopyButton label="Copy amount" value={quote.payAmountUi} />
          </div>

          <p className="mx-auto mt-3 max-w-xs text-center text-[0.75rem] leading-relaxed text-ink-soft">
            Send this exact amount · approximately {price} at checkout.
          </p>

          <div className="glass-soft mt-6 rounded-[1.15rem] px-4 py-4">
            <p className="text-[0.75rem] font-bold text-ink-soft">Send to this Solana address</p>
            <p className="mt-2 font-mono text-[0.8125rem] leading-relaxed break-all text-ink">
              {quote.treasuryAddress}
            </p>
            <div className="mt-3">
              <CopyButton label="Copy address" value={quote.treasuryAddress} />
            </div>
          </div>

          <p className="glass-soft mt-3 rounded-[1.15rem] px-4 py-3 text-[0.8125rem] leading-relaxed text-ink">
            Send {quote.asset.symbol} on Solana only. Check the amount and network before sending.
          </p>

          {expired ? (
            <div className="mt-5 text-center">
              <p className="text-sm text-roast-500">This quote expired. Nothing was charged.</p>
              <Button className="mt-3" variant="secondary" size="md" onClick={onBackToCart}>
                Back to cart
              </Button>
            </div>
          ) : (
            <p className="mt-5 flex items-center justify-center gap-2 text-[0.8125rem] font-semibold text-ink-soft">
              <StatusDot />
              Watching for your payment
            </p>
          )}

          {error ? (
            <p className="mt-4 text-center text-sm text-roast-500" role="alert">
              {error.message}
            </p>
          ) : null}
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <h3 className="text-lg font-extrabold tracking-[-0.03em] text-ink">Your receipt</h3>
          <div className="mt-4 flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-bold text-ink">
                {offer.categoryName} · {face}
              </p>
              <p className="mt-1 text-ink-soft">Qty 1</p>
            </div>
            <p className="font-extrabold text-ink">{price}</p>
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t-2 border-ink/10 pt-4">
            <p className="font-extrabold text-ink">Total</p>
            <p className="text-xl font-extrabold tracking-[-0.03em] text-ink">{price}</p>
          </div>
          <dl className="mt-5 space-y-3 border-t-2 border-ink/10 pt-4 text-sm">
            <div>
              <dt className="text-[0.75rem] font-bold text-ink-soft">Order number</dt>
              <dd className="mt-1 font-mono text-[0.75rem] leading-relaxed break-all text-ink">{quote.quoteId}</dd>
            </div>
            <div>
              <dt className="text-[0.75rem] font-bold text-ink-soft">Placed</dt>
              <dd className="mt-1 text-ink">{placed}</dd>
            </div>
          </dl>
          <p className="mt-5 text-[0.75rem] leading-relaxed text-ink-soft">
            Keep this page open until your order is complete. Return to My Orders using your email
            to access all your purchases.
          </p>
          <a
            href={helpHref}
            className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-bold text-ink underline underline-offset-2"
          >
            ✉ Get help with this order
          </a>
        </GlassCard>
      </div>
    </div>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

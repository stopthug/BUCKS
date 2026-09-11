"use client";

import { useState } from "react";

import { AssetGlyph } from "@/components/checkout/asset-picker";
import { CheckoutSplit } from "@/components/checkout/checkout-split";
import { QuoteTimer } from "@/components/checkout/summary";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/glass";
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

  return (
    <CheckoutSplit
      art={
        <div>
          {quote.qrDataUrl ? (
            <img
              src={quote.qrDataUrl}
              alt={`Solana Pay QR for ${quote.payAmountUi} ${quote.asset.symbol}`}
              className="mx-auto size-[min(11.5rem,calc(100vw-5rem))] rounded-[1.1rem] border-2 border-ink bg-foam p-2 md:size-full md:max-h-[14rem] md:w-auto"
            />
          ) : null}
          <p className="mt-3 text-center text-[1.35rem] leading-none font-extrabold tracking-[-0.04em] text-ink">
            {quote.payAmountUi}{" "}
            <span className="text-sm font-bold text-ink-soft">{quote.asset.symbol}</span>
          </p>
          <div className="mt-2 flex justify-center">
            <CopyButton label="Copy amount" value={quote.payAmountUi} />
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AssetGlyph symbol={quote.asset.symbol} />
          <div>
            <p className="text-[0.9375rem] font-extrabold text-ink">Pay with {quote.asset.symbol}</p>
            <p className="text-[0.75rem] font-semibold text-ink-soft">
              {offer.categoryName} · {face} · {price}
            </p>
          </div>
        </div>
        <QuoteTimer expiresAt={quote.expiresAt} />
      </div>

      <div className="glass-soft mt-3 rounded-[1.05rem] px-3 py-3">
        <p className="text-[0.6875rem] font-bold text-ink-soft">Solana address</p>
        <p className="mt-1 font-mono text-[0.75rem] leading-relaxed break-all text-ink">
          {quote.treasuryAddress}
        </p>
        <div className="mt-2">
          <CopyButton label="Copy address" value={quote.treasuryAddress} />
        </div>
      </div>

      {expired ? (
        <div className="mt-3">
          <p className="text-sm text-roast-500">This quote expired. Nothing was charged.</p>
          <Button className="mt-2" variant="secondary" size="md" onClick={onBackToCart}>
            Back to cart
          </Button>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-[0.8125rem] font-semibold text-ink-soft">
          <StatusDot />
          Watching for your payment
        </p>
      )}

      {error ? (
        <p className="mt-3 text-sm text-roast-500" role="alert">
          {error.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onBackToCart}
        className="mt-3 text-[0.75rem] font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        Back to cart
      </button>
    </CheckoutSplit>
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

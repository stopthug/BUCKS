"use client";

import { CardArt } from "@/components/cards/card-art";
import { PaymentMethods } from "@/components/checkout/asset-picker";
import { CheckoutSplit } from "@/components/checkout/checkout-split";
import { Button } from "@/components/ui/button";
import type { CheckoutAsset } from "@/lib/checkout-limits";
import { RECEIPT_EMAIL_MAX_LENGTH } from "@/lib/checkout-limits";
import { doodleSeedForOffer, type MenuOffer } from "@/lib/menu";
import { formatUsd } from "@/lib/money";

export function CartPanel({
  offer,
  purchasable,
  email,
  onEmail,
  asset,
  onAsset,
  onClose,
  onRemove,
  onContinue,
  busy,
  error,
}: {
  offer: MenuOffer;
  purchasable: boolean;
  email: string;
  onEmail: (value: string) => void;
  asset: CheckoutAsset;
  onAsset: (symbol: CheckoutAsset) => void;
  onClose: () => void;
  onRemove: () => void;
  onContinue: () => void;
  busy: boolean;
  error: { code: string; message: string } | null;
}) {
  const face = offer.faceValueUsd ? formatUsd(BigInt(offer.faceValueUsd)) : offer.name;
  const price = formatUsd(BigInt(offer.providerPriceUsd));

  return (
    <CheckoutSplit
      art={
        <CardArt
          alt={`${offer.categoryName} gift card`}
          className="w-full"
          faceValueUsd={offer.faceValueUsd}
          seed={doodleSeedForOffer(offer)}
        />
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-[-0.03em] text-ink">Your cart</h2>
          <p className="mt-0.5 text-sm font-semibold text-ink">{offer.categoryName}</p>
          <p className="text-[0.75rem] font-semibold text-ink-soft">
            {face} · {price}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart"
          className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink/15 text-lg leading-none text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          ×
        </button>
      </div>

      <div className="mt-3">
        <label htmlFor="receipt-email" className="sr-only">
          Email for your receipt
        </label>
        <input
          id="receipt-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmail(event.target.value.slice(0, RECEIPT_EMAIL_MAX_LENGTH))}
          placeholder="Email for receipt (optional)"
          className="w-full rounded-[1.05rem] border-2 border-ink/15 bg-foam px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-ink-soft/55 focus:border-ink focus:outline-none"
        />
      </div>

      <div className="mt-3">
        <PaymentMethods selected={asset} onSelect={onAsset} disabled={busy} />
      </div>

      {purchasable ? (
        <Button className="mt-4 w-full" size="lg" onClick={onContinue} disabled={busy}>
          {busy ? "Getting your price…" : "Continue to payment"}
          <span aria-hidden>→</span>
        </Button>
      ) : (
        <p className="mt-4 rounded-[1.05rem] border-2 border-ink/10 bg-cream-100 px-4 py-3 text-center text-sm text-ink-soft">
          Checkout isn’t open yet.
        </p>
      )}

      {error ? (
        <p className="mt-3 text-sm text-roast-500" role="alert">
          {error.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        className="mt-3 text-[0.75rem] font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        Remove
      </button>
    </CheckoutSplit>
  );
}

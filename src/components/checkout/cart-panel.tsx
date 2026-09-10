"use client";

import { CardArt } from "@/components/cards/card-art";
import { PaymentMethods } from "@/components/checkout/asset-picker";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass";
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
    <GlassCard className="mx-auto max-w-lg p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-[-0.03em] text-ink">Your cart · 1</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart"
          className="grid size-8 place-items-center rounded-full border-2 border-ink/15 text-lg leading-none text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          ×
        </button>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <div className="w-[5.5rem] shrink-0">
          <CardArt
            alt={`${offer.categoryName} gift card`}
            faceValueUsd={offer.faceValueUsd}
            seed={doodleSeedForOffer(offer)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.975rem] font-extrabold tracking-[-0.02em] text-ink">
                {offer.categoryName}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ink-soft">{face}</p>
            </div>
            <p className="text-[0.975rem] font-extrabold text-ink">{price}</p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-full border-2 border-ink bg-foam">
              <button
                type="button"
                disabled
                aria-label="Decrease quantity"
                className="px-2.5 py-1 text-sm font-bold text-ink-soft/50"
              >
                −
              </button>
              <span className="min-w-[1.5rem] text-center text-sm font-extrabold text-ink">1</span>
              <button
                type="button"
                disabled
                aria-label="Increase quantity"
                className="px-2.5 py-1 text-sm font-bold text-ink-soft/50"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="text-[0.8125rem] font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-3 border-t-2 border-ink/10 pt-4">
        <p className="text-[0.975rem] font-extrabold text-ink">Estimated total</p>
        <p className="text-xl font-extrabold tracking-[-0.03em] text-ink">{price}</p>
      </div>
      <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-soft">
        Your final total is confirmed before you send payment.
      </p>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="receipt-email" className="text-[0.9375rem] font-extrabold text-ink">
            Email for your receipt
          </label>
          <p className="text-[0.75rem] font-semibold text-ink-soft">No sign-up needed</p>
        </div>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" aria-hidden>
            ✉
          </span>
          <input
            id="receipt-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => onEmail(event.target.value.slice(0, RECEIPT_EMAIL_MAX_LENGTH))}
            placeholder="Your email address"
            className="w-full rounded-[1.1rem] border-2 border-ink/15 bg-foam py-3 pr-4 pl-10 text-[0.9375rem] text-ink placeholder:text-ink-soft/55 focus:border-ink focus:outline-none"
          />
        </div>
        <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-soft">
          Your account is created with your order. Come back anytime with a secure email link.
        </p>
      </div>

      <div className="mt-7">
        <PaymentMethods selected={asset} onSelect={onAsset} disabled={busy} />
      </div>

      {purchasable ? (
        <Button className="mt-7 w-full" size="lg" onClick={onContinue} disabled={busy}>
          {busy ? "Getting your price…" : "Continue to payment"}
          <span aria-hidden>→</span>
        </Button>
      ) : (
        <p className="mt-7 rounded-[1.1rem] border-2 border-ink/10 bg-cream-100 px-4 py-3 text-center text-sm text-ink-soft">
          Checkout isn’t open yet. These are the values we’ll sell.
        </p>
      )}

      {error ? (
        <p className="mt-4 text-sm text-roast-500" role="alert">
          {error.message}
        </p>
      ) : null}

      <p className="mt-5 text-center text-[0.75rem] font-semibold text-ink-soft">
        No wallet connection. Send payment from your preferred wallet.
      </p>
    </GlassCard>
  );
}

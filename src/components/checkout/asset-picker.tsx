"use client";

import { PaymentDoodle } from "@/components/checkout/payment-doodles";
import { CHECKOUT_ASSETS, type CheckoutAsset } from "@/lib/checkout-limits";
import { cn } from "@/lib/cn";

const ASSETS: Array<{ symbol: CheckoutAsset; name: string }> = [
  { symbol: "USDC", name: "USDC" },
  { symbol: "SOL", name: "SOL" },
  { symbol: "SBUXx", name: "xStocks" },
];

/** Compact row of payment chips so the cart stays on one screen. */
export function PaymentMethods({
  selected,
  onSelect,
  disabled,
}: {
  selected: CheckoutAsset;
  onSelect: (symbol: CheckoutAsset) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.8125rem] font-extrabold tracking-[-0.02em] text-ink">
        Pay with <span className="font-semibold text-ink-soft">· Solana</span>
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {ASSETS.map((asset) => {
          const active = selected === asset.symbol;
          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelect(asset.symbol)}
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                "glass-soft relative flex flex-col items-center gap-1 rounded-[1.05rem] px-1.5 py-2 text-center transition-all duration-200 sm:flex-row sm:justify-center sm:gap-2 sm:px-2 sm:py-2.5",
                "hover:-translate-y-0.5 disabled:opacity-50",
                active && "bg-mint ring-2 ring-ink ring-offset-1 ring-offset-paper",
              )}
            >
              <PaymentDoodle symbol={asset.symbol} className="size-8 shrink-0 sm:size-9" />
              <span className="text-[0.75rem] font-extrabold text-ink sm:text-[0.8125rem]">{asset.name}</span>
              {active ? (
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-[0.6rem] font-extrabold text-foam">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[0.75rem] font-semibold text-ink">
        Paying with {ASSETS.find((asset) => asset.symbol === selected)?.name ?? selected}
      </p>
      <span className="sr-only">{CHECKOUT_ASSETS.join(", ")} are the accepted payment assets.</span>
    </div>
  );
}

export function AssetGlyph({ symbol }: { symbol: string }) {
  return <PaymentDoodle symbol={symbol} className="size-8 shrink-0" />;
}

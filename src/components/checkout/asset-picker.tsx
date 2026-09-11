"use client";

import { PaymentDoodle } from "@/components/checkout/payment-doodles";
import { CHECKOUT_ASSETS, type CheckoutAsset } from "@/lib/checkout-limits";
import { cn } from "@/lib/cn";

const RADIO_ASSETS: Array<{ symbol: CheckoutAsset; name: string; subtitle: string }> = [
  { symbol: "USDC", name: "USDC", subtitle: "USD Coin" },
  { symbol: "SOL", name: "SOL", subtitle: "Solana" },
];

/**
 * Cart payment methods: USDC and SOL as radio cards, SBUXx under Pay with xStocks.
 */
export function PaymentMethods({
  selected,
  onSelect,
  disabled,
}: {
  selected: CheckoutAsset;
  onSelect: (symbol: CheckoutAsset) => void;
  disabled?: boolean;
}) {
  const xStocksOpen = selected === "SBUXx";

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[0.9375rem] font-extrabold tracking-[-0.02em] text-ink">Payment method</p>
        <p className="text-[0.75rem] font-semibold text-ink-soft">Solana network</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {RADIO_ASSETS.map((asset) => {
          const active = selected === asset.symbol;
          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelect(asset.symbol)}
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                "glass-soft flex flex-col items-center gap-1.5 rounded-[1.15rem] px-2 py-3 text-center transition-all duration-200",
                "sm:flex-row sm:items-center sm:gap-3 sm:px-3.5 sm:py-3.5 sm:text-left",
                "hover:-translate-y-0.5 disabled:opacity-50",
                active && "bg-mint ring-2 ring-ink ring-offset-1 ring-offset-paper sm:ring-offset-2",
              )}
            >
              <PaymentDoodle symbol={asset.symbol} className="size-8 shrink-0 sm:size-10" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.875rem] font-extrabold text-ink sm:text-[0.9375rem]">{asset.name}</span>
                <span className="hidden text-[0.75rem] font-semibold text-ink-soft sm:block">{asset.subtitle}</span>
              </span>
              <span className="hidden sm:block">
                <RadioMark active={active} />
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect(xStocksOpen ? "USDC" : "SBUXx")}
        disabled={disabled}
        aria-expanded={xStocksOpen}
        className={cn(
          "glass-soft mt-2.5 flex w-full items-center gap-3 rounded-[1.15rem] px-3 py-3 text-left transition-all duration-200 sm:px-3.5 sm:py-3.5",
          "hover:-translate-y-0.5 disabled:opacity-50",
          xStocksOpen && "bg-mint ring-2 ring-ink ring-offset-1 ring-offset-paper sm:ring-offset-2",
        )}
      >
        <PaymentDoodle symbol="SBUXx" className="size-10 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-extrabold text-ink">Pay with xStocks</span>
          <span className="block text-[0.75rem] font-semibold text-ink-soft">Starbucks xStock · SBUXx</span>
        </span>
        <span className={cn("text-ink-soft transition-transform duration-200", xStocksOpen && "rotate-180")}>
          ▾
        </span>
      </button>

      {xStocksOpen ? (
        <p className="mt-2 px-1 text-[0.75rem] leading-relaxed text-ink-soft">
          Send SBUXx — tokenized Starbucks stock — on Solana. No wallet connection in this page.
        </p>
      ) : null}

      <span className="sr-only">
        {CHECKOUT_ASSETS.join(", ")} are the accepted payment assets.
      </span>
    </div>
  );
}

export function AssetGlyph({ symbol }: { symbol: string }) {
  return <PaymentDoodle symbol={symbol} className="size-9 shrink-0" />;
}

function RadioMark({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-full border-2",
        active ? "border-ink" : "border-ink/30",
      )}
    >
      {active ? <span className="size-2 rounded-full bg-ink" /> : null}
    </span>
  );
}

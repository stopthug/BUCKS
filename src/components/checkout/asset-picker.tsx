"use client";

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

      <div className="mt-3 grid grid-cols-2 gap-2.5">
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
                "glass-soft flex items-center gap-3 rounded-[1.15rem] px-3.5 py-3.5 text-left transition-all duration-200",
                "hover:-translate-y-0.5 disabled:opacity-50",
                active && "bg-mint ring-2 ring-ink ring-offset-2 ring-offset-foam",
              )}
            >
              <AssetGlyph symbol={asset.symbol} />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-extrabold text-ink">{asset.name}</span>
                <span className="block text-[0.75rem] font-semibold text-ink-soft">{asset.subtitle}</span>
              </span>
              <RadioMark active={active} />
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
          "glass-soft mt-2.5 flex w-full items-center gap-3 rounded-[1.15rem] px-3.5 py-3.5 text-left transition-all duration-200",
          "hover:-translate-y-0.5 disabled:opacity-50",
          xStocksOpen && "bg-mint ring-2 ring-ink ring-offset-2 ring-offset-foam",
        )}
      >
        <span className="flex -space-x-1.5" aria-hidden>
          {["#111111", "#76b900", "#cc0000", "#00d4aa"].map((color) => (
            <span
              key={color}
              className="size-6 rounded-full border-2 border-foam"
              style={{ background: color }}
            />
          ))}
        </span>
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

const GLYPHS: Record<string, string> = {
  SBUXx: "radial-gradient(70% 60% at 32% 26%, #cfeadb 0%, #6bb489 32%, #1f4d34 74%, #10281b 100%)",
  SOL: "radial-gradient(70% 60% at 32% 26%, #dcd6ff 0%, #9a8cf0 34%, #4a3f8f 74%, #221d42 100%)",
  USDC: "radial-gradient(70% 60% at 32% 26%, #d6e8ff 0%, #7ba7e8 34%, #2f568f 74%, #16294a 100%)",
};

export function AssetGlyph({ symbol }: { symbol: string }) {
  return (
    <span
      aria-hidden
      className="size-9 shrink-0 rounded-full"
      style={{
        background: GLYPHS[symbol] ?? GLYPHS.USDC,
        boxShadow:
          "inset 0 -3px 7px rgba(0,0,0,0.35), inset 0 2px 6px rgba(255,245,230,0.28), 0 8px 16px -12px rgba(0,0,0,0.55)",
      }}
    />
  );
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

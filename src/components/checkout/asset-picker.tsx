"use client";

import { cn } from "@/lib/cn";
import { formatTokenAmount } from "@/lib/money";

export interface AssetOption {
  symbol: string;
  label: string;
  decimals: number;
  /** Base units as a string, or null while balances load. */
  balance: string | null;
}

/**
 * Payment asset selection with the wallet's balance beside each option, which
 * is the difference between "pick an asset" and "pick an asset you can
 * actually pay with".
 */
export function AssetPicker({
  assets,
  selected,
  onSelect,
  disabled,
}: {
  assets: AssetOption[];
  selected: string | null;
  onSelect: (symbol: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {assets.map((asset) => {
        const active = selected === asset.symbol;
        const empty = asset.balance !== null && BigInt(asset.balance) === 0n;

        return (
          <button
            key={asset.symbol}
            type="button"
            onClick={() => onSelect(asset.symbol)}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
              "glass-soft flex items-center justify-between gap-3 rounded-sm px-4 py-3.5 text-left transition-all duration-300",
              "hover:border-cream-200/20 hover:bg-cream-100/8 disabled:opacity-50",
              active && "border-crema-300/45 bg-cream-100/10",
            )}
          >
            <span className="flex items-center gap-3">
              <AssetGlyph symbol={asset.symbol} />
              <span>
                <span className="block text-[0.9375rem] text-ink">{asset.label}</span>
                <span
                  className={cn(
                    "block font-mono text-[0.6875rem]",
                    empty ? "text-ink-soft/70" : "text-ink-soft",
                  )}
                >
                  {asset.balance === null
                    ? "—"
                    : `${formatTokenAmount(BigInt(asset.balance), asset.decimals)} in wallet`}
                </span>
              </span>
            </span>

            <span
              className={cn(
                "size-4 shrink-0 border transition-colors duration-200",
                active ? "border-crema-300 bg-crema-300" : "border-cream-200/25",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

const GLYPHS: Record<string, string> = {
  BUCKS: "radial-gradient(70% 60% at 32% 26%, #e2cdb2 0%, #a97b57 34%, #4a3325 74%, #241811 100%)",
  SBUXx: "radial-gradient(70% 60% at 32% 26%, #cfeadb 0%, #6bb489 32%, #1f4d34 74%, #10281b 100%)",
  SOL: "radial-gradient(70% 60% at 32% 26%, #dcd6ff 0%, #9a8cf0 34%, #4a3f8f 74%, #221d42 100%)",
  USDC: "radial-gradient(70% 60% at 32% 26%, #d6e8ff 0%, #7ba7e8 34%, #2f568f 74%, #16294a 100%)",
};

function AssetGlyph({ symbol }: { symbol: string }) {
  return (
    <span
      aria-hidden
      className="size-8 shrink-0 rounded-none"
      style={{
        background: GLYPHS[symbol] ?? GLYPHS.BUCKS,
        boxShadow:
          "inset 0 -3px 7px rgba(0,0,0,0.45), inset 0 2px 6px rgba(255,245,230,0.28), 0 10px 20px -12px rgba(0,0,0,0.8)",
      }}
    />
  );
}

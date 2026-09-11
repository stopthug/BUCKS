"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { BUCKS_MINT, DEXSCREENER_TOKEN_URL, shortenMint } from "@/lib/public-token";

export function ContractAddress({
  className,
  tone = "ink",
  align = "center",
}: {
  className?: string;
  tone?: "ink" | "foam";
  align?: "center" | "start";
}) {
  const [copied, setCopied] = useState(false);
  const soft = tone === "foam" ? "text-foam/70" : "text-ink-soft";
  const chip =
    tone === "foam"
      ? "border-foam/25 bg-forest-700 text-foam hover:border-foam"
      : "border-ink/15 bg-foam text-ink hover:border-ink";

  return (
    <div
      className={cn(
        "mt-4 flex flex-col gap-1.5",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <p className={cn("text-[0.6875rem] font-extrabold tracking-[0.14em] uppercase", soft)}>
        $BUCKS CA
      </p>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          align === "center" ? "justify-center" : "justify-start",
        )}
      >
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(BUCKS_MINT).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
          className={cn(
            "rounded-[1.05rem] border-2 px-3 py-1.5 font-mono text-[0.75rem] font-semibold transition-colors",
            chip,
          )}
          title={BUCKS_MINT}
        >
          {copied ? "Copied" : shortenMint(BUCKS_MINT)}
        </button>
        <a
          href={DEXSCREENER_TOKEN_URL}
          target="_blank"
          rel="noreferrer noopener"
          className={cn("text-[0.75rem] font-bold underline underline-offset-2", soft, tone === "foam" ? "hover:text-foam" : "hover:text-ink")}
        >
          Dex Screener
        </a>
      </div>
    </div>
  );
}

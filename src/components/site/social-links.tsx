import { cn } from "@/lib/cn";

export const X_URL = "https://x.com/usastarbucks";
export const DEXSCREENER_URL = "https://dexscreener.com/solana";

export function SocialLinks({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "foam";
}) {
  const color = tone === "foam" ? "text-foam/80 hover:text-foam" : "text-ink-soft hover:text-ink";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <a
        href={X_URL}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="BUCKS on X"
        className={cn("grid size-9 place-items-center rounded-full transition-colors", color)}
      >
        <XIcon />
      </a>
      <a
        href={DEXSCREENER_URL}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="BUCKS on Dex Screener"
        className={cn("grid size-9 place-items-center rounded-full transition-colors", color)}
      >
        <DexScreenerIcon />
      </a>
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.15rem]" aria-hidden fill="currentColor">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-4.71-6.23-5.4 6.23H2.74l7.73-8.84L1.25 2.25h6.83l4.25 5.63 6.91-5.63Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  );
}

function DexScreenerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.2rem]" aria-hidden fill="none">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 15.2 10.2 11l2.6 2.4L17 8.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

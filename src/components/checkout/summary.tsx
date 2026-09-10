"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Quotes last about ten minutes. Showing the countdown means an expiry is
 * expected rather than a surprise failure while watching for payment.
 */
export function QuoteTimer({
  expiresAt,
  className,
}: {
  expiresAt: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
  const expired = remaining <= 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const clock = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 bg-foam px-2.5 py-1 font-mono text-[0.8125rem] tabular-nums",
        expired ? "text-roast-500" : "text-ink",
        className,
      )}
    >
      <span aria-hidden>⏱</span>
      <span>{expired ? "0:00" : clock}</span>
    </div>
  );
}

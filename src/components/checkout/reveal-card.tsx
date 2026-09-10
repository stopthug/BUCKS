"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { RedemptionResponse } from "@/lib/client/api";

/**
 * Gift-card reveal.
 *
 * The code is hidden until asked for, fetched on demand, and never placed in
 * a URL. Whatever fields the provider returned are displayed — code, PIN,
 * serial, instructions — rather than assuming every card is a single code.
 */
export function RevealCard({
  onReveal,
  title,
  subtitle,
}: {
  onReveal: () => Promise<RedemptionResponse>;
  title: string;
  subtitle?: string;
}) {
  const [redemption, setRedemption] = useState<RedemptionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reveal = async () => {
    setLoading(true);
    setError(null);
    try {
      setRedemption(await onReveal());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "could not load your card.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-glass overflow-hidden">
      <div className="border-b border-cream-200/8 px-6 py-5">
        <p className="label-mono">your card</p>
        <p className="mt-2 text-xl font-medium tracking-[-0.02em] text-cream-50">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-cream-500">{subtitle}</p> : null}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {redemption ? (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {redemption.cards.map((card, index) => (
                <div key={index} className="glass-soft space-y-3 rounded-2xl p-4">
                  {card.code ? <Secret label="code" value={card.code} /> : null}
                  {card.pin ? <Secret label="pin" value={card.pin} /> : null}
                  {card.serial ? <Secret label="serial" value={card.serial} /> : null}
                  {card.expiresAt ? <Detail label="expires" value={card.expiresAt} /> : null}
                  {card.instructions ? (
                    <p className="text-[0.8125rem] leading-relaxed text-cream-400">
                      {card.instructions}
                    </p>
                  ) : null}
                  {Object.entries(card.extra).map(([key, value]) => (
                    <Detail key={key} label={key.replace(/_/g, " ")} value={value} />
                  ))}
                </div>
              ))}

              <p className="text-xs leading-relaxed text-cream-500">
                save this somewhere safe. redeem it in the Starbucks app or at the counter,
                following the provider&rsquo;s terms for your region.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="relative overflow-hidden rounded-2xl">
                {/* Blurred stand-in so the reveal has something to reveal */}
                <div className="glass-soft space-y-3 p-4 blur-[7px] select-none" aria-hidden>
                  <div className="h-3 w-24 rounded-full bg-cream-200/20" />
                  <div className="h-6 w-full rounded-full bg-cream-200/15" />
                  <div className="h-3 w-16 rounded-full bg-cream-200/20" />
                  <div className="h-6 w-24 rounded-full bg-cream-200/15" />
                </div>
              </div>

              <Button className="mt-5 w-full" size="lg" onClick={() => void reveal()} disabled={loading}>
                {loading ? "unlocking" : "reveal gift card"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error ? (
          <p className="mt-4 text-sm text-crema-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A copyable secret value. Rendered in mono so O and 0 are distinguishable. */
function Secret({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <p className="label-mono">{label}</p>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
        className={cn(
          "mt-1.5 flex w-full items-center justify-between gap-3 rounded-xl bg-espresso-950/50 px-3.5 py-3 text-left transition-colors duration-200",
          "hover:bg-espresso-950/70",
        )}
      >
        <span className="font-mono text-[0.9375rem] break-all text-cream-50 select-all">
          {value}
        </span>
        <span className="shrink-0 text-[0.6875rem] text-cream-500">
          {copied ? "copied" : "copy"}
        </span>
      </button>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="label-mono">{label}</span>
      <span className="text-right font-mono text-[0.8125rem] text-cream-300">{value}</span>
    </div>
  );
}

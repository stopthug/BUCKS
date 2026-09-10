"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { RevealCard } from "@/components/checkout/reveal-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass";
import { ApiError, post, type RedemptionResponse } from "@/lib/client/api";
import type { ClaimView } from "@/lib/claim";
import { errorCopy } from "@/lib/errors";
import { formatUsd } from "@/lib/money";

/**
 * Claim experience for someone who has never used crypto.
 *
 * No wallet, no signature, no jargon: a card, a note, and one button. The word
 * "Solana" does not appear until the footer.
 */
export function ClaimExperience({
  token,
  initial,
}: {
  token: string;
  initial: ClaimView;
}) {
  const [view, setView] = useState(initial);
  const [claimed, setClaimed] = useState<RedemptionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = view.faceValueUsd ? formatUsd(BigInt(view.faceValueUsd)) : view.cardName;

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await post<RedemptionResponse & { cardName?: string }>(
        `/api/claim/${token}`,
        { action: "claim" },
      );
      setClaimed(result);
      setView({ ...view, status: "claimed", canReveal: true });
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        if (cause.code === "already_claimed") {
          setView({ ...view, status: "claimed", canReveal: false });
        }
      } else {
        setError(errorCopy("internal"));
      }
    } finally {
      setBusy(false);
    }
  };

  // Already claimed by this browser: let them look at their card again.
  const revealAgain = async (): Promise<RedemptionResponse> =>
    post<RedemptionResponse>(`/api/claim/${token}`, { action: "reveal" });

  if (claimed) {
    return (
      <Enjoy
        cards={claimed}
        value={value}
        cardName={view.cardName}
        categoryName={view.categoryName}
      />
    );
  }

  if (view.status === "claimed" && view.canReveal) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Header title="Your coffee." subtitle="You already claimed this one." />
        <RevealCard
          onReveal={revealAgain}
          title={`${view.categoryName} ${value}`}
          subtitle="Same card as before."
        />
      </div>
    );
  }

  if (view.status === "claimed") {
    return (
      <div className="mx-auto max-w-md">
        <GlassCard className="p-10 text-center">
          <CupSeal muted />
          <h1 className="mt-7 text-2xl font-medium tracking-[-0.02em] text-ink">
            This coffee’s already been claimed.
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            Each link works once. If this was yours, check the device you opened it on first.
          </p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/" variant="secondary" size="md">
              What is $BUCKS?
            </ButtonLink>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (view.status === "unavailable") {
    return (
      <div className="mx-auto max-w-md">
        <GlassCard className="p-10 text-center">
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink">
            This coffee hit a snag.
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            The card couldn’t be issued. The person who sent it can see the status on their
            account, and their payment is recorded.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-center">
            <h1 className="text-[clamp(1.875rem,7vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-ink">
              Someone sent you coffee.
            </h1>
          </div>

          <GlassCard className="mt-9 overflow-hidden">
            <div className="flex flex-col items-center px-6 py-9 text-center">
              <CupSeal />

              <p className="mt-7 text-3xl font-medium tracking-[-0.03em] text-ink">{value}</p>
              <p className="mt-1.5 text-sm text-ink-soft">{view.categoryName} gift card</p>

              {view.message ? (
                <p className="mt-7 max-w-xs text-xl leading-snug text-ink">
                  &ldquo;{view.message}&rdquo;
                </p>
              ) : null}

              {view.senderName ? (
                <p className="mt-3 text-sm text-ink-soft">— {view.senderName}</p>
              ) : null}
            </div>

            <div className="border-t border-cream-200/8 p-6">
              {view.status === "ready" ? (
                <>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => void claim()}
                    disabled={busy}
                  >
                    {busy ? "Opening…" : "Claim coffee"}
                  </Button>
                  <p className="mt-3 text-center text-xs leading-relaxed text-ink-soft">
                    No app, no wallet, no sign-up. You’ll get the card code on the next screen.
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-ink">{errorCopy("gift_not_ready")}</p>
                  <Button
                    variant="secondary"
                    size="md"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Check again
                  </Button>
                </div>
              )}

              {error ? (
                <p className="mt-4 text-center text-sm text-roast-500" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Enjoy({
  cards,
  value,
  cardName,
  categoryName,
}: {
  cards: RedemptionResponse;
  value: string;
  cardName: string;
  categoryName: string;
}) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-[clamp(2.5rem,10vw,4rem)] leading-none font-medium tracking-[-0.04em] text-ink">
          Enjoy.
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          your {categoryName} gift card · {value}
        </p>
      </div>

      {/* The code is already in hand, so this renders it immediately rather
          than asking for another tap. */}
      <RevealCard
        onReveal={async () => cards}
        title={`${categoryName} ${value}`}
        subtitle={cardName}
      />

      <div className="flex justify-center">
        <ButtonLink href="/" variant="ghost" size="md">
          What is $BUCKS?
        </ButtonLink>
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h1 className="text-[clamp(2rem,8vw,3rem)] leading-none font-medium tracking-[-0.04em] text-ink">
        {title}
      </h1>
      <p className="mt-3 text-sm text-ink-soft">{subtitle}</p>
    </div>
  );
}

/** A wax-seal style cup badge, giving the claim page a gift-like centrepiece. */
function CupSeal({ muted }: { muted?: boolean }) {
  return (
    <span
      aria-hidden
      className="relative flex size-20 items-center justify-center rounded-none"
      style={{
        background: muted
          ? "radial-gradient(65% 60% at 34% 28%, rgba(226,205,178,0.35) 0%, rgba(74,51,37,0.5) 45%, rgba(20,13,9,0.9) 100%)"
          : "radial-gradient(65% 60% at 34% 28%, #e2cdb2 0%, #a97b57 38%, #4a3325 78%, #241811 100%)",
        boxShadow:
          "inset 0 -6px 14px rgba(0,0,0,0.5), inset 0 4px 12px rgba(255,245,230,0.3), 0 22px 44px -20px rgba(0,0,0,0.85)",
      }}
    >
      <span
        className="h-9 w-11 rounded-b-2xl rounded-t-sm"
        style={{
          background: muted
            ? "linear-gradient(170deg, rgba(246,239,228,0.4) 0%, rgba(169,134,106,0.4) 100%)"
            : "linear-gradient(170deg, #fdf9f3 0%, #e8ddcc 55%, #b9a893 100%)",
          boxShadow: "inset 0 -4px 8px rgba(74,51,37,0.35)",
        }}
      />
    </span>
  );
}

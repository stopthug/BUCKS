"use client";

import { useState } from "react";

import { RevealCard } from "@/components/checkout/reveal-card";
import { Button } from "@/components/ui/button";
import { GlassCard, StatusDot } from "@/components/ui/glass";
import type { OrderWithGiftDto } from "@/lib/api/dto";
import { post, type RedemptionResponse } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";

/**
 * Purchase and gift history.
 *
 * Failure states are first-class rows here rather than hidden: an order that
 * needs a refund says so, with its transaction signature, because that is the
 * information a person needs when asking for help.
 */
export function AccountOrders({
  purchases,
  gifts,
}: {
  purchases: OrderWithGiftDto[];
  gifts: OrderWithGiftDto[];
}) {
  const [tab, setTab] = useState<"purchases" | "sent">("purchases");
  const list = tab === "purchases" ? purchases : gifts;

  return (
    <div>
      <div className="glass inline-flex rounded-full p-1">
        {(["purchases", "sent"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[0.8125rem] transition-colors duration-200",
              tab === value ? "bg-cream-100/12 text-cream-50" : "text-cream-400 hover:text-cream-100",
            )}
          >
            {value === "purchases" ? "purchases" : "sent coffees"}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {list.length === 0 ? (
          <GlassCard className="p-10 text-center">
            <p className="text-cream-200">
              {tab === "purchases" ? "no coffee yet." : "you haven't sent a coffee yet."}
            </p>
            <p className="mt-2 text-sm text-cream-500">
              {tab === "purchases"
                ? "buy a card and it shows up here."
                : "send one and the link stays here until it's claimed."}
            </p>
          </GlassCard>
        ) : (
          list.map((entry) => <OrderRow key={entry.id} entry={entry} sent={tab === "sent"} />)
        )}
      </div>
    </div>
  );
}

function OrderRow({ entry, sent }: { entry: OrderWithGiftDto; sent: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const value = entry.faceValueUsd ? formatUsd(BigInt(entry.faceValueUsd)) : entry.cardName;
  const state = describe(entry, sent);

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-[0.9375rem] text-cream-50">
            {entry.categoryName} {value}
          </p>
          <p className="mt-1 text-xs text-cream-500">
            {sent ? formatDate(entry.createdAt) : `paid with ${label(entry.paymentAsset)}`}
            {!sent ? ` · ${formatDate(entry.createdAt)}` : null}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem]",
              state.tone === "good" && "bg-forest-500/15 text-forest-300",
              state.tone === "wait" && "bg-crema-300/12 text-crema-300",
              state.tone === "bad" && "bg-crema-300/15 text-crema-200",
            )}
          >
            <StatusDot tone={state.tone === "good" ? "green" : state.tone === "wait" ? "amber" : "muted"} />
            {state.label}
          </span>

          {sent && entry.gift?.claimUrl && entry.gift.status !== "claimed" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const url = entry.gift?.claimUrl;
                if (!url) return;
                void navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                });
              }}
            >
              {copied ? "copied" : "copy link"}
            </Button>
          ) : null}

          {!sent && entry.hasRedemption ? (
            <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
              {open ? "hide" : "view"}
            </Button>
          ) : null}
        </div>
      </div>

      {state.tone === "bad" ? (
        <div className="border-t border-cream-200/8 px-5 py-4 sm:px-6">
          <p className="text-xs leading-relaxed text-cream-400">
            your payment was verified onchain but the card could not be issued. this order is
            flagged for a refund. quote this signature when you get in touch:
          </p>
          {entry.paymentSignature ? (
            <p className="mt-2 font-mono text-[0.6875rem] break-all text-cream-500">
              {entry.paymentSignature}
            </p>
          ) : null}
        </div>
      ) : null}

      {open && !sent ? (
        <div className="border-t border-cream-200/8 p-5 sm:p-6">
          <RevealCard
            onReveal={() => post<RedemptionResponse>(`/api/orders/${entry.id}/reveal`)}
            title={`${entry.categoryName} ${value}`}
          />
        </div>
      ) : null}
    </GlassCard>
  );
}

function describe(
  entry: OrderWithGiftDto,
  sent: boolean,
): { label: string; tone: "good" | "wait" | "bad" } {
  if (entry.status === "refund_required" || entry.status === "provider_failed") {
    return { label: "refund required", tone: "bad" };
  }

  if (sent) {
    if (entry.gift?.status === "claimed") {
      return {
        label: `claimed ${entry.gift.claimedAt ? formatDate(entry.gift.claimedAt) : ""}`.trim(),
        tone: "good",
      };
    }
    if (entry.status === "ready") return { label: "waiting for friend", tone: "wait" };
    return { label: "preparing", tone: "wait" };
  }

  switch (entry.status) {
    case "ready":
      return { label: "ready", tone: "good" };
    case "claimed":
      return { label: "claimed", tone: "good" };
    case "awaiting_payment":
      return { label: "awaiting payment", tone: "wait" };
    case "payment_processing":
    case "payment_confirmed":
      return { label: "payment confirmed", tone: "wait" };
    default:
      return { label: "preparing", tone: "wait" };
  }
}

function label(symbol: string): string {
  return symbol === "BUCKS" ? "$BUCKS" : symbol;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

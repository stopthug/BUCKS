"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CardArt } from "@/components/cards/card-art";
import { CartPanel } from "@/components/checkout/cart-panel";
import { GiftFields } from "@/components/checkout/gift-fields";
import { PayPanel } from "@/components/checkout/pay-panel";
import { RevealCard } from "@/components/checkout/reveal-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { GlassCard, StatusDot } from "@/components/ui/glass";
import {
  catalogNotice,
  distinctDenominations,
  doodleSeedForOffer,
  groupOffersByCategory,
  stockLabel,
  type CoffeeMenu,
  type MenuOffer,
} from "@/lib/menu";
import {
  ApiError,
  get,
  post,
  type OrderResponse,
  type QuoteResponse,
  type RedemptionResponse,
  type SettlementResponse,
  type WatchResponse,
} from "@/lib/client/api";
import type { CheckoutAsset } from "@/lib/checkout-limits";
import { cn } from "@/lib/cn";
import { errorCopy } from "@/lib/errors";
import { formatUsd } from "@/lib/money";

/**
 * Buy and gift share this machine. After a card is chosen, checkout is a
 * Bitrefill-style cart then a send-to-treasury screen — no in-page wallet
 * connection. The client never computes an amount; it asks the server for a
 * quote and watches until the treasury sees that unique payment.
 */

type Step = "select" | "cart" | "pay" | "settling" | "done";

export function CheckoutFlow({
  menu,
  mode,
  initialCardId,
}: {
  menu: CoffeeMenu;
  mode: "purchase" | "gift";
  initialCardId?: string;
}) {
  const categories = useMemo(() => groupOffersByCategory(menu.offers), [menu.offers]);
  const initialOffer = useMemo(() => {
    const found = initialCardId
      ? (menu.offers.find((entry) => entry.cardId === initialCardId) ?? null)
      : null;
    if (found && found.stock <= 0) return null;
    return found;
  }, [menu.offers, initialCardId]);
  const defaultCategoryId =
    initialOffer?.categoryId ?? (categories.length === 1 ? categories[0]?.categoryId : null);

  const [step, setStep] = useState<Step>("select");
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId ?? null);
  const [offer, setOffer] = useState<MenuOffer | null>(initialOffer);
  const [asset, setAsset] = useState<CheckoutAsset>("USDC");
  const [email, setEmail] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState<null | "quoting" | "watching">(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const notice = catalogNotice(menu);
  const selectedCategory = categories.find((entry) => entry.categoryId === categoryId) ?? null;

  useEffect(() => {
    if (categoryId || categories.length !== 1) return;
    setCategoryId(categories[0]!.categoryId);
  }, [categories, categoryId]);

  useEffect(() => {
    if (offer || !selectedCategory) return;
    const inStock = selectedCategory.offers.filter((entry) => entry.stock > 0);
    if (inStock.length === 1) setOffer(inStock[0]!);
  }, [offer, selectedCategory]);
  const denominations = useMemo(
    () => distinctDenominations(selectedCategory?.offers ?? []),
    [selectedCategory],
  );

  const expired = Boolean(quote && new Date(quote.expiresAt).getTime() <= now);

  useEffect(() => {
    if (step !== "pay" || !quote) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step, quote]);

  const requestQuote = useCallback(async () => {
    if (!offer) return;

    setBusy("quoting");
    setError(null);

    try {
      const response = await post<QuoteResponse>("/api/quote", {
        categoryId: offer.categoryId,
        cardId: offer.cardId,
        asset,
        intent: mode,
        email: email.trim() || null,
        senderName: mode === "gift" ? senderName || null : null,
        message: mode === "gift" ? message || null : null,
      });
      setQuote(response);
      setNow(Date.now());
      setStep("pay");
    } catch (cause) {
      setError(toError(cause));
    } finally {
      setBusy(null);
    }
  }, [offer, asset, mode, email, senderName, message]);

  const watchInFlight = useRef(false);

  useEffect(() => {
    if (step !== "pay" || !quote || expired) return;

    let cancelled = false;

    const poll = async () => {
      if (watchInFlight.current) return;
      watchInFlight.current = true;
      try {
        const result = await post<WatchResponse>("/api/payments/watch", { quoteId: quote.quoteId });
        if (cancelled) return;
        if (result.watching) return;

        setSettlement(result);
        setOrderStatus(result.status);
        setStep("done");
      } catch (cause) {
        if (cancelled) return;
        const next = toError(cause);
        if (next.code === "quote_expired") setError(next);
      } finally {
        watchInFlight.current = false;
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), 3_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [step, quote, expired]);

  useEffect(() => {
    if (!settlement) return;
    if (orderStatus === "ready" || orderStatus === "claimed") return;
    if (orderStatus === "refund_required" || orderStatus === "provider_failed") return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const { order } = await get<OrderResponse>(`/api/orders/${settlement.orderId}`);
        if (cancelled) return;
        setOrderStatus(order.status);
        if (order.status === "ready" || order.status === "refund_required") return;
      } catch {
        // Keep trying: the payment is already recorded server-side.
      }
      if (!cancelled && attempts < 20) setTimeout(() => void poll(), 3_000);
    };

    const timer = setTimeout(() => void poll(), 2_000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [settlement, orderStatus]);

  const reveal = useCallback(async (): Promise<RedemptionResponse> => {
    if (!settlement) throw new Error("no order to reveal");
    return post<RedemptionResponse>(`/api/orders/${settlement.orderId}/reveal`);
  }, [settlement]);

  const backToSelect = () => {
    setStep("select");
    setQuote(null);
    setError(null);
  };

  if (!menu.available) {
    return <Unavailable reason={menu.reason} />;
  }

  return (
    <div className={cn("mx-auto", step === "pay" ? "max-w-4xl" : "max-w-3xl")}>
      {notice ? (
        <p className="mb-6 rounded-sm border border-caramel/30 bg-caramel/10 px-4 py-3 text-center text-sm text-ink-soft">
          {notice}
        </p>
      ) : null}

      <Steps step={step} mode={mode} />

      <AnimatePresence mode="wait">
        {step === "select" ? (
          <Panel key="select">
            <GlassCard className="p-5 sm:p-6">
              <p className="label-mono">Step 1</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em] text-ink">
                {selectedCategory
                  ? mode === "gift"
                    ? "How much?"
                    : "Choose a value"
                  : mode === "gift"
                    ? "Which card are you sending?"
                    : "Choose a card"}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">
                {menu.purchasable
                  ? "Starbucks gift cards — partnered with Starbucks. Tap a value to continue."
                  : "These are the values we’ll sell. Checkout opens when stock is live."}
              </p>

              {!selectedCategory ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {categories.map((category) => (
                    <button
                      key={category.categoryId}
                      type="button"
                      onClick={() => {
                        setCategoryId(category.categoryId);
                        setOffer(null);
                      }}
                      className="overflow-visible text-left transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      <CardArt
                        alt={`${category.categoryName} gift card`}
                        faceValueUsd={category.offers[0]?.faceValueUsd}
                        seed={doodleSeedForOffer(category.offers[0] ?? {
                          categoryId: category.categoryId,
                          cardId: category.categoryId,
                          name: category.categoryName,
                          categoryName: category.categoryName,
                        })}
                        showValue={false}
                      />
                      <span className="mt-2 block px-1 text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                        {category.categoryName}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {categories.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryId(null);
                        setOffer(null);
                      }}
                      className="mt-3 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-ink"
                    >
                      Choose a different card
                    </button>
                  ) : null}

                  <div className={cn("mt-4 grid gap-4", denominations.length > 1 && "sm:grid-cols-2")}>
                    {denominations.map((entry) => {
                      const active =
                        offer?.categoryId === entry.categoryId && offer?.cardId === entry.cardId;
                      const value = entry.faceValueUsd
                        ? formatUsd(BigInt(entry.faceValueUsd))
                        : entry.name;
                      const soldOut = entry.stock <= 0;
                      const solo = denominations.length === 1;
                      return (
                        <button
                          key={`${entry.categoryId}:${entry.cardId}`}
                          type="button"
                          onClick={() => {
                            if (!soldOut) setOffer(entry);
                          }}
                          disabled={soldOut}
                          aria-pressed={active}
                          className={cn(
                            "overflow-visible rounded-[1.2rem] p-1 text-left transition-transform duration-300 hover:-translate-y-0.5",
                            solo && "sm:grid sm:grid-cols-[minmax(0,18rem)_1fr] sm:items-center sm:gap-5",
                            active && "ring-2 ring-ink ring-offset-2 ring-offset-foam",
                            soldOut && "cursor-not-allowed opacity-55 hover:translate-y-0",
                          )}
                        >
                          <CardArt
                            alt={`${entry.categoryName} ${value} gift card`}
                            faceValueUsd={entry.faceValueUsd}
                            seed={doodleSeedForOffer(entry)}
                          />
                          <span className={cn("block px-1", solo ? "mt-2 sm:mt-0" : "mt-2")}>
                            <span className="block text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink">
                              {value}
                            </span>
                            <span className="mt-0.5 block text-[0.9375rem] font-semibold text-ink">
                              {formatUsd(BigInt(entry.providerPriceUsd))}
                            </span>
                            <span className="mt-0.5 block text-[0.75rem] font-semibold text-ink-soft">
                              {stockLabel(entry.stock)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {mode === "gift" ? (
                <div className="mt-5">
                  <GiftFields
                    senderName={senderName}
                    message={message}
                    onSenderName={setSenderName}
                    onMessage={setMessage}
                  />
                </div>
              ) : null}

              <Button
                className="mt-5 w-full"
                size="lg"
                disabled={!offer || offer.stock <= 0}
                onClick={() => {
                  setError(null);
                  setStep("cart");
                }}
              >
                {offer && offer.stock <= 0
                  ? "Out of stock"
                  : offer
                    ? "Continue"
                    : selectedCategory
                      ? "Pick a value"
                      : "Pick a card"}
              </Button>
            </GlassCard>
          </Panel>
        ) : null}

        {step === "cart" && offer ? (
          <Panel key="cart">
            <CartPanel
              offer={offer}
              purchasable={menu.purchasable}
              email={email}
              onEmail={setEmail}
              asset={asset}
              onAsset={setAsset}
              onClose={backToSelect}
              onRemove={() => {
                setOffer(null);
                backToSelect();
              }}
              onContinue={() => void requestQuote()}
              busy={busy === "quoting"}
              error={error}
            />
          </Panel>
        ) : null}

        {step === "pay" && offer && quote ? (
          <Panel key="pay">
            <PayPanel
              offer={offer}
              quote={quote}
              expired={expired}
              error={error}
              onBackToCart={() => {
                setQuote(null);
                setError(null);
                setStep("cart");
              }}
            />
          </Panel>
        ) : null}

        {step === "settling" ? (
          <Panel key="settling">
            <GlassCard className="p-10 text-center">
              <Brewing />
              <h2 className="mt-8 text-2xl font-medium tracking-[-0.02em] text-ink">
                Brewing
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
                Confirming your payment on Solana, then buying the card. Keep this tab open — it
                only takes a few seconds.
              </p>
            </GlassCard>
          </Panel>
        ) : null}

        {step === "done" && settlement ? (
          <Panel key="done">
            <Result
              mode={mode}
              settlement={settlement}
              status={orderStatus ?? settlement.status}
              offer={offer}
              onReveal={reveal}
            />
          </Panel>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Steps({ step, mode }: { step: Step; mode: "purchase" | "gift" }) {
  const labels = mode === "gift" ? ["Cart", "Pay", "Share"] : ["Cart", "Pay", "Card"];
  const index = step === "select" || step === "cart" ? 0 : step === "pay" || step === "settling" ? 1 : 2;

  return (
    <ol className="mb-4 flex items-center justify-center gap-2" aria-label="progress">
      {labels.map((label, position) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[0.6875rem] tracking-[0.14em] uppercase transition-colors duration-300",
              position <= index ? "text-ink" : "text-ink-soft/50",
            )}
          >
            {label}
          </span>
          {position < labels.length - 1 ? (
            <span
              className={cn(
                "h-px w-8 transition-colors duration-500",
                position < index ? "bg-cream-200/40" : "bg-cream-200/12",
              )}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Result({
  mode,
  settlement,
  status,
  offer,
  onReveal,
}: {
  mode: "purchase" | "gift";
  settlement: SettlementResponse;
  status: string;
  offer: MenuOffer | null;
  onReveal: () => Promise<RedemptionResponse>;
}) {
  const value = offer?.faceValueUsd ? formatUsd(BigInt(offer.faceValueUsd)) : (offer?.name ?? "");

  if (status === "refund_required" || status === "provider_failed") {
    return (
      <GlassCard className="p-8 text-center">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">
          Your payment is safe.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
          {errorCopy("refund_required")} We saved this on your order, with the transaction
          signature, so you can find it in your account.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/account" size="md">
            Open my account
          </ButtonLink>
        </div>
      </GlassCard>
    );
  }

  if (status !== "ready" && status !== "claimed") {
    return (
      <GlassCard className="p-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-none bg-forest-500/15 px-3 py-1.5 text-[0.6875rem] text-forest-500">
          <StatusDot />
          Payment confirmed
        </span>
        <h2 className="mt-5 text-2xl font-medium tracking-[-0.02em] text-ink">
          Almost there.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
          {errorCopy("provider_processing")}
        </p>
        <p className="mt-6 font-mono text-[0.6875rem] break-all text-ink-soft">
          {settlement.signature}
        </p>
      </GlassCard>
    );
  }

  if (mode === "gift") {
    return <GiftResult settlement={settlement} value={value} />;
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-[clamp(2rem,7vw,2.75rem)] leading-none font-medium tracking-[-0.035em] text-ink">
          You got coffee.
        </h2>
        <p className="mt-3 text-sm text-ink-soft">
          {offer?.categoryName ?? "Starbucks"} gift card · {value}
        </p>
      </div>

      <RevealCard
        onReveal={onReveal}
        title={`${offer?.categoryName ?? "Starbucks"} ${value}`}
        subtitle="Tap reveal when you’re ready to use it."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/account" variant="secondary" size="md">
          My purchases
        </ButtonLink>
        <ButtonLink href="/gift" variant="secondary" size="md">
          Send one to a friend
        </ButtonLink>
      </div>
    </div>
  );
}

function GiftResult({ settlement, value }: { settlement: SettlementResponse; value: string }) {
  const [copied, setCopied] = useState(false);
  const url = settlement.claimUrl ?? "";

  const shareText = encodeURIComponent(`I got you a Starbucks card: ${url}`);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-[clamp(1.875rem,6.5vw,2.5rem)] leading-tight font-medium tracking-[-0.035em] text-ink">
          Ready to send.
        </h2>
        <p className="mt-3 text-sm text-ink-soft">A {value} card, waiting on a link.</p>
      </div>

      <GlassCard className="p-6">
        <p className="label-mono">Gift link</p>
        <p className="mt-3 rounded-sm bg-foam px-3.5 py-3 font-mono text-[0.8125rem] break-all text-ink">
          {url}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          The card code is not in this link. Whoever opens it can claim the coffee once.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            className="flex-1"
            size="lg"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              });
            }}
          >
            {copied ? "Copied" : "Copy gift link"}
          </Button>
          <ButtonLink
            href={`https://x.com/intent/tweet?text=${shareText}`}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            Share on X
          </ButtonLink>
        </div>
      </GlassCard>

      <div className="flex justify-center">
        <ButtonLink href="/account" variant="ghost" size="md">
          See my sent coffees
        </ButtonLink>
      </div>
    </div>
  );
}

function Unavailable({ reason }: { reason: string | null }) {
  return (
    <div className="mx-auto max-w-xl">
      <GlassCard className="p-10 text-center">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">
          {errorCopy(reason)}
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
          We don’t have Starbucks cards we can send right now. Check back soon.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/" variant="secondary" size="md">
            Back home
          </ButtonLink>
        </div>
      </GlassCard>
    </div>
  );
}

function Brewing() {
  return (
    <div aria-hidden className="flex flex-col items-center">
      <div className="flex h-10 items-end gap-2">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="animate-steam w-[2px] rounded-full"
            style={{
              height: `${18 + index * 8}px`,
              background: "linear-gradient(0deg, rgba(226,205,178,0) 0%, rgba(226,205,178,0.8) 100%)",
              animationDelay: `${index * 0.9}s`,
            }}
          />
        ))}
      </div>
      <span
        className="mt-2 h-10 w-14 rounded-b-[1.25rem] rounded-t-md"
        style={{
          background: "linear-gradient(170deg, #f6efe4 0%, #e2cdb2 50%, #a97b57 100%)",
          boxShadow: "inset 0 -6px 14px rgba(74,51,37,0.35)",
        }}
      />
    </div>
  );
}

function toError(cause: unknown): { code: string; message: string } {
  if (cause instanceof ApiError) return { code: cause.code, message: cause.message };
  if (cause instanceof Error) return { code: "internal", message: cause.message };
  return { code: "internal", message: errorCopy("internal") };
}

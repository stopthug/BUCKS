"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CardArt } from "@/components/cards/card-art";
import { AssetPicker, type AssetOption } from "@/components/checkout/asset-picker";
import { GiftFields } from "@/components/checkout/gift-fields";
import { PaymentSummary } from "@/components/checkout/summary";
import { RevealCard } from "@/components/checkout/reveal-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { GlassCard, StatusDot } from "@/components/ui/glass";
import { ConnectButton } from "@/components/wallet/connect-button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { distinctDenominations, groupOffersByCategory, type CoffeeMenu, type MenuOffer } from "@/lib/menu";
import {
  ApiError,
  get,
  post,
  type BalancesResponse,
  type OrderResponse,
  type QuoteResponse,
  type RedemptionResponse,
  type SettlementResponse,
} from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { errorCopy } from "@/lib/errors";
import { formatUsd } from "@/lib/money";

/**
 * The buy and gift flows share this machine; only the copy, the extra gift
 * fields and the final screen differ.
 *
 * Two rules run through it. The client never computes an amount — it asks the
 * server for a quote and signs exactly what comes back. And it never declares
 * success: `POST /api/payments/confirm` is the authority, and after that the
 * order's own status decides what the user sees.
 */

type Step = "select" | "pay" | "settling" | "done";

const ASSET_ORDER = ["BUCKS", "SBUXx", "SOL", "USDC"] as const;

export function CheckoutFlow({
  menu,
  mode,
  initialCategoryId,
}: {
  menu: CoffeeMenu;
  mode: "purchase" | "gift";
  initialCategoryId?: string;
}) {
  const { status: walletStatus, address, signTransaction } = useWallet();
  const connected = walletStatus === "connected" && Boolean(address);

  const categories = useMemo(() => groupOffersByCategory(menu.offers), [menu.offers]);
  const defaultCategoryId =
    initialCategoryId && categories.some((entry) => entry.categoryId === initialCategoryId)
      ? initialCategoryId
      : categories.length === 1
        ? categories[0]?.categoryId
        : null;

  const [step, setStep] = useState<Step>("select");
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId ?? null);
  const [offer, setOffer] = useState<MenuOffer | null>(null);
  const [assetSymbol, setAssetSymbol] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadedBalances, setLoadedBalances] = useState<{
    address: string;
    balances: BalancesResponse["balances"];
  } | null>(null);
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState<null | "quoting" | "signing" | "settling">(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const selectedCategory = categories.find((entry) => entry.categoryId === categoryId) ?? null;
  const denominations = useMemo(
    () => distinctDenominations(selectedCategory?.offers ?? []),
    [selectedCategory],
  );

  // Balances follow the connected wallet. Stored with the address they belong
  // to, so switching wallets can never show the previous one's numbers.
  useEffect(() => {
    if (!address) return;

    let cancelled = false;
    void get<BalancesResponse>(`/api/balances?address=${address}`)
      .then((data) => {
        if (!cancelled) setLoadedBalances({ address, balances: data.balances });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [address]);

  const balances =
    loadedBalances && loadedBalances.address === address ? loadedBalances.balances : null;

  const assetOptions: AssetOption[] = useMemo(() => {
    const configured = new Set(balances?.map((entry) => entry.symbol) ?? ASSET_ORDER);

    return ASSET_ORDER.filter((symbol) => configured.has(symbol)).map((symbol) => {
      const balance = balances?.find((entry) => entry.symbol === symbol);
      return {
        symbol,
        label: balance?.label ?? (symbol === "BUCKS" ? "$BUCKS" : symbol),
        decimals: balance?.decimals ?? (symbol === "SOL" ? 9 : 6),
        balance: balance?.amount ?? null,
      };
    });
  }, [balances]);

  const requestQuote = useCallback(
    async (target: MenuOffer, symbol: string) => {
      setBusy("quoting");
      setError(null);
      setQuote(null);

      try {
        const response = await post<QuoteResponse>("/api/quote", {
          categoryId: target.categoryId,
          cardId: target.cardId,
          asset: symbol,
          intent: mode,
          senderName: mode === "gift" ? senderName || null : null,
          message: mode === "gift" ? message || null : null,
        });
        setQuote(response);
      } catch (cause) {
        setError(toError(cause));
      } finally {
        setBusy(null);
      }
    },
    [mode, senderName, message],
  );

  const selectAsset = (symbol: string) => {
    setAssetSymbol(symbol);
    if (offer) void requestQuote(offer, symbol);
  };

  const confirm = async () => {
    if (!quote) return;

    setError(null);
    setBusy("signing");

    let signed: string;
    try {
      signed = await signTransaction(quote.transaction);
    } catch (cause) {
      setBusy(null);
      // Wallet rejection is a normal outcome, not a failure state.
      const messageText = cause instanceof Error ? cause.message : "";
      setError(
        /cancel|reject|denied|declin/i.test(messageText)
          ? { code: "wallet_rejected", message: errorCopy("wallet_rejected") }
          : toError(cause),
      );
      return;
    }

    setBusy("settling");
    setStep("settling");

    try {
      const result = await post<SettlementResponse>("/api/payments/confirm", {
        quoteId: quote.quoteId,
        signedTransaction: signed,
      });

      setSettlement(result);
      setOrderStatus(result.status);
      setStep("done");
    } catch (cause) {
      setError(toError(cause));
      setStep("pay");
    } finally {
      setBusy(null);
    }
  };

  // A card that is still being prepared resolves itself: the order route
  // advances provider state each time it is read.
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

  if (!menu.available) {
    return <Unavailable reason={menu.reason} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      {menu.sandbox ? (
        <p className="mb-6 rounded-2xl border border-crema-300/30 bg-crema-300/8 px-4 py-3 text-center font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-crema-300">
          development fixture — not live provider data
        </p>
      ) : null}

      <Steps step={step} mode={mode} />

      <AnimatePresence mode="wait">
        {step === "select" ? (
          <Panel key="select">
            <GlassCard className="p-6 sm:p-8">
              <p className="label-mono">step 01</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em] text-cream-50">
                {selectedCategory
                  ? mode === "gift"
                    ? `send ${selectedCategory.categoryName}.`
                    : `choose ${selectedCategory.categoryName}.`
                  : mode === "gift"
                    ? "which card are you sending?"
                    : "which card do you want?"}
              </h2>
              <p className="mt-2 text-sm text-cream-500">
                {selectedCategory
                  ? "pick a value. we only show amounts that are in stock."
                  : "live cards from our provider. tap one to pick an amount."}
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
                      className="glass-soft overflow-hidden rounded-2xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-cream-200/20"
                    >
                      <CardArt
                        src={category.imageUrl}
                        alt={`${category.categoryName} gift card`}
                        className="rounded-none"
                      />
                      <span className="block px-4 py-3 text-[0.9375rem] font-medium tracking-[-0.02em] text-cream-50">
                        {category.categoryName}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="mt-6 overflow-hidden rounded-2xl">
                    <CardArt
                      src={selectedCategory.imageUrl}
                      alt={`${selectedCategory.categoryName} gift card`}
                      className="rounded-2xl"
                    />
                  </div>

                  {categories.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryId(null);
                        setOffer(null);
                      }}
                      className="mt-3 text-[0.8125rem] text-cream-500 transition-colors hover:text-cream-200"
                    >
                      choose a different card
                    </button>
                  ) : null}

                  <div className="mt-6 grid gap-2 sm:grid-cols-3">
                    {denominations.map((entry) => {
                      const active =
                        offer?.categoryId === entry.categoryId && offer?.cardId === entry.cardId;
                      return (
                        <button
                          key={`${entry.categoryId}:${entry.cardId}`}
                          type="button"
                          onClick={() => setOffer(entry)}
                          aria-pressed={active}
                          className={cn(
                            "glass-soft rounded-2xl px-4 py-5 text-left transition-all duration-300",
                            "hover:-translate-y-0.5 hover:border-cream-200/20 hover:bg-cream-100/8",
                            active && "border-crema-300/45 bg-cream-100/10",
                          )}
                        >
                          <span className="block text-2xl font-medium tracking-[-0.03em] text-cream-50">
                            {entry.faceValueUsd ? formatUsd(BigInt(entry.faceValueUsd)) : entry.name}
                          </span>
                          <span className="mt-1.5 block font-mono text-[0.6875rem] text-cream-500">
                            {formatUsd(BigInt(entry.providerPriceUsd))} at checkout
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {mode === "gift" ? (
                <div className="mt-8">
                  <GiftFields
                    senderName={senderName}
                    message={message}
                    onSenderName={setSenderName}
                    onMessage={setMessage}
                  />
                </div>
              ) : null}

              <Button
                className="mt-8 w-full"
                size="lg"
                disabled={!offer}
                onClick={() => setStep("pay")}
              >
                {offer ? "choose payment" : selectedCategory ? "pick a value" : "pick a card"}
              </Button>
            </GlassCard>
          </Panel>
        ) : null}

        {step === "pay" && offer ? (
          <Panel key="pay">
            <GlassCard className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-mono">step 02</p>
                  <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em] text-cream-50">
                    choose payment.
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("select");
                    setQuote(null);
                    setAssetSymbol(null);
                  }}
                  className="text-[0.8125rem] text-cream-500 transition-colors hover:text-cream-200"
                >
                  change card
                </button>
              </div>

              <div className="glass-soft mt-6 flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5">
                <div>
                  <p className="text-[0.9375rem] text-cream-100">
                    {offer.categoryName} gift card
                  </p>
                  <p className="text-xs text-cream-500">{offer.name}</p>
                </div>
                <p className="text-xl font-medium tracking-[-0.02em] text-cream-50">
                  {offer.faceValueUsd ? formatUsd(BigInt(offer.faceValueUsd)) : "—"}
                </p>
              </div>

              {connected ? (
                <>
                  <div className="mt-7">
                    <p className="label-mono">pay with</p>
                    <div className="mt-3">
                      <AssetPicker
                        assets={assetOptions}
                        selected={assetSymbol}
                        onSelect={selectAsset}
                        disabled={busy !== null}
                      />
                    </div>
                  </div>

                  {busy === "quoting" ? (
                    <p className="mt-6 text-sm text-cream-400">pricing your card…</p>
                  ) : null}

                  {quote ? (
                    <div className="mt-7">
                      <PaymentSummary quote={quote} />

                      <Button
                        className="mt-7 w-full"
                        size="lg"
                        onClick={() => void confirm()}
                        disabled={busy !== null}
                      >
                        {busy === "signing"
                          ? "check your wallet"
                          : mode === "gift"
                            ? "send gift"
                            : "confirm with wallet"}
                      </Button>

                      <button
                        type="button"
                        onClick={() => assetSymbol && offer && void requestQuote(offer, assetSymbol)}
                        disabled={busy !== null}
                        className="mt-3 w-full text-center text-[0.8125rem] text-cream-500 transition-colors hover:text-cream-200"
                      >
                        refresh price
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="glass-soft mt-7 rounded-2xl p-5 text-center">
                  <p className="text-[0.9375rem] text-cream-100">connect a wallet to continue.</p>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-cream-500">
                    you&rsquo;ll sign a message to prove it&rsquo;s yours. we never ask for a seed
                    phrase or private key.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <ConnectButton size="md" />
                  </div>
                </div>
              )}

              {error ? <ErrorNote error={error} /> : null}
            </GlassCard>
          </Panel>
        ) : null}

        {step === "settling" ? (
          <Panel key="settling">
            <GlassCard className="p-10 text-center">
              <Brewing />
              <h2 className="mt-8 text-2xl font-medium tracking-[-0.02em] text-cream-50">
                brewing.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream-500">
                landing your transaction, verifying it onchain, then buying the card. this takes a
                few seconds — don&rsquo;t close this tab.
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
  const labels =
    mode === "gift"
      ? ["amount", "pay", "share"]
      : ["amount", "pay", "card"];

  const index = step === "select" ? 0 : step === "pay" ? 1 : 2;

  return (
    <ol className="mb-6 flex items-center justify-center gap-2" aria-label="progress">
      {labels.map((label, position) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[0.6875rem] tracking-[0.14em] uppercase transition-colors duration-300",
              position <= index ? "text-cream-200" : "text-cream-500/50",
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

/**
 * Final screen. Branches on the order's real status, including the case where
 * the payment landed but the provider could not deliver.
 */
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
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-cream-50">
          your payment is safe.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream-400">
          {errorCopy("refund_required")} we recorded this against your order, and it&rsquo;s
          visible in your account with the transaction signature.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/account" size="md">
            open my account
          </ButtonLink>
        </div>
      </GlassCard>
    );
  }

  if (status !== "ready" && status !== "claimed") {
    return (
      <GlassCard className="p-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-forest-500/15 px-3 py-1.5 text-[0.6875rem] text-forest-300">
          <StatusDot />
          payment confirmed onchain
        </span>
        <h2 className="mt-5 text-2xl font-medium tracking-[-0.02em] text-cream-50">
          almost there.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream-400">
          {errorCopy("provider_processing")}
        </p>
        <p className="mt-6 font-mono text-[0.6875rem] break-all text-cream-500">
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
        <h2 className="text-[clamp(2rem,7vw,2.75rem)] leading-none font-medium tracking-[-0.035em] text-cream-50">
          card secured.
        </h2>
        <p className="mt-3 text-sm text-cream-500">
          {offer?.categoryName ?? "Starbucks"} gift card · {value}
        </p>
      </div>

      <RevealCard
        onReveal={onReveal}
        title={`${offer?.categoryName ?? "Starbucks"} ${value}`}
        subtitle="tap reveal when you're ready to use it."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/account" variant="secondary" size="md">
          my purchases
        </ButtonLink>
        <ButtonLink href="/gift" variant="secondary" size="md">
          send one to a friend
        </ButtonLink>
      </div>
    </div>
  );
}

function GiftResult({ settlement, value }: { settlement: SettlementResponse; value: string }) {
  const [copied, setCopied] = useState(false);
  const url = settlement.claimUrl ?? "";

  const shareText = encodeURIComponent(`i bought you a gift card. ${url}`);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-[clamp(1.875rem,6.5vw,2.5rem)] leading-tight font-medium tracking-[-0.035em] text-cream-50">
          your gift is ready to send.
        </h2>
        <p className="mt-3 text-sm text-cream-500">a {value} card, waiting on a link.</p>
      </div>

      <GlassCard className="p-6">
        <p className="label-mono">gift link</p>
        <p className="mt-3 rounded-xl bg-espresso-950/50 px-3.5 py-3 font-mono text-[0.8125rem] break-all text-cream-200">
          {url}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-cream-500">
          the card code is not in this link. whoever opens it claims the gift once.
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
            {copied ? "copied" : "copy gift link"}
          </Button>
          <ButtonLink
            href={`https://x.com/intent/tweet?text=${shareText}`}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            share on X
          </ButtonLink>
        </div>
      </GlassCard>

      <div className="flex justify-center">
        <ButtonLink href="/account" variant="ghost" size="md">
          see my sent gifts
        </ButtonLink>
      </div>
    </div>
  );
}

function Unavailable({ reason }: { reason: string | null }) {
  return (
    <div className="mx-auto max-w-xl">
      <GlassCard className="p-10 text-center">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-cream-50">
          {errorCopy(reason)}
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-cream-500">
          our card provider has no inventory we can fulfil right now. we don&rsquo;t list
          cards we can&rsquo;t deliver, so there is nothing to buy until this clears.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/" variant="secondary" size="md">
            back to the counter
          </ButtonLink>
        </div>
      </GlassCard>
    </div>
  );
}

function ErrorNote({ error }: { error: { code: string; message: string } }) {
  const retryable = ["quote_expired", "out_of_stock", "offer_unavailable", "no_route"].includes(
    error.code,
  );

  return (
    <div className="mt-6 rounded-2xl border border-crema-300/25 bg-crema-300/8 px-4 py-3.5" role="alert">
      <p className="text-sm text-crema-200">{error.message}</p>
      {retryable ? (
        <p className="mt-1 text-xs text-cream-500">
          nothing was charged. adjust and try again — or{" "}
          <Link href="/coffee" className="underline underline-offset-2">
            reload the menu
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

/** Steam rising from a cup: the one place a loader earns some personality. */
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
          background: "linear-gradient(170deg, #f6efe4 0%, #e2cdb2 50%, #a9866a 100%)",
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

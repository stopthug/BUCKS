"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/glass";
import { cn } from "@/lib/cn";

import { useWallet } from "./wallet-provider";

/**
 * Wallet picker. Checkout uses this to pay (no login). Account uses it to
 * sign in and see past orders.
 */
export function WalletSheet({
  open,
  onClose,
  authenticate = false,
  title,
  body,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  authenticate?: boolean;
  title: string;
  body: string;
  onConnected?: (address: string) => void;
}) {
  const { status, wallets, connect, error, clearError } = useWallet();
  const busy = status === "connecting" || status === "signing-in";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-100 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="close"
            onClick={() => {
              clearError();
              onClose();
            }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="glass relative z-10 w-full max-w-md rounded-none p-6 sm:pb-6"
          >
            <p className="label-mono">{authenticate ? "Account" : "Pay"}</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.02em] text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>

            <div className="mt-6 space-y-2">
              {wallets.length === 0 ? (
                <div className="glass-soft rounded-sm p-4 text-sm text-ink-soft">
                  No Solana wallet in this browser. Install Phantom, Solflare, or Backpack, then
                  reload.
                </div>
              ) : (
                wallets.map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => {
                      void connect(entry.wallet, { authenticate }).then((payer) => {
                        if (payer) {
                          onClose();
                          onConnected?.(payer);
                        }
                      });
                    }}
                    disabled={busy}
                    className={cn(
                      "glass-soft flex w-full items-center gap-3 rounded-sm px-4 py-3.5 text-left transition-all duration-200",
                      "hover:border-cream-200/20 hover:bg-cream-100/8 disabled:opacity-50",
                    )}
                  >
                    {entry.icon ? (
                      // Wallet icons arrive as data URIs from the registry.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.icon} alt="" className="size-7 rounded-none" />
                    ) : (
                      <span className="size-7 rounded-none bg-roast-500/40" />
                    )}
                    <span className="flex-1 text-[0.9375rem] font-semibold text-ink">
                      {entry.name}
                    </span>
                    <span className="text-ink-soft">→</span>
                  </button>
                ))
              )}
            </div>

            {error ? (
              <p className="mt-4 text-sm text-roast-500" role="alert">
                {error}
              </p>
            ) : null}

            {busy ? (
              <p className="mt-4 text-sm text-ink-soft">
                {status === "signing-in"
                  ? "Approve the signature in your wallet."
                  : "Waiting for your wallet…"}
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Account-only sign-in. Checkout never renders this — payment opens the
 * wallet at the Pay step instead.
 */
export function ConnectButton({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { status, address, disconnect, error, clearError } = useWallet();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const busy = status === "connecting" || status === "signing-in";

  if (status === "connected" && address) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="secondary"
          size={size}
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
        >
          <StatusDot />
          <span className="font-mono text-xs tracking-tight">{truncate(address)}</span>
        </Button>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="glass absolute right-0 top-full z-50 mt-2 w-52 rounded-sm p-2"
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void navigator.clipboard?.writeText(address);
                }}
                className="w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5"
              >
                Copy address
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void disconnect();
                }}
                className="w-full px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
              >
                Sign out
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        className={className}
        onClick={() => {
          clearError();
          setOpen(true);
        }}
        disabled={busy}
      >
        {busy ? (status === "signing-in" ? "Approve in wallet" : "Opening wallet…") : "View my cards"}
      </Button>

      <WalletSheet
        open={open}
        onClose={() => setOpen(false)}
        authenticate
        title="See your purchases"
        body="Approve a signature so we can show the cards this wallet bought. We never ask for a seed phrase."
      />
      {error && !open ? (
        <p className="mt-2 text-sm text-roast-500" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

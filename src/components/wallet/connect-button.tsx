"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/glass";
import { cn } from "@/lib/cn";

import { useWallet } from "./wallet-provider";

/**
 * Connect control plus the wallet picker. On phones the picker is a bottom
 * sheet, because that is where a thumb is during checkout.
 */
export function ConnectButton({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { status, address, wallets, connect, disconnect, error, clearError } = useWallet();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock the page behind the sheet so iOS does not scroll the body under it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

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
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="glass absolute right-0 z-50 mt-2 w-52 rounded-2xl p-2"
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void navigator.clipboard?.writeText(address);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-cream-200 transition-colors hover:bg-cream-100/8"
              >
                copy address
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void disconnect();
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-cream-400 transition-colors hover:bg-cream-100/8 hover:text-cream-100"
              >
                disconnect
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
        {busy ? (status === "signing-in" ? "sign to continue" : "connecting") : "connect wallet"}
      </Button>

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
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-espresso-950/80 backdrop-blur-md"
            />

            <motion.div
              role="dialog"
              aria-modal
              aria-label="connect a wallet"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="glass relative z-10 w-full max-w-md rounded-t-glass p-6 pb-8 sm:rounded-glass sm:pb-6"
            >
              <p className="label-mono">connect</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em] text-cream-50">
                choose your wallet.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cream-400">
                you&rsquo;ll sign a message to prove the wallet is yours. we never ask for a seed
                phrase or a private key.
              </p>

              <div className="mt-6 space-y-2">
                {wallets.length === 0 ? (
                  <div className="glass-soft rounded-2xl p-4 text-sm text-cream-400">
                    no Solana wallet detected in this browser. install Phantom, Solflare or
                    Backpack, then reload this page.
                  </div>
                ) : (
                  wallets.map((entry) => (
                    <button
                      key={entry.name}
                      type="button"
                      onClick={() => {
                        void connect(entry.wallet).then((connected) => {
                          if (connected) setOpen(false);
                        });
                      }}
                      disabled={busy}
                      className={cn(
                        "glass-soft flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all duration-200",
                        "hover:border-cream-200/20 hover:bg-cream-100/8 disabled:opacity-50",
                      )}
                    >
                      {entry.icon ? (
                        // Wallet icons arrive as data URIs from the registry.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.icon} alt="" className="size-7 rounded-lg" />
                      ) : (
                        <span className="size-7 rounded-lg bg-roast-500/40" />
                      )}
                      <span className="flex-1 text-[0.9375rem] text-cream-100">{entry.name}</span>
                      <span className="text-cream-500">→</span>
                    </button>
                  ))
                )}
              </div>

              {error ? (
                <p className="mt-4 text-sm text-crema-300" role="alert">
                  {error}
                </p>
              ) : null}

              {busy ? (
                <p className="mt-4 text-sm text-cream-400">
                  {status === "signing-in"
                    ? "approve the signature request in your wallet."
                    : "waiting for your wallet."}
                </p>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

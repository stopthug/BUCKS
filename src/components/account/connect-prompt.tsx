"use client";

import { GlassCard } from "@/components/ui/glass";
import { ConnectButton } from "@/components/wallet/connect-button";

export function ConnectPrompt() {
  return (
    <GlassCard className="p-10 text-center">
      <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Connect your wallet</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
        Purchases and gifts are tied to the wallet that paid. Sign a message — that’s the login.
      </p>
      <div className="mt-7 flex justify-center">
        <ConnectButton size="md" />
      </div>
    </GlassCard>
  );
}

"use client";

import { GlassCard } from "@/components/ui/glass";
import { ConnectButton } from "@/components/wallet/connect-button";

export function ConnectPrompt() {
  return (
    <GlassCard className="p-10 text-center">
      <h2 className="text-xl font-medium tracking-[-0.02em] text-cream-50">
        connect your wallet.
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream-500">
        your purchases and sent coffees are tied to the wallet that paid for them. sign a message
        to prove it&rsquo;s yours — that&rsquo;s the whole login.
      </p>
      <div className="mt-7 flex justify-center">
        <ConnectButton size="md" />
      </div>
    </GlassCard>
  );
}

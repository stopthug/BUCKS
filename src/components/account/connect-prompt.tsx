"use client";

import { GlassCard } from "@/components/ui/glass";
import { ConnectButton } from "@/components/wallet/connect-button";

export function ConnectPrompt() {
  return (
    <GlassCard className="p-10 text-center">
      <h2 className="text-xl font-extrabold tracking-[-0.02em] text-ink">See your purchases</h2>
      <p className="mx-auto mt-3 max-w-sm text-[1.05rem] leading-relaxed text-ink">
        Purchases are tied to the wallet that paid. Approve a signature to view them — that’s the
        login. Checkout itself doesn’t need this.
      </p>
      <div className="mt-7 flex justify-center">
        <ConnectButton size="md" />
      </div>
    </GlassCard>
  );
}

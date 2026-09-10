import type { Metadata } from "next";

import { AccountOrders } from "@/components/account/account-orders";
import { ConnectPrompt } from "@/components/account/connect-prompt";
import { GlassCard } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { toOrderWithGiftDto } from "@/lib/api/dto";
import { getSession } from "@/lib/auth/session";
import { listOrdersForUser } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  description: "Your purchases and the coffees you’ve sent.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getSession();

  const data = session
    ? await load(session.userId).catch(() => null)
    : null;

  return (
    <div className="px-4 pt-32 pb-24 sm:px-6 sm:pt-36">
      <Reveal>
        <header className="mx-auto max-w-3xl">
          <p className="label-mono">Account</p>
          <h1 className="font-display mt-4 text-[clamp(2.25rem,7vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Your coffee.
          </h1>
          {session?.address ? (
            <p className="mt-4 font-mono text-xs text-ink-soft">{session.address}</p>
          ) : session ? (
            <p className="mt-4 text-sm text-ink-soft">
              Guest checkout — this browser can open the cards you just bought.
            </p>
          ) : null}
        </header>
      </Reveal>

      <div className="mx-auto mt-12 max-w-3xl">
        {!session ? (
          <ConnectPrompt />
        ) : !data ? (
          <GlassCard className="p-10 text-center">
            <p className="text-ink">Couldn’t load your history just now.</p>
            <p className="mt-2 text-sm text-ink-soft">Refresh in a moment.</p>
          </GlassCard>
        ) : (
          <AccountOrders purchases={data.purchases} gifts={data.gifts} />
        )}
      </div>
    </div>
  );
}

async function load(userId: string) {
  const [purchases, gifts] = await Promise.all([
    listOrdersForUser(userId, "purchase"),
    listOrdersForUser(userId, "gift"),
  ]);

  return {
    purchases: purchases.map((entry) => toOrderWithGiftDto(entry, { includeClaimUrl: false })),
    gifts: gifts.map((entry) => toOrderWithGiftDto(entry, { includeClaimUrl: true })),
  };
}

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
  title: "account",
  description: "Your coffee purchases and the coffees you have sent.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getSession();

  const data = session
    ? await load(session.userId).catch(() => null)
    : null;

  return (
    <div className="px-4 pt-32 pb-16 sm:px-6 sm:pt-40">
      <Reveal>
        <header className="mx-auto max-w-3xl">
          <p className="label-mono">account</p>
          <h1 className="mt-4 text-[clamp(2.25rem,7vw,3.5rem)] leading-none font-medium tracking-[-0.04em]">
            <span className="text-sheen">your coffee.</span>
          </h1>
          {session ? (
            <p className="mt-4 font-mono text-xs text-cream-500">{session.address}</p>
          ) : null}
        </header>
      </Reveal>

      <div className="mx-auto mt-12 max-w-3xl">
        {!session ? (
          <ConnectPrompt />
        ) : !data ? (
          <GlassCard className="p-10 text-center">
            <p className="text-cream-200">we couldn&rsquo;t load your history just now.</p>
            <p className="mt-2 text-sm text-cream-500">refresh in a moment.</p>
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
    // The sender owns these gifts, so their own links are theirs to copy again.
    gifts: gifts.map((entry) => toOrderWithGiftDto(entry, { includeClaimUrl: true })),
  };
}

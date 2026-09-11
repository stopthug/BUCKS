import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClaimExperience } from "@/components/claim/claim-experience";
import { getClaimView } from "@/lib/claim";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * The claim page is rendered on the server so the recipient sees the gift
 * immediately, with no spinner and no wallet prompt. Claiming itself is a
 * single button that talks to the claim API.
 *
 * The token lives in the URL, so this page is explicitly excluded from search
 * engines and referrers.
 */
export const metadata: Metadata = {
  title: "Someone sent you coffee",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let view;
  try {
    view = await getClaimView(token);
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") notFound();
    throw error;
  }

  return (
    <div className="px-4 pt-24 pb-12 sm:px-6 sm:pt-24">
      <ClaimExperience token={token} initial={view} />
    </div>
  );
}

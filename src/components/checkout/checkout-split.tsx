import type { ReactNode } from "react";

import { GlassCard } from "@/components/ui/glass";
import { cn } from "@/lib/cn";

/** One landscape checkout box: art or QR on the left, actions on the right. */
export function CheckoutSplit({
  art,
  children,
  className,
}: {
  art: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={cn("p-3 sm:p-5", className)}>
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="min-w-0">{art}</div>
        <div className="min-w-0">{children}</div>
      </div>
    </GlassCard>
  );
}

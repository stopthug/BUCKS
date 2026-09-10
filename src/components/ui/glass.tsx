import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function GlassCard({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag className={cn("glass rounded-glass", className)}>
      {children}
    </Tag>
  );
}

export function GlassPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "glass inline-flex items-center gap-2 rounded-none px-3.5 py-1.5 text-xs text-ink-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small mono caption above a headline. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label-mono", className)}>{children}</p>;
}

/**
 * Two-tone section heading, echoing the reference layout where a bold phrase
 * runs into a lighter continuation on the same line.
 */
export function SectionHeading({
  lead,
  trail,
  className,
}: {
  lead: ReactNode;
  trail?: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-[clamp(1.75rem,4.4vw,3rem)] font-display leading-[1.08] font-extrabold tracking-[-0.03em]",
        className,
      )}
    >
      <span className="text-ink">{lead}</span>
      {trail ? <span className="text-ink-soft"> {trail}</span> : null}
    </h2>
  );
}

export function StatusDot({ tone = "green" }: { tone?: "green" | "amber" | "muted" }) {
  const tones = {
    green: "bg-forest-400",
    amber: "bg-crema-300",
    muted: "bg-cream-500/60",
  } as const;

  return <span className={cn("size-1.5 shrink-0 rounded-full", tones[tone])} />;
}

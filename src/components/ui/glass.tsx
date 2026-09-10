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
        "glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-cream-200",
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
        "text-[clamp(1.75rem,4.4vw,3rem)] leading-[1.05] font-medium tracking-[-0.03em]",
        className,
      )}
    >
      <span className="text-cream-50">{lead}</span>
      {trail ? <span className="text-cream-500"> {trail}</span> : null}
    </h2>
  );
}

export function StatusDot({ tone = "green" }: { tone?: "green" | "amber" | "muted" }) {
  const tones = {
    green: "bg-forest-300 shadow-[0_0_0_3px_rgba(107,180,137,0.16)]",
    amber: "bg-crema-300 shadow-[0_0_0_3px_rgba(200,168,130,0.16)]",
    muted: "bg-cream-500/60",
  } as const;

  return <span className={cn("size-1.5 shrink-0 rounded-full", tones[tone])} />;
}

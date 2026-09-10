import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Buttons are pills with a soft inner light. Deliberately restrained: no glow,
 * no gradient sweep, no scale-up on hover — just a small lift and a warmer
 * surface, which is what makes a dark interface feel expensive rather than loud.
 */

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: cn(
    "bg-cream-50 text-espresso-900 shadow-[0_12px_30px_-12px_rgba(253,249,243,0.35)]",
    "hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_38px_-14px_rgba(253,249,243,0.45)]",
    "active:translate-y-0",
  ),
  accent: cn(
    "bg-forest-500 text-cream-50 shadow-[0_12px_30px_-14px_rgba(45,106,70,0.7)]",
    "hover:-translate-y-0.5 hover:bg-forest-400",
    "active:translate-y-0",
  ),
  secondary: cn(
    "glass text-cream-100",
    "hover:-translate-y-0.5 hover:border-cream-200/25 hover:text-white",
    "active:translate-y-0",
  ),
  ghost: "text-cream-400 hover:text-cream-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem]",
  md: "h-11 px-6 text-[0.9375rem]",
  lg: "h-14 px-8 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...props
}: CommonProps & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href">) {
  const isExternal = /^https?:/.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(base, variants[variant], sizes[size], className)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { StarbucksMark } from "@/components/brand/starbucks-mark";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/coffee", label: "Coffee" },
  { href: "/gift", label: "Gift" },
  { href: "/trade", label: "Trade" },
  { href: "/about", label: "About" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-[3px] border-ink bg-[#e8f3ea]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <StarbucksMark className="size-9" />
          <span className="flex flex-col leading-none">
            <span className="text-[1.15rem] font-extrabold tracking-tight text-ink">$BUCKS</span>
            <span className="text-[0.6rem] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
              Partnered with Starbucks
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1 text-[0.9375rem] font-semibold",
                  active ? "text-ink underline decoration-2 underline-offset-4" : "text-ink-soft hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/account"
            className={cn(
              "rounded-md px-3 py-1 text-[0.9375rem] font-semibold",
              pathname === "/account"
                ? "text-ink underline decoration-2 underline-offset-4"
                : "text-ink-soft hover:text-ink",
            )}
          >
            Account
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/coffee" variant="primary" size="sm">
            Get a gift card
          </ButtonLink>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="flex size-10 items-center justify-center md:hidden"
          >
            <span className="flex flex-col gap-[3px]">
              <span
                className={cn(
                  "block h-px w-4 bg-ink transition-transform duration-300",
                  menuOpen && "translate-y-[4px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-px w-4 bg-ink transition-opacity duration-200",
                  menuOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "block h-px w-4 bg-ink transition-transform duration-300",
                  menuOpen && "-translate-y-[4px] -rotate-45",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t-[3px] border-ink bg-[#e8f3ea] transition-all duration-300 ease-out md:hidden",
          menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="px-4 py-2">
          {[...LINKS, { href: "/account", label: "Account" } as const].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-2 py-2 text-lg font-semibold text-ink"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

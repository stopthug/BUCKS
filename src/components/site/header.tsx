"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { ConnectButton } from "@/components/wallet/connect-button";
import { cn } from "@/lib/cn";

/**
 * Floating glass header, laid out like the reference: a small mark on the
 * left, a centred pill of links, and one action on the right. It hovers over
 * the page rather than sitting on a bar, and only gains weight once you
 * scroll past the hero.
 */

const LINKS = [
  { href: "/coffee", label: "coffee" },
  { href: "/gift", label: "gift" },
  { href: "/trade", label: "trade" },
  { href: "/about", label: "about" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-5">
        {/* Mark */}
        <Link
          href="/"
          className={cn(
            "glass pointer-events-auto flex items-center gap-2 rounded-full pr-4 pl-2.5 transition-all duration-500",
            scrolled ? "h-10" : "h-11",
          )}
        >
          <BeanMark />
          <span className="text-sm font-semibold tracking-[-0.02em] text-cream-50">$BUCKS</span>
        </Link>

        {/* Centre nav */}
        <nav
          className={cn(
            "glass pointer-events-auto hidden items-center gap-1 rounded-full px-2 transition-all duration-500 md:flex",
            scrolled ? "h-10" : "h-11",
          )}
        >
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors duration-200",
                  active ? "text-cream-50" : "text-cream-400 hover:text-cream-100",
                )}
              >
                {active ? (
                  <span className="absolute inset-0 rounded-full bg-cream-100/10" />
                ) : null}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-cream-200/12" />
          <Link
            href="/account"
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors duration-200",
              pathname === "/account" ? "text-cream-50" : "text-cream-400 hover:text-cream-100",
            )}
          >
            account
          </Link>
        </nav>

        {/* Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          <ConnectButton className="hidden sm:inline-flex" />
          <ButtonLink href="/coffee" variant="accent" size="sm" className="hidden sm:inline-flex">
            buy coffee
          </ButtonLink>

          <button
            type="button"
            aria-label="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="glass flex size-10 items-center justify-center rounded-full md:hidden"
          >
            <span className="flex flex-col gap-[3px]">
              <span
                className={cn(
                  "block h-px w-4 bg-cream-100 transition-transform duration-300",
                  menuOpen && "translate-y-[4px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-px w-4 bg-cream-100 transition-opacity duration-200",
                  menuOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "block h-px w-4 bg-cream-100 transition-transform duration-300",
                  menuOpen && "-translate-y-[4px] -rotate-45",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        className={cn(
          "pointer-events-auto mx-4 overflow-hidden transition-all duration-400 ease-out md:hidden",
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="glass rounded-3xl p-3">
          {[...LINKS, { href: "/account", label: "account" } as const].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 text-[0.9375rem] text-cream-200 transition-colors hover:bg-cream-100/8"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 px-1 pb-1">
            <ConnectButton size="md" className="w-full" />
            <ButtonLink href="/coffee" variant="accent" size="md" className="w-full">
              buy coffee
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * The $BUCKS mark: a roasted bean rendered as a soft disc with a centre
 * crease. Intentionally nothing like a siren, a crown or a rocket.
 */
function BeanMark() {
  return (
    <span
      aria-hidden
      className="relative flex size-6 items-center justify-center overflow-hidden rounded-[50%/44%]"
      style={{
        background:
          "radial-gradient(62% 58% at 34% 28%, #e2cdb2 0%, #8a6247 38%, #33231a 78%, #1b120d 100%)",
        boxShadow: "inset 0 -2px 5px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,240,220,0.35)",
      }}
    >
      <span
        className="h-full w-[13%] rounded-full"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,13,9,0) 8%, rgba(20,13,9,0.9) 32%, rgba(20,13,9,0.9) 68%, rgba(20,13,9,0) 92%)",
        }}
      />
    </span>
  );
}

import Link from "next/link";

import { ContractAddress } from "@/components/home/contract-address";
import { SocialLinks } from "@/components/site/social-links";

export function Footer() {
  return (
    <footer className="relative z-10 bg-forest-600 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-foam">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="hairline h-px opacity-40" />

        <div className="mt-6 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg font-extrabold tracking-[-0.02em] text-foam">$BUCKS</p>
            <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-foam/90">
              $BUCKS is partnered with Starbucks. Buy a real Starbucks gift card with crypto, or
              send one as a link. Starbucks® is a trademark of Starbucks Corporation. SBUXx is a
              third-party token.
            </p>
            <p className="mt-3 max-w-xl text-[0.875rem] leading-relaxed text-foam/70">
              Holding $BUCKS does not mean you own Starbucks stock, and it cannot be swapped 1:1
              for SBUXx. This is not financial advice.
            </p>
            <ContractAddress tone="foam" align="start" className="mt-4" />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <nav className="space-y-3">
              <p className="label-mono text-foam/80">Shop</p>
              <FooterLink href="/coffee">Get a gift card</FooterLink>
              <FooterLink href="/gift">Send a gift</FooterLink>
              <FooterLink href="/account">Account</FooterLink>
            </nav>
            <nav className="space-y-3">
              <p className="label-mono text-foam/80">Token</p>
              <FooterLink href="/trade">$BUCKS / SBUXx</FooterLink>
              <FooterLink href="/about">About</FooterLink>
              <SocialLinks tone="foam" className="-ml-1.5" />
            </nav>
          </div>
        </div>

        <p className="mt-8 text-xs text-foam/60">
          © {new Date().getFullYear()} $BUCKS
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="block text-[0.875rem] font-semibold text-foam/75 transition-colors duration-200 hover:text-foam"
    >
      {children}
    </Link>
  );
}

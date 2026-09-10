import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 mt-8 bg-paper pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="hairline h-px" />

        <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg font-extrabold tracking-[-0.02em] text-ink">$BUCKS</p>
            <p className="mt-4 max-w-xl text-[0.8125rem] leading-relaxed text-ink-soft">
              $BUCKS is a community project. It is not affiliated with or endorsed by Starbucks
              Corporation. Starbucks is a trademark of its owner. SBUXx is a third-party token.
            </p>
            <p className="mt-3 max-w-xl text-[0.8125rem] leading-relaxed text-ink-soft">
              Holding $BUCKS does not mean you own Starbucks stock, and it cannot be swapped 1:1
              for SBUXx. Gift cards come from a third-party seller. This is not financial advice.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <nav className="space-y-3">
              <p className="label-mono">Shop</p>
              <FooterLink href="/coffee">Get a gift card</FooterLink>
              <FooterLink href="/gift">Send a gift</FooterLink>
              <FooterLink href="/account">Account</FooterLink>
            </nav>
            <nav className="space-y-3">
              <p className="label-mono">Token</p>
              <FooterLink href="/trade">$BUCKS / SBUXx</FooterLink>
              <FooterLink href="/about">About</FooterLink>
            </nav>
          </div>
        </div>

        <p className="mt-12 text-xs text-ink-soft/80">
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
      className="block text-[0.875rem] font-semibold text-ink-soft transition-colors duration-200 hover:text-ink"
    >
      {children}
    </Link>
  );
}

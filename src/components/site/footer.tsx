import Link from "next/link";

/**
 * The disclaimer is the point of this component, so it is not tucked into
 * fine print: it sits in its own panel, at readable size, above the links.
 */
export function Footer() {
  return (
    <footer className="relative z-10 mt-32 pb-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="hairline h-px" />

        <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg font-medium tracking-[-0.02em] text-cream-100">
              buy real cards with crypto.
            </p>
            <p className="mt-4 max-w-xl text-[0.8125rem] leading-relaxed text-cream-500">
              $BUCKS is an independent community project and is not affiliated with or endorsed by
              Starbucks Corporation or any other brand shown here. Those names are trademarks of
              their owners. SBUXx is a third-party tokenized asset. Availability may vary.
            </p>
            <p className="mt-4 max-w-xl text-[0.8125rem] leading-relaxed text-cream-500">
              Pairing with SBUXx does not make $BUCKS redeemable for SBUXx, and $BUCKS is not backed
              by Starbucks shares. Gift cards are fulfilled by a third-party provider. Nothing here
              is financial advice.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <nav className="space-y-3">
              <p className="label-mono">product</p>
              <FooterLink href="/coffee">buy coffee</FooterLink>
              <FooterLink href="/#cards">gift cards</FooterLink>
              <FooterLink href="/gift">send a card</FooterLink>
              <FooterLink href="/account">account</FooterLink>
            </nav>
            <nav className="space-y-3">
              <p className="label-mono">token</p>
              <FooterLink href="/trade">$BUCKS / SBUXx</FooterLink>
              <FooterLink href="/about">about</FooterLink>
            </nav>
          </div>
        </div>

        <p className="mt-12 text-xs text-cream-500/70">
          © {new Date().getFullYear()} $BUCKS. coffee, gift cards, crypto.
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="block text-[0.875rem] text-cream-400 transition-colors duration-200 hover:text-cream-100"
    >
      {children}
    </Link>
  );
}

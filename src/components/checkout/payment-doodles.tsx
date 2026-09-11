/** Hand-drawn payment glyphs for USDC, SOL, and Starbucks xStock. */

export function DoodleUsdcIcon({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="18" fill="#e8f3ea" stroke="#2c2416" strokeWidth="2.4" />
      <circle cx="24" cy="24" r="13" fill="none" stroke="#006241" strokeWidth="2" />
      <path
        d="M24 14v4M24 30v4M20 20c0-3 8-4 8 1 0 4-8 3-8 7 0 4 8 4 8 0"
        fill="none"
        stroke="#006241"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DoodleSolIcon({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="18" fill="#e8f3ea" stroke="#2c2416" strokeWidth="2.4" />
      <path
        d="M15 18h16c2 0 3 2 1 3L16 22c-2 1-1 3 1 3h16"
        fill="none"
        stroke="#006241"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M15 25h16c2 0 3 2 1 3L16 29c-2 1-1 3 1 3h16"
        fill="none"
        stroke="#147a4c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M16 32h15"
        fill="none"
        stroke="#004c32"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DoodleSbuxxIcon({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="18" fill="#006241" stroke="#2c2416" strokeWidth="2.4" />
      <circle cx="24" cy="20" r="8" fill="#fff8ee" stroke="#d4c48a" strokeWidth="1.6" />
      <image href="/brand/starbucks.svg" x="17" y="13" width="14" height="14" />
      <path
        d="M14 34c4-6 8-2 10 0 3 3 6-2 10-6"
        fill="none"
        stroke="#f4ead8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PaymentDoodle({ symbol, className }: { symbol: string; className?: string }) {
  if (symbol === "SOL") return <DoodleSolIcon className={className} />;
  if (symbol === "SBUXx") return <DoodleSbuxxIcon className={className} />;
  return <DoodleUsdcIcon className={className} />;
}

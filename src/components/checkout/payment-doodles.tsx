"use client";

import { useId } from "react";

/** Payment glyphs: USDC coin, Solana mark, Starbucks siren for xStocks. */

export function DoodleUsdcIcon({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24.2" cy="24.6" r="18.1" fill="#1b5fa8" />
      <circle cx="24" cy="24" r="17.6" fill="#2775CA" stroke="#2c2416" strokeWidth="2.15" />
      <circle cx="24" cy="24" r="12.2" fill="none" stroke="#fff" strokeWidth="2.7" />
      <text
        x="24"
        y="30.2"
        textAnchor="middle"
        fill="#fff"
        fontFamily="ui-rounded, Nunito, Arial, sans-serif"
        fontSize="17"
        fontWeight={800}
      >
        $
      </text>
    </svg>
  );
}

export function DoodleSolIcon({ className = "size-10" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-a`} x1="12" y1="14" x2="36" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id={`${uid}-b`} x1="12" y1="22" x2="36" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id={`${uid}-c`} x1="12" y1="30" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <rect x="6.2" y="6.8" width="36" height="35.2" rx="10" fill="#0d0d0d" />
      <rect x="5.8" y="6.2" width="36" height="35.2" rx="10" fill="#161616" stroke="#2c2416" strokeWidth="2.15" />
      <path
        d="M15.4 16.2h18.3c.45 0 .7.52.4.86l-2.35 2.4c-.14.14-.34.22-.54.22H12.9c-.45 0-.7-.52-.4-.86l2.35-2.4c.14-.14.34-.22.55-.22Z"
        fill={`url(#${uid}-a)`}
        stroke="#2c2416"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path
        d="M12.9 22.1h18.3c.2 0 .4.08.54.22l2.35 2.4c.3.34.05.86-.4.86H15.4c-.2 0-.4-.08-.55-.22l-2.35-2.4c-.3-.34-.05-.86.4-.86Z"
        fill={`url(#${uid}-b)`}
        stroke="#2c2416"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path
        d="M15.4 28.1h18.3c.45 0 .7.52.4.86l-2.35 2.4c-.14.14-.34.22-.54.22H12.9c-.45 0-.7-.52-.4-.86l2.35-2.4c.14-.14.34-.22.55-.22Z"
        fill={`url(#${uid}-c)`}
        stroke="#2c2416"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleSbuxxIcon({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <image href="/brand/starbucks.svg" x="1" y="1" width="46" height="46" />
    </svg>
  );
}

export function PaymentDoodle({ symbol, className }: { symbol: string; className?: string }) {
  if (symbol === "SOL") return <DoodleSolIcon className={className} />;
  if (symbol === "SBUXx") return <DoodleSbuxxIcon className={className} />;
  return <DoodleUsdcIcon className={className} />;
}

/** Shared pen: warm ink, slightly shaky paths, cream paper. */

type DoodleProps = { note?: string; valueLabel?: string };

function Frame({ fill }: { fill: string }) {
  return (
    <path
      d="M38 56c8-26 548-34 570-2 16 26 24 288 4 322-18 30-542 32-570 4C14 352 18 90 38 56Z"
      fill={fill}
      stroke="#2c2416"
      strokeWidth="8"
      strokeLinejoin="round"
    />
  );
}

function Spark({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y - 10} l2 8 8 2-8 2-2 8-2-8-8-2 8-2 z`}
      fill="none"
      stroke="#2c2416"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
}

function Note({ x, y, children }: { x: number; y: number; children?: string }) {
  if (!children) return null;
  return (
    <text x={x} y={y} fill="#2c2416" fontFamily="var(--font-caveat), cursive" fontSize={42}>
      {children}
    </text>
  );
}

function ValueMark({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <text
      x={548}
      y={334}
      textAnchor="end"
      fill="#2c2416"
      fontFamily="var(--font-nunito), ui-rounded, sans-serif"
      fontWeight={800}
      fontSize={42}
    >
      {label}
    </text>
  );
}

/** Siren drawn onto the card like a sticker, not an HTML overlay. */
function SirenStamp({
  x,
  y,
  size = 82,
  rotate = -8,
}: {
  x: number;
  y: number;
  size?: number;
  rotate?: number;
}) {
  const r = size / 2;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${r} ${r})`}>
      <ellipse
        cx={r}
        cy={r}
        rx={r - 1}
        ry={r + 1.4}
        fill="#fff8ee"
        stroke="#2c2416"
        strokeWidth="3.2"
      />
      <image href="/brand/starbucks.svg" x={5} y={5} width={size - 10} height={size - 10} />
    </g>
  );
}

/** $5 — one cozy mug. */
export function DoodleCupCard({ note = "for you", valueLabel }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill="#fbf3e4" />
      <path
        d="M236 186c4-8 156-10 162 8v96c-6 46-152 50-160 6V186Z"
        fill="#f0d9bf"
        stroke="#2c2416"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path d="M250 214h132" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M398 216c42 6 46 56 4 66"
        fill="none"
        stroke="#2c2416"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M278 164c4-26 20-22 16-44" fill="none" stroke="#2c2416" strokeWidth="4" strokeLinecap="round" />
      <path d="M318 160c0-28 18-24 14-46" fill="none" stroke="#2c2416" strokeWidth="4" strokeLinecap="round" />
      <path d="M354 168c6-22 18-18 14-40" fill="none" stroke="#2c2416" strokeWidth="4" strokeLinecap="round" />
      <Spark x={142} y={278} />
      <SirenStamp x={488} y={70} rotate={-9} />
      <Note x={64} y={118}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** $10 — two beans. */
export function DoodleBeanCard({ note = "sip sip", valueLabel }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill="#e7f0d8" />
      <path
        d="M214 168c-8-36 28-62 68-48 38 14 54 58 28 90-24 30-70 22-88-8-10-16-12-24-8-34Z"
        fill="#7a5340"
        stroke="#2c2416"
        strokeWidth="5"
      />
      <path
        d="M236 176c8 22 28 28 44 8"
        fill="none"
        stroke="#fbf3e4"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M292 214c-6-30 26-52 58-32 30 18 32 62 4 78-24 14-58-6-62-46Z"
        fill="#5c3d2e"
        stroke="#2c2416"
        strokeWidth="5"
      />
      <path
        d="M318 228c10 18 30 16 42-4"
        fill="none"
        stroke="#fbf3e4"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <SirenStamp x={498} y={68} rotate={7} />
      <Note x={58} y={114}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** $25 — two cups, a toast. */
export function DoodleTwoCupsCard({ note = "on me", valueLabel }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill="#f6ddd0" />
      <path
        d="M176 196c2-8 108-8 112 8v82c-4 38-108 42-112 4V196Z"
        fill="#f4ead8"
        stroke="#2c2416"
        strokeWidth="6"
      />
      <path
        d="M288 226c30 2 34 42 2 50"
        fill="none"
        stroke="#2c2416"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M338 178c4-8 118-6 120 10v86c-2 40-116 44-120 6V178Z"
        fill="#f0d9bf"
        stroke="#2c2416"
        strokeWidth="6"
      />
      <path
        d="M458 210c32 2 38 44 4 52"
        fill="none"
        stroke="#2c2416"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M214 174c2-18 14-16 12-32" fill="none" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M382 158c4-20 16-16 14-34" fill="none" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M286 246c20 24 50 22 76-4"
        fill="none"
        stroke="#2c2416"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Spark x={128} y={116} />
      <SirenStamp x={500} y={66} rotate={-6} />
      <Note x={56} y={112}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** $50 — wrapped gift. */
export function DoodleGiftCard({ note = "yours", valueLabel }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill="#dce8d4" />
      <path
        d="M206 186h228v136c0 10-10 14-18 14H222c-10 0-16-6-16-16V186Z"
        fill="#f4ead8"
        stroke="#2c2416"
        strokeWidth="6"
      />
      <path d="M206 186h228l-20-54H228Z" fill="#c45c3e" stroke="#2c2416" strokeWidth="6" />
      <path d="M318 132v204" stroke="#2c2416" strokeWidth="5" strokeLinecap="round" />
      <path d="M206 186h228" stroke="#2c2416" strokeWidth="5" />
      <path
        d="M318 132c-30-30-74-8-54 30"
        fill="none"
        stroke="#2c2416"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M318 132c32-32 74-6 52 32"
        fill="none"
        stroke="#2c2416"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Spark x={136} y={298} />
      <SirenStamp x={496} y={66} rotate={8} />
      <Note x={58} y={108}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** Extra — mug with a heart in the steam. */
export function DoodleHeartSteamCard({ note = "warm", valueLabel }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill="#f3e4d4" />
      <path
        d="M250 208c0-8 140-8 146 6v88c-4 44-142 48-148 4V208Z"
        fill="#ead2bc"
        stroke="#2c2416"
        strokeWidth="6"
      />
      <path
        d="M396 232c40 4 44 52 2 62"
        fill="none"
        stroke="#2c2416"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M316 176c-18-22-4-42 16-38 10 2 16 10 18 18 4-10 12-18 22-16 18 2 28 22 8 38-16 12-42 16-64-2Z"
        fill="none"
        stroke="#2c2416"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <Spark x={150} y={120} />
      <SirenStamp x={498} y={68} rotate={-7} />
      <Note x={62} y={114}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** Extra — late cup under a moon. */
export function DoodleMoonCard({ note = "later", valueLabel }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill="#e4ebe3" />
      <path
        d="M430 128c-28-4-48 22-40 48 8 24 38 34 58 18 4-4 8-10 8-16-22 4-40-12-36-32 2-12 12-18 22-18-4-4-8-2-12 0Z"
        fill="none"
        stroke="#2c2416"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <Spark x={388} y={96} />
      <SirenStamp x={72} y={74} rotate={6} size={76} />
      <path
        d="M228 214c2-8 150-8 156 8v84c-6 42-148 46-156 4V214Z"
        fill="#d7e2d0"
        stroke="#2c2416"
        strokeWidth="6"
      />
      <path
        d="M384 238c38 4 42 50 2 60"
        fill="none"
        stroke="#2c2416"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M268 194c2-18 14-16 12-32" fill="none" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M308 190c0-20 14-16 12-34" fill="none" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <Note x={168} y={114}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

export const DOODLE_KINDS = ["cup", "beans", "twoCups", "gift", "heartSteam", "moon"] as const;
export type DoodleKind = (typeof DOODLE_KINDS)[number];

const VALUE_KIND: Record<number, DoodleKind> = {
  5: "cup",
  10: "beans",
  25: "twoCups",
  50: "gift",
  15: "heartSteam",
  20: "moon",
};

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function doodleKindForOffer(faceValueUsd?: string | null, seed?: string): DoodleKind {
  if (faceValueUsd) {
    try {
      const dollars = Number(BigInt(faceValueUsd) / 1_000_000n);
      const mapped = VALUE_KIND[dollars];
      if (mapped) return mapped;
    } catch {
      // Fall through to the seed.
    }
  }

  return DOODLE_KINDS[hashSeed(seed ?? "starbucks") % DOODLE_KINDS.length]!;
}

export function DoodleThumb({
  kind,
  note,
  valueLabel,
  className,
}: {
  kind: DoodleKind;
  note?: string;
  valueLabel?: string;
  className?: string;
}) {
  const Card = {
    cup: DoodleCupCard,
    beans: DoodleBeanCard,
    twoCups: DoodleTwoCupsCard,
    gift: DoodleGiftCard,
    heartSteam: DoodleHeartSteamCard,
    moon: DoodleMoonCard,
  }[kind];

  return (
    <div className={className}>
      <Card note={note ?? ""} valueLabel={valueLabel} />
    </div>
  );
}

export function DoodleBeanMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden>
      <path
        d="M16 3C7 3 3 14 4 22c1 10 6 15 12 15 8 0 13-8 12-18C27 8 22 3 16 3Z"
        fill="#7a5340"
        stroke="#2c2416"
        strokeWidth="2.4"
      />
      <path
        d="M14 9c-1 6 5 8 2 14s5 9 3 13"
        fill="none"
        stroke="#fbf3e4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DoodleCupIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-11" fill="none" aria-hidden>
      <path
        d="M12 20h18c1 0 2 1 2 3v10c0 6-16 7-18 1V20Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M32 24c8 1 8 12 0 13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 12c1-6 6-5 5-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 13c0-6 5-5 4-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleEnvelopeIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-11" fill="none" aria-hidden>
      <path
        d="M8 16l32 1v20c0 2-2 3-4 3H12c-3 0-4-2-4-4V16Z"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <path d="M9 17l15 11 16-12" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleHeartIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-11" fill="none" aria-hidden>
      <path
        d="M24 38c-10-8-16-14-16-22 0-6 4-10 9-10 4 0 6 2 7 5 1-3 4-5 8-5 5 0 8 4 8 10 0 8-7 14-16 22Z"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleCardsIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-11" fill="none" aria-hidden>
      <path
        d="M12 18h22v14c0 2-2 3-4 3H14c-2 0-3-1-3-3V18Z"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <path d="M16 18V13h22v14" stroke="currentColor" strokeWidth="2.3" />
    </svg>
  );
}

export function DoodleTagIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-11" fill="none" aria-hidden>
      <path
        d="M22 10l14 14-10 11L12 22V10h10Z"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="17" r="2" fill="currentColor" />
    </svg>
  );
}

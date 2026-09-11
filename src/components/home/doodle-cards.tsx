/** Shared pen: warm ink, slightly shaky paths, cream paper. */

type DoodleProps = {
  note?: string;
  valueLabel?: string;
  paper?: string;
  stampRotate?: number;
};

function Frame({ fill }: { fill: string }) {
  const shineId = `gc-${fill.replace("#", "")}`;
  return (
    <>
      <defs>
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a8f5c" />
          <stop offset="42%" stopColor={fill} />
          <stop offset="100%" stopColor="#003626" />
        </linearGradient>
      </defs>
      <path
        d="M42 52c12-18 536-26 560 6 16 22 22 276 4 314-16 28-536 32-560 6C20 348 22 78 42 52Z"
        fill={`url(#${shineId})`}
        stroke="#d4c48a"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path
        d="M62 72c8-10 500-14 520 4 12 14 16 248 2 276-12 22-500 24-520 4C44 336 46 90 62 72Z"
        fill="none"
        stroke="#f4ead8"
        strokeWidth="2.2"
        opacity="0.4"
      />
      <path d="M86 108h468" stroke="#d4c48a" strokeWidth="3.5" strokeLinecap="round" />
      <text
        x="86"
        y="98"
        fill="#f4ead8"
        fontFamily="var(--font-nunito), ui-rounded, sans-serif"
        fontWeight={800}
        fontSize={22}
        letterSpacing="0.28em"
      >
        STARBUCKS
      </text>
      <text
        x="86"
        y="368"
        fill="#f4ead8"
        fontFamily="var(--font-nunito), ui-rounded, sans-serif"
        fontWeight={800}
        fontSize={16}
        letterSpacing="0.22em"
        opacity="0.85"
      >
        GIFT CARD
      </text>
    </>
  );
}

function Spark({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y - 10} l2 8 8 2-8 2-2 8-2-8-8-2 8-2 z`}
      fill="none"
      stroke="#f4ead8"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
}

function Note({ x, children }: { x: number; y: number; children?: string }) {
  if (!children) return null;
  return (
    <text x={x} y={152} fill="#f4ead8" fontFamily="var(--font-caveat), cursive" fontSize={34}>
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
      fill="#f4ead8"
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
  size = 118,
  rotate = -6,
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
        stroke="#d4c48a"
        strokeWidth="4"
      />
      <image href="/brand/starbucks.svg" x={6} y={6} width={size - 12} height={size - 12} />
    </g>
  );
}

/** $5 — one cozy mug. */
export function DoodleCupCard({ note = "for you", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#006241"} />
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
      <SirenStamp x={488} y={70} rotate={stampRotate ?? -9} />
      <Note x={64} y={118}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** $10 — two beans. */
export function DoodleBeanCard({ note = "sip sip", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#004c32"} />
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
      <SirenStamp x={498} y={68} rotate={stampRotate ?? 7} />
      <Note x={58} y={114}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** $25 — two cups, a toast. */
export function DoodleTwoCupsCard({ note = "on me", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#006241"} />
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
      <SirenStamp x={500} y={66} rotate={stampRotate ?? -6} />
      <Note x={56} y={112}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** $50 — wrapped gift. */
export function DoodleGiftCard({ note = "yours", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#004c32"} />
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
      <SirenStamp x={496} y={66} rotate={stampRotate ?? 8} />
      <Note x={58} y={108}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** Extra — mug with a heart in the steam. */
export function DoodleHeartSteamCard({ note = "warm", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#0a5c3a"} />
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
      <SirenStamp x={498} y={68} rotate={stampRotate ?? -7} />
      <Note x={62} y={114}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** Extra — late cup under a moon. */
export function DoodleMoonCard({ note = "later", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#1a6b45"} />
      <path
        d="M430 128c-28-4-48 22-40 48 8 24 38 34 58 18 4-4 8-10 8-16-22 4-40-12-36-32 2-12 12-18 22-18-4-4-8-2-12 0Z"
        fill="none"
        stroke="#2c2416"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <Spark x={388} y={96} />
      <SirenStamp x={72} y={74} rotate={stampRotate ?? 6} size={76} />
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

/** $30 — croissant. */
export function DoodlePastryCard({ note = "treat", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#00573a"} />
      <path
        d="M198 214c18-56 86-78 148-52 52 22 86 70 58 104-22 28-78 18-128 8-46-10-90-8-78-60Z"
        fill="#e8b56a"
        stroke="#2c2416"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M236 206c28-18 70-16 98 8"
        fill="none"
        stroke="#2c2416"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M258 232c24-12 62-10 86 8"
        fill="none"
        stroke="#2c2416"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <Spark x={148} y={118} />
      <SirenStamp x={496} y={68} rotate={stampRotate ?? -5} />
      <Note x={58} y={112}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** Extra — to-go cup. */
export function DoodleTakeawayCard({ note = "to go", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#147a4c"} />
      <path
        d="M246 168h148l-16 148c-4 28-116 30-122 2L246 168Z"
        fill="#f4ead8"
        stroke="#2c2416"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path d="M236 168h168" stroke="#2c2416" strokeWidth="6" strokeLinecap="round" />
      <path d="M262 168v-22h116v22" fill="#ead2bc" stroke="#2c2416" strokeWidth="5" />
      <path d="M268 230h104" stroke="#2c2416" strokeWidth="4" strokeLinecap="round" />
      <path d="M274 258h92" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <Spark x={150} y={286} />
      <SirenStamp x={494} y={66} rotate={stampRotate ?? 6} />
      <Note x={56} y={114}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** Extra — cup with a cardboard sleeve. */
export function DoodleSleeveCard({ note = "hold", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#003d28"} />
      <path
        d="M248 176c2-8 144-8 150 8v98c-4 42-146 46-154 4V176Z"
        fill="#f4ead8"
        stroke="#2c2416"
        strokeWidth="6"
      />
      <path
        d="M398 214c38 4 42 50 2 60"
        fill="none"
        stroke="#2c2416"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M246 228h156c4 0 6 18-2 22H250c-8-2-8-18-4-22Z"
        fill="#d8c4a4"
        stroke="#2c2416"
        strokeWidth="5"
      />
      <path d="M286 166c2-18 14-16 12-32" fill="none" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M326 162c0-20 14-16 12-34" fill="none" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <SirenStamp x={498} y={66} rotate={stampRotate ?? -8} />
      <Note x={58} y={112}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

/** Extra — stacked cards. */
export function DoodleStackCard({ note = "stack", valueLabel, paper, stampRotate }: DoodleProps = {}) {
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" aria-hidden>
      <Frame fill={paper ?? "#0d6640"} />
      <path
        d="M214 150h196l18 108c2 16-8 22-22 22H230c-14 0-22-8-22-22Z"
        fill="#ead2bc"
        stroke="#2c2416"
        strokeWidth="6"
      />
      <path
        d="M198 176h196l18 108c2 16-8 22-22 22H214c-14 0-22-8-22-22Z"
        fill="#f4ead8"
        stroke="#2c2416"
        strokeWidth="6"
      />
      <path d="M226 214h140" stroke="#2c2416" strokeWidth="4" strokeLinecap="round" />
      <path d="M226 242h108" stroke="#2c2416" strokeWidth="3.5" strokeLinecap="round" />
      <Spark x={140} y={300} />
      <SirenStamp x={490} y={64} rotate={stampRotate ?? 9} />
      <Note x={56} y={108}>{note}</Note>
      <ValueMark label={valueLabel} />
    </svg>
  );
}

export const DOODLE_KINDS = [
  "cup",
  "beans",
  "twoCups",
  "gift",
  "heartSteam",
  "moon",
  "pastry",
  "takeaway",
  "sleeve",
  "stack",
] as const;
export type DoodleKind = (typeof DOODLE_KINDS)[number];

const VALUE_KIND: Record<number, DoodleKind> = {
  5: "cup",
  10: "beans",
  15: "heartSteam",
  20: "moon",
  25: "twoCups",
  30: "pastry",
  40: "takeaway",
  50: "gift",
  75: "sleeve",
  100: "stack",
};

const KIND_NOTES: Record<DoodleKind, string> = {
  cup: "for you",
  beans: "sip sip",
  twoCups: "on me",
  gift: "yours",
  heartSteam: "warm",
  moon: "later",
  pastry: "treat",
  takeaway: "to go",
  sleeve: "hold",
  stack: "stack",
};

const PAPERS = [
  "#006241",
  "#004c32",
  "#0a5c3a",
  "#1a6b45",
  "#00573a",
  "#147a4c",
  "#003d28",
  "#0d6640",
  "#186b42",
  "#024f34",
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function dollarsFromFace(faceValueUsd?: string | null): number | null {
  if (!faceValueUsd) return null;
  try {
    return Number(BigInt(faceValueUsd) / 1_000_000n);
  } catch {
    return null;
  }
}

export function doodleKindForOffer(faceValueUsd?: string | null, seed?: string): DoodleKind {
  const dollars = dollarsFromFace(faceValueUsd);
  const canonical = dollars !== null ? VALUE_KIND[dollars] : undefined;
  if (canonical) return canonical;

  return DOODLE_KINDS[hashSeed(seed ?? String(dollars ?? "starbucks")) % DOODLE_KINDS.length]!;
}

export type DoodleAppearance = {
  kind: DoodleKind;
  note: string;
  paper: string;
  stampRotate: number;
};

export function doodleAppearance(faceValueUsd?: string | null, seed?: string): DoodleAppearance {
  const kind = doodleKindForOffer(faceValueUsd, seed);
  const hash = hashSeed(`${kind}:${seed ?? ""}:${faceValueUsd ?? ""}`);
  return {
    kind,
    note: KIND_NOTES[kind],
    paper: PAPERS[hash % PAPERS.length]!,
    stampRotate: (hash % 19) - 9,
  };
}

export function DoodleThumb({
  kind,
  note,
  valueLabel,
  paper,
  stampRotate,
  className,
}: {
  kind: DoodleKind;
  note?: string;
  valueLabel?: string;
  paper?: string;
  stampRotate?: number;
  className?: string;
}) {
  const Card = {
    cup: DoodleCupCard,
    beans: DoodleBeanCard,
    twoCups: DoodleTwoCupsCard,
    gift: DoodleGiftCard,
    heartSteam: DoodleHeartSteamCard,
    moon: DoodleMoonCard,
    pastry: DoodlePastryCard,
    takeaway: DoodleTakeawayCard,
    sleeve: DoodleSleeveCard,
    stack: DoodleStackCard,
  }[kind];

  return (
    <div className={className}>
      <Card note={note ?? ""} valueLabel={valueLabel} paper={paper} stampRotate={stampRotate} />
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

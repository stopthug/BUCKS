import { Reveal } from "@/components/ui/reveal";

/**
 * The one-line thesis, drawn rather than written: a tokenized share on top,
 * a cup below, an arrow between them. This is the section that has to make the
 * idea obvious in about two seconds, so it holds almost nothing else.
 */
export function Conversion() {
  return (
    <section className="relative px-4 py-28 sm:px-6 sm:py-36">
      <div className="mx-auto max-w-5xl">
        <Reveal className="flex items-center justify-center gap-5 sm:gap-8">
          <Token label="$BUCKS" tone="bean" />
          <span className="font-display text-2xl font-extrabold text-ink-soft sm:text-3xl">×</span>
          <Token label="SBUXx" tone="mint" />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-20 flex flex-col items-center">
            <Chip>SBUXx</Chip>

            <Arrow />

            <CupGlyph />

            <p className="mt-8 max-w-md text-center text-[clamp(1.375rem,4vw,2rem)] leading-[1.15] font-medium tracking-[-0.03em] text-cream-50">
              spend Starbucks stock at Starbucks.
            </p>
            <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-cream-500">
              an independent community project. not affiliated with, sponsored or endorsed by
              Starbucks Corporation.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Token({ label, tone }: { label: string; tone: "bean" | "mint" }) {
  const surface =
    tone === "bean"
      ? "radial-gradient(70% 60% at 32% 26%, #e2cdb2 0%, #a97b57 34%, #4a3325 72%, #241811 100%)"
      : "radial-gradient(70% 60% at 32% 26%, #cfeadb 0%, #6bb489 32%, #1f4d34 74%, #10281b 100%)";

  return (
    <div className="flex flex-col items-center gap-3">
      <span
        aria-hidden
        className="size-16 rounded-none sm:size-20"
        style={{
          background: surface,
          boxShadow:
            "inset 0 -6px 14px rgba(0,0,0,0.5), inset 0 4px 12px rgba(255,245,230,0.28), 0 24px 44px -20px rgba(0,0,0,0.85)",
        }}
      />
      <span className="font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-cream-400">
        {label}
      </span>
    </div>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="glass rounded-none px-6 py-3.5 text-lg font-medium tracking-[-0.02em] text-cream-50">
      {children}
    </span>
  );
}

function Arrow() {
  return (
    <span aria-hidden className="flex h-24 flex-col items-center justify-center">
      <span
        className="w-px flex-1"
        style={{
          background:
            "linear-gradient(180deg, rgba(232,221,204,0) 0%, rgba(232,221,204,0.35) 60%, rgba(232,221,204,0.5) 100%)",
        }}
      />
      <span className="-mt-1 text-cream-300">↓</span>
    </span>
  );
}

/** A cup with steam. Abstract shapes only: no photography, no illustration cliché. */
function CupGlyph() {
  return (
    <div aria-hidden className="relative mt-2 flex flex-col items-center">
      <div className="relative mb-1 flex h-8 items-end gap-1.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="animate-steam w-px rounded-full"
            style={{
              height: `${16 + index * 6}px`,
              background:
                "linear-gradient(0deg, rgba(226,205,178,0) 0%, rgba(226,205,178,0.7) 100%)",
              animationDelay: `${index * 1.1}s`,
            }}
          />
        ))}
      </div>

      <span
        className="relative flex h-16 w-20 items-start justify-center rounded-b-[1.75rem] rounded-t-lg"
        style={{
          background: "linear-gradient(170deg, #f6efe4 0%, #e2cdb2 45%, #a9866a 100%)",
          boxShadow:
            "inset 0 -8px 18px rgba(74,51,37,0.35), 0 26px 50px -22px rgba(0,0,0,0.85)",
        }}
      >
        {/* Crema surface */}
        <span
          className="mt-1 h-3 w-16 rounded-[50%]"
          style={{ background: "linear-gradient(180deg, #4a3325 0%, #2a1b13 100%)" }}
        />
        {/* Handle */}
        <span
          className="absolute top-3 -right-4 h-8 w-6 rounded-r-full border-4 border-l-0"
          style={{ borderColor: "#e2cdb2" }}
        />
      </span>

      <span className="mt-2 h-1.5 w-24 rounded-full bg-espresso-950/70 blur-[3px]" />
      <span className="mt-4 font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-cream-400">
        coffee
      </span>
    </div>
  );
}

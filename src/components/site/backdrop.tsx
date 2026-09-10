/**
 * Ambient background.
 *
 * The reference layout floats objects in a bright open sky; this is the same
 * idea inverted into an espresso room: warm light pooling from above, slow
 * drifting haze, and a few out-of-focus roasted forms at the edges. Everything
 * is CSS gradients, so there is no imagery to load and nothing that reads as
 * stock photography or AI-generated coffee art.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Ground */}
      <div className="absolute inset-0 bg-espresso-950" />

      {/* Warm overhead pool of light */}
      <div
        className="absolute -top-[35vh] left-1/2 h-[80vh] w-[130vw] -translate-x-1/2 rounded-[50%] opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(200,168,130,0.20) 0%, rgba(107,74,52,0.14) 38%, rgba(11,7,5,0) 72%)",
        }}
      />

      {/* Green under-glow, the one nod to Solana in the environment */}
      <div
        className="absolute -bottom-[30vh] left-[8%] h-[70vh] w-[70vw] rounded-[50%] opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(63,141,93,0.16) 0%, rgba(31,77,52,0.10) 45%, rgba(11,7,5,0) 75%)",
        }}
      />

      {/* Drifting crema haze */}
      <div
        className="animate-drift-slow absolute top-[18vh] right-[-10vw] h-[55vh] w-[60vw] rounded-[50%] opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(226,205,178,0.13) 0%, rgba(11,7,5,0) 70%)",
        }}
      />
      <div
        className="animate-drift absolute bottom-[10vh] right-[20vw] h-[40vh] w-[40vw] rounded-[50%] opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(138,98,71,0.16) 0%, rgba(11,7,5,0) 70%)",
        }}
      />

      <FloatingBean className="top-[14vh] left-[6vw] h-16 w-11 opacity-60" delay="0s" />
      <FloatingBean className="top-[26vh] right-[9vw] h-20 w-14 opacity-45" delay="-8s" rotate={-24} />
      <FloatingBean className="top-[62vh] left-[12vw] h-12 w-8 opacity-35" delay="-16s" rotate={38} />
      <FloatingBean
        className="top-[78vh] right-[16vw] h-14 w-10 opacity-30"
        delay="-24s"
        rotate={-12}
      />

      {/* Fine grain: keeps large flat areas from banding on wide displays */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Vignette so content always sits on the darkest part of the frame */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 20%, rgba(11,7,5,0) 40%, rgba(11,7,5,0.55) 78%, rgba(11,7,5,0.9) 100%)",
        }}
      />
    </div>
  );
}

/**
 * A single roasted bean, blurred to sit behind the content plane. Rendered with
 * gradients and a centre crease rather than an icon, so it stays abstract.
 */
function FloatingBean({
  className,
  delay,
  rotate = 16,
}: {
  className: string;
  delay: string;
  rotate?: number;
}) {
  return (
    <div
      className={`animate-drift absolute blur-[2px] ${className}`}
      style={{ animationDelay: delay, transform: `rotate(${rotate}deg)` }}
    >
      <div
        className="h-full w-full rounded-[50%/44%]"
        style={{
          background:
            "radial-gradient(60% 55% at 34% 26%, rgba(226,205,178,0.55) 0%, rgba(138,98,71,0.5) 34%, rgba(52,33,23,0.85) 72%, rgba(24,15,10,0.95) 100%)",
          boxShadow:
            "inset 0 -6px 14px rgba(0,0,0,0.55), inset 0 4px 10px rgba(255,240,220,0.14), 0 22px 40px -18px rgba(0,0,0,0.8)",
        }}
      >
        {/* The crease down the middle of a coffee bean */}
        <div
          className="mx-auto h-full w-[14%] rounded-full"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,13,9,0) 6%, rgba(20,13,9,0.85) 30%, rgba(20,13,9,0.85) 70%, rgba(20,13,9,0) 94%)",
            filter: "blur(1.5px)",
          }}
        />
      </div>
    </div>
  );
}

import { cn } from "@/lib/cn";

/**
 * One fixed, quiet set of doodles in the viewport gutters.
 * Unique marks only — nothing repeats, nothing scrolls with the page.
 */
export function PageDoodles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden text-forest-600"
    >
      <Cup className="absolute top-[22%] left-[max(0.5rem,calc((100vw-72rem)/2-5.25rem))] hidden w-[4.5rem] -rotate-[14deg] opacity-[0.32] md:block sm:w-20 lg:w-[5.5rem]" />
      <Beans className="absolute top-[52%] left-[max(0.65rem,calc((100vw-72rem)/2-4.5rem))] hidden w-14 rotate-[16deg] opacity-[0.28] md:block sm:w-16" />
      <Leaf className="absolute bottom-[14%] left-[max(0.5rem,calc((100vw-72rem)/2-5rem))] hidden w-16 -rotate-[10deg] opacity-[0.26] md:block lg:w-[4.5rem]" />

      <Spark className="absolute top-[19%] right-[max(1rem,calc((100vw-72rem)/2-2.5rem))] hidden w-7 opacity-[0.3] md:block" />
      <Takeaway className="absolute top-[40%] right-[max(0.5rem,calc((100vw-72rem)/2-5.25rem))] hidden w-[4.5rem] rotate-[11deg] opacity-[0.32] md:block sm:w-20 lg:w-[5.5rem]" />
      <Steam className="absolute bottom-[18%] right-[max(0.85rem,calc((100vw-72rem)/2-4rem))] hidden w-12 opacity-[0.24] md:block lg:w-14" />
    </div>
  );
}

function Cup({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 72" className={cn(className)} fill="none">
      <path d="M12 26h28c2 0 3 2 3 4v22c-1 10-26 12-29 2V26Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M43 32c12 2 12 20 0 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22 14c1-8 8-7 7-14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M32 15c0-8 7-6 6-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Beans({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 56" className={cn(className)} fill="none">
      <path
        d="M14 18c-4 12 6 24 18 18 10-5 12-20 2-26-8-5-16 0-20 8Z"
        stroke="currentColor"
        strokeWidth="2.1"
      />
      <path d="M22 16c2 8 10 10 14 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M38 28c-2 12 10 20 20 12 9-7 8-20-2-24-8-4-16 2-18 12Z"
        stroke="currentColor"
        strokeWidth="2.1"
      />
      <path d="M48 30c4 6 12 6 14-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 48" className={cn(className)} fill="none">
      <path d="M6 30c14-22 44-24 56-4-16 20-40 16-56 4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M18 26c14 4 28-2 36-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Takeaway({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 72" className={cn(className)} fill="none">
      <path d="M16 20h24l4 36c0 6-6 8-10 8H22c-5 0-10-2-10-8Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 20c2-8 26-8 28 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 32h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M24 10c1-6 6-5 5-10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Steam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={cn(className)} fill="none">
      <path d="M8 48c4-16 14-12 10-32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 50c2-18 14-14 10-36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 44c3-12 10-10 8-26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn(className)} fill="none">
      <path d="M14 2l2 9 9 2-9 2-2 9-2-9-9-2 9-2z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

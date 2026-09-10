import { cn } from "@/lib/cn";

/**
 * Official Starbucks siren, as supplied for the partnership lockup.
 */
export function StarbucksMark({
  className,
  title = "Starbucks",
}: {
  className?: string;
  title?: string;
}) {
  return (
    // The mark is a standalone SVG file so clip-path IDs stay unique per instance.
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/starbucks.svg" alt={title} className={cn("block", className)} />
  );
}

export function StarbucksPartner({
  className,
  align = "center",
  size = "md",
}: {
  className?: string;
  align?: "center" | "left";
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "lg" ? "size-16" : size === "sm" ? "size-9" : "size-12";

  return (
    <div
      className={cn(
        "flex gap-3",
        align === "center" ? "flex-col items-center text-center" : "items-center",
        className,
      )}
    >
      <StarbucksMark className={mark} />
      <p
        className={cn(
          "font-extrabold tracking-[0.16em] text-ink uppercase",
          size === "sm" ? "text-[0.65rem]" : "text-[0.72rem]",
        )}
      >
        Partnered with Starbucks
      </p>
    </div>
  );
}

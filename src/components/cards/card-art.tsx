import { cn } from "@/lib/cn";
import { doodleKindForOffer, DoodleThumb } from "@/components/home/doodle-cards";
import { formatUsd } from "@/lib/money";

/**
 * Gift-card cover. Always a unique cozy doodle — never a provider photo or a
 * repeated green rectangle. Kind is chosen from face value, then a seed.
 */
export function CardArt({
  alt,
  className,
  faceValueUsd = null,
  seed,
  showValue = true,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  faceValueUsd?: string | null;
  seed?: string;
  showValue?: boolean;
  priority?: boolean;
}) {
  const kind = doodleKindForOffer(faceValueUsd, seed ?? alt);
  const valueLabel =
    showValue && faceValueUsd
      ? formatUsd(BigInt(faceValueUsd)).replace(/\.00$/, "")
      : undefined;

  return (
    <div className={cn("relative aspect-[16/10] overflow-visible bg-transparent", className)}>
      <DoodleThumb kind={kind} valueLabel={valueLabel} />
    </div>
  );
}

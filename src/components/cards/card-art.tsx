import { doodleAppearance, DoodleThumb } from "@/components/home/doodle-cards";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";

/**
 * Gift-card cover. The siren is drawn into the doodle itself.
 * Face value picks the scene; seed (id + region + name) tints paper and stamp
 * so two SKUs never share a thumbnail.
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
  const look = doodleAppearance(faceValueUsd, seed ?? alt);
  const valueLabel =
    showValue && faceValueUsd
      ? formatUsd(BigInt(faceValueUsd)).replace(/\.00$/, "")
      : undefined;

  return (
    <div className={cn("relative aspect-[16/10] overflow-visible bg-transparent", className)}>
      <DoodleThumb
        kind={look.kind}
        note={look.note}
        paper={look.paper}
        stampRotate={look.stampRotate}
        valueLabel={valueLabel}
      />
    </div>
  );
}

import { cn } from "@/lib/cn";
import {
  DoodleBeanCard,
  DoodleCupCard,
  DoodleGiftCard,
  DoodleTwoCupsCard,
} from "@/components/home/doodle-cards";

const LEFT = [
  { key: "cup", className: "top-0 left-0 z-10 w-[92%] -rotate-[14deg]", Card: DoodleCupCard },
  { key: "beans", className: "top-[46%] left-[8%] z-20 w-[92%] rotate-[8deg]", Card: DoodleBeanCard },
] as const;

const RIGHT = [
  { key: "two", className: "top-0 right-0 z-10 w-[92%] rotate-[12deg]", Card: DoodleTwoCupsCard },
  { key: "gift", className: "top-[46%] right-[6%] z-20 w-[92%] -rotate-[8deg]", Card: DoodleGiftCard },
] as const;

export function HeroFan({
  side,
  compact = false,
}: {
  side: "left" | "right";
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="relative mx-auto h-[12rem] w-full max-w-[22rem]" aria-hidden>
        {[
          { key: "cup", className: "top-3 left-0 z-10 w-[58%] -rotate-[11deg]", Card: DoodleCupCard },
          { key: "beans", className: "top-0 left-[21%] z-20 w-[58%] rotate-[3deg]", Card: DoodleBeanCard },
          { key: "gift", className: "top-4 right-0 z-10 w-[58%] rotate-[12deg]", Card: DoodleGiftCard },
        ].map((card) => (
          <div
            key={card.key}
            className={cn("absolute drop-shadow-[3px_8px_0_rgba(44,36,22,0.12)]", card.className)}
          >
            <card.Card />
          </div>
        ))}
      </div>
    );
  }

  const cards = side === "left" ? LEFT : RIGHT;

  return (
    <div
      className={cn(
        "relative mx-auto h-[18rem] w-full max-w-[20rem] sm:h-[22rem]",
        side === "right" && "lg:ml-auto",
        side === "left" && "lg:mr-auto",
      )}
      aria-hidden
    >
      {cards.map((card) => (
        <div
          key={card.key}
          className={cn(
            "absolute drop-shadow-[4px_10px_0_rgba(44,36,22,0.12)]",
            card.className,
          )}
        >
          <card.Card />
        </div>
      ))}
    </div>
  );
}

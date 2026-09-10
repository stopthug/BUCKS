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

export function HeroFan({ side }: { side: "left" | "right" }) {
  const cards = side === "left" ? LEFT : RIGHT;

  return (
    <div
      className={cn(
        "relative mx-auto h-[22rem] w-full max-w-[22rem] sm:h-[26rem]",
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

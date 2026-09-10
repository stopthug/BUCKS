"use client";

import { GIFT_MESSAGE_MAX_LENGTH, GIFT_NAME_MAX_LENGTH } from "@/lib/checkout-limits";
import { cn } from "@/lib/cn";

/**
 * Optional sender name and note. Both are capped here and sanitised again on
 * the server, since this text ends up on a page anyone with the link can open.
 */
export function GiftFields({
  senderName,
  message,
  onSenderName,
  onMessage,
}: {
  senderName: string;
  message: string;
  onSenderName: (value: string) => void;
  onMessage: (value: string) => void;
}) {
  const remaining = GIFT_MESSAGE_MAX_LENGTH - message.length;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="sender-name" className="label-mono">
          Your name <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="sender-name"
          value={senderName}
          onChange={(event) => onSenderName(event.target.value.slice(0, GIFT_NAME_MAX_LENGTH))}
          placeholder="Your name"
          autoComplete="off"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="gift-message" className="label-mono">
          A note <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="gift-message"
          value={message}
          onChange={(event) => onMessage(event.target.value.slice(0, GIFT_MESSAGE_MAX_LENGTH))}
          placeholder="Coffee’s on me"
          rows={2}
          className={cn(fieldClass, "resize-none")}
        />
        <p
          className={cn(
            "mt-1.5 text-right font-mono text-[0.6875rem]",
            remaining < 20 ? "text-roast-500" : "text-ink-soft",
          )}
        >
          {remaining}
        </p>
      </div>
    </div>
  );
}

const fieldClass = cn(
  "mt-2 w-full rounded-sm border border-ink/10 bg-foam px-4 py-3 text-[0.9375rem] text-ink",
  "placeholder:text-ink-soft/60 transition-colors duration-200",
  "focus:border-caramel/60 focus:bg-cream-50 focus:outline-none",
);

"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Gift-card cover. Provider thumbnails when we have them, a branded fallback
 * when we don't — so the grid never shows a broken image.
 */
export function CardArt({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden rounded-2xl",
        "bg-espresso-800 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
          priority={priority}
          unoptimized={src!.startsWith("/") || src!.endsWith(".svg")}
          onError={() => setFailed(true)}
        />
      ) : (
        <FallbackMark label={alt} />
      )}
    </div>
  );
}

function FallbackMark({ label }: { label: string }) {
  const initial = label.trim().charAt(0).toUpperCase() || "G";

  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-end p-4"
      style={{
        background:
          "linear-gradient(150deg, #4a3325 0%, #241811 48%, #1f4d34 100%)",
      }}
    >
      <span className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-cream-50/10 text-lg font-medium text-cream-100">
        {initial}
      </span>
      <span className="text-sm font-medium tracking-[-0.02em] text-cream-100">{label}</span>
    </div>
  );
}

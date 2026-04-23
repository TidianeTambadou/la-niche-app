"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

/**
 * Robust fragrance image with a typographic monogram fallback.
 *
 * Problem: Fragrantica hotlinks break, shops return 404s, recommendations
 * from the AI sometimes have no image URL at all. Every place that
 * displays a parfum used to silently render an empty box.
 *
 * Behaviour:
 *   - Renders <img> when src is present and hasn't failed to load.
 *   - On error → switches to a monogram block (brand initials) on a dark
 *     surface, styled consistently with the Clinical Atelier design system.
 *   - When src prop changes, failure state resets so retrying a different
 *     URL works.
 */
export function FragranceImage({
  src,
  name,
  brand,
  className,
  fallbackSize = "md",
}: {
  src: string | null | undefined;
  name: string;
  /** Optional — used to build the monogram (e.g. "CH" for Chanel). */
  brand?: string;
  className?: string;
  /** Controls monogram typography size when the fallback kicks in. */
  fallbackSize?: "sm" | "md" | "lg" | "xl";
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = !!src && !failed;

  if (showImage) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={name}
        draggable={false}
        onError={() => setFailed(true)}
        className={clsx("object-cover select-none", className)}
      />
    );
  }

  const sizeClass =
    fallbackSize === "xl"
      ? "text-5xl"
      : fallbackSize === "lg"
        ? "text-3xl"
        : fallbackSize === "sm"
          ? "text-[10px]"
          : "text-base";

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center bg-on-background text-on-primary select-none p-3 text-center",
        className,
      )}
      aria-label={name}
    >
      <span
        className={clsx(
          "font-mono font-black tracking-widest uppercase leading-none",
          sizeClass,
        )}
      >
        {monogram(brand, name)}
      </span>
      {(fallbackSize === "lg" || fallbackSize === "xl") && brand && (
        <span className="mt-3 text-[9px] uppercase tracking-[0.3em] text-on-primary/50 line-clamp-1 max-w-full">
          {brand}
        </span>
      )}
    </div>
  );
}

function monogram(brand: string | undefined, name: string): string {
  if (brand) {
    const parts = brand.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return brand.slice(0, 2).toUpperCase();
  }
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

/**
 * Robust fragrance image with the La Niche logo-watermark fallback.
 *
 * Problem: scraped Fragrantica hotlinks break, shops return 404s, AI
 * recommendations sometimes have no image at all. Every place that displays
 * a parfum used to silently render an empty box.
 *
 * Behaviour:
 *   - Renders <img> when src is present and hasn't failed to load.
 *   - On error (or no src) → renders the La Niche logo watermark + brand &
 *     perfume name. Same visual language as the home daily-picks card so
 *     the placeholder feels intentional, not broken.
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
  /** Brand label printed on the watermark fallback. */
  brand?: string;
  className?: string;
  /** Drives the typography scale on the watermark fallback. */
  fallbackSize?: "sm" | "md" | "lg" | "xl";
}) {
  const [failed, setFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

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

  const isLarge = fallbackSize === "lg" || fallbackSize === "xl";
  const isXSmall = fallbackSize === "sm";

  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-surface-container-low select-none",
        className,
      )}
      aria-label={brand ? `${brand} — ${name}` : name}
    >
      {/* La Niche logo watermark — same treatment as PerfumeArtwork. */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {logoFailed ? (
          <span className="text-on-surface-variant/15 font-mono font-bold tracking-[0.4em] text-3xl">
            LN
          </span>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/logo-laniche.png"
            alt=""
            className={clsx(
              "object-contain opacity-[0.07]",
              isLarge ? "w-3/4 h-3/4" : "w-2/3 h-2/3",
            )}
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-on-background/15 via-transparent to-transparent pointer-events-none" />

      {/* Brand + name overlay — only visible when there's room. */}
      {!isXSmall && (
        <div className="relative h-full w-full flex flex-col items-center justify-center px-2 text-center">
          {brand && (
            <p
              className={clsx(
                "uppercase tracking-[0.3em] text-outline leading-tight",
                isLarge ? "text-[10px]" : "text-[8px]",
              )}
            >
              {brand}
            </p>
          )}
          <p
            className={clsx(
              "font-semibold tracking-tight leading-tight mt-0.5 line-clamp-2",
              isLarge ? "text-base" : "text-[11px]",
            )}
          >
            {name}
          </p>
        </div>
      )}
    </div>
  );
}

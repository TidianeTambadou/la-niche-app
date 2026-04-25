"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

/**
 * Visual block for a perfume — shows the real bottle photo when our agent
 * was able to extract it from Fragrantica's raw HTML, otherwise falls back
 * to a La Niche logo watermark with the perfume name.
 *
 * Drop-in replacement for an <img>: pass an `imageUrl` and we'll display it
 * with a graceful onError fallback to the watermark.
 *
 * Variants:
 *   - "card"  : full-bleed (e.g. home flashcard, swipe card)
 *   - "thumb" : compact (search result row, autocomplete dropdown)
 */

type Variant = "card" | "thumb";

type Props = {
  brand: string;
  name: string;
  family?: string;
  notesBrief?: string;
  variant?: Variant;
  /** Show the "Image bientôt disponible" caption when there's no real
   *  image. Default true on cards, false on thumbs. */
  showSoonCaption?: boolean;
  /** Real bottle image URL (typically `fimgs.net/...`). When valid + loads
   *  successfully, replaces the watermark fallback. */
  imageUrl?: string | null;
  className?: string;
};

export function PerfumeArtwork({
  brand,
  name,
  family,
  notesBrief,
  variant = "card",
  showSoonCaption,
  imageUrl,
  className,
}: Props) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [bottleFailed, setBottleFailed] = useState(false);
  // Reset error state when the URL changes — same ref might back a new card.
  useEffect(() => {
    setBottleFailed(false);
  }, [imageUrl]);

  const showBottle = !!imageUrl && !bottleFailed;
  const showCaption = (showSoonCaption ?? variant === "card") && !showBottle;

  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-surface-container-low border border-outline-variant",
        className,
      )}
      aria-label={`${brand} — ${name}`}
    >
      {/* Real bottle photo (when scraped successfully). */}
      {showBottle && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl!}
          alt={`${brand} ${name}`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setBottleFailed(true)}
          draggable={false}
        />
      )}

      {/* Logo watermark fallback — visible only when there's no bottle. */}
      {!showBottle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {logoFailed ? (
            <span className="text-on-surface-variant/15 font-mono font-bold tracking-[0.4em] text-5xl">
              LN
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/logo-laniche.png"
              alt=""
              className={clsx(
                "object-contain opacity-[0.07]",
                variant === "card" ? "w-3/4 h-3/4" : "w-2/3 h-2/3",
              )}
              onError={() => setLogoFailed(true)}
            />
          )}
        </div>
      )}

      {/* Subtle vignette — also dims the bottle photo enough that the
          name overlay stays readable. */}
      <div
        className={clsx(
          "absolute inset-0 pointer-events-none",
          showBottle
            ? "bg-gradient-to-t from-on-background/85 via-on-background/20 to-transparent"
            : "bg-gradient-to-t from-on-background/15 via-transparent to-transparent",
        )}
      />

      {/* Content */}
      {variant === "card" ? (
        <div
          className={clsx(
            "relative flex flex-col h-full p-5",
            showBottle && "text-background",
          )}
        >
          <p
            className={clsx(
              "text-[10px] uppercase tracking-[0.3em]",
              showBottle ? "opacity-80" : "text-outline",
            )}
          >
            {brand}
            {family ? ` · ${family}` : ""}
          </p>
          <h3 className="text-2xl font-semibold tracking-tight leading-tight mt-1">
            {name}
          </h3>

          {notesBrief && !showBottle && (
            <p className="text-[12px] text-on-surface-variant mt-3 leading-relaxed line-clamp-4">
              {notesBrief}
            </p>
          )}

          <div className="mt-auto pt-3">
            {showCaption && (
              <p className="text-[9px] uppercase tracking-widest text-outline font-mono">
                Image bientôt disponible
              </p>
            )}
          </div>
        </div>
      ) : showBottle ? (
        // Thumb with image: just the photo, no text overlay (parent supplies).
        <div className="absolute inset-0" aria-hidden />
      ) : (
        <div className="relative flex flex-col items-center justify-center h-full px-2 text-center">
          <p className="text-[8px] uppercase tracking-[0.3em] text-outline leading-tight">
            {brand}
          </p>
          <p className="text-[10px] font-semibold tracking-tight leading-tight mt-0.5 line-clamp-2">
            {name}
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Icon } from "@/components/Icon";
import { PerfumeCardModal } from "@/components/PerfumeCardModal";
import type { PerfumeCardData } from "@/lib/agent";

/**
 * Drop-in "Carte" CTA — opens the PerfumeCardModal for a given perfume.
 *
 * Two ways to feed it (mirrors PerfumeCardModal):
 *   - `card` prop  : already-loaded rich data → instant open (no spinner).
 *   - `brand`+`name` only : the modal lazy-loads via agentCard() on open.
 *
 * Variants:
 *   - "icon"  : 28×28 round icon button — fits in tight rows / corners.
 *   - "chip"  : icon + "Carte" label — for action rows / list items.
 *   - "ghost" : tiny inline text-only — for note rows / very compact spots.
 */

type Variant = "icon" | "chip" | "ghost";

type Props = {
  brand: string;
  name: string;
  /** When provided, modal opens instantly with this data — no fetch. */
  card?: PerfumeCardData | null;
  variant?: Variant;
  className?: string;
  /** Optional aria override (defaults to "Voir la carte de {brand} {name}"). */
  ariaLabel?: string;
};

export function CreateCardButton({
  brand,
  name,
  card,
  variant = "chip",
  className,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);

  function trigger(e: React.MouseEvent | React.PointerEvent) {
    // Defensive: stop event from bubbling into a parent <Link>, swipe
    // gesture, or flashcard flip handler.
    e.stopPropagation();
    e.preventDefault();
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={trigger}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={ariaLabel ?? `Voir la carte de ${brand} ${name}`}
        className={clsx(
          "group inline-flex items-center justify-center transition-all active:scale-95",
          variant === "icon" &&
            "w-8 h-8 rounded-full border border-outline-variant bg-background hover:border-primary text-on-background",
          variant === "chip" &&
            "gap-1.5 px-2.5 py-1 border border-outline-variant text-[10px] uppercase tracking-widest font-bold text-on-background hover:border-primary hover:bg-surface-container-low",
          variant === "ghost" &&
            "gap-1 text-[10px] uppercase tracking-widest font-bold text-outline hover:text-primary border-b border-transparent hover:border-primary pb-px",
          className,
        )}
      >
        <Icon
          name="style"
          size={variant === "icon" ? 14 : 12}
          className="flex-shrink-0"
        />
        {variant !== "icon" && <span>Carte</span>}
      </button>

      <PerfumeCardModal
        open={open}
        onClose={() => setOpen(false)}
        card={card ?? undefined}
        lookup={card ? undefined : { brand, name }}
      />
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Icon } from "@/components/Icon";
import { ErrorBubble } from "@/components/ErrorBubble";
import { PerfumeArtwork } from "@/components/PerfumeArtwork";
import { agentCard } from "@/lib/agent-client";
import { openConcierge } from "@/lib/concierge-bus";
import type { PerfumeCardData } from "@/lib/agent";

/**
 * Carte signée La Niche — rich modal that displays a perfume's olfactive
 * pyramid, dominant accords, profile, seasons and day/night signals.
 *
 * Two ways to feed the modal:
 *   1. `card` prop  — already-loaded rich data (preferred, instant render).
 *   2. `lookup` prop — { brand, name } pair → fetches via agentCard() on
 *      mount, shows a loading skeleton, falls back to the concierge CTA
 *      when nothing matches.
 *
 * Visual language: La Niche editorial (serif title, mono accents, tight
 * tracking, no shadows). Motion: bottom-sheet slide-up + staggered fade-in
 * of each section.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  card?: PerfumeCardData | null;
  lookup?: { brand: string; name: string };
};

export function PerfumeCardModal({ open, onClose, card, lookup }: Props) {
  const [mounted, setMounted] = useState(false);
  const [fetched, setFetched] = useState<PerfumeCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slide-up animation guard.
  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Lazy fetch when the parent only gave us a (brand, name) pair.
  useEffect(() => {
    if (!open) return;
    if (card) {
      setFetched(null);
      return;
    }
    if (!lookup) return;
    setLoading(true);
    setError(null);
    setFetched(null);
    let cancelled = false;
    agentCard(lookup.brand, lookup.name)
      .then((p) => {
        if (cancelled) return;
        setFetched(p);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "card lookup failed");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, card, lookup]);

  // Esc to close + lock body scroll.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const data = card ?? fetched;
  const fallbackName = lookup?.name ?? data?.name ?? "Parfum";
  const fallbackBrand = lookup?.brand ?? data?.brand ?? "Maison";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Carte ${fallbackBrand} ${fallbackName}`}
    >
      <div
        className="absolute inset-0 bg-on-background/55 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={onClose}
        aria-hidden
      />

      <article
        className={clsx(
          "perfume-card-sheet relative w-full max-w-md sm:max-w-lg max-h-[92dvh]",
          "bg-background border border-outline-variant shadow-2xl",
          "flex flex-col safe-bottom",
          "transition-transform transition-opacity duration-400 ease-out",
          mounted
            ? "translate-y-0 opacity-100"
            : "translate-y-full sm:translate-y-6 opacity-0",
        )}
      >
        {/* Drag handle (mobile bottom-sheet affordance) */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1 bg-outline-variant rounded-full" />
        </div>

        {/* Top bar */}
        <header className="px-5 pt-3 pb-3 flex items-center justify-between gap-3 border-b border-outline-variant/40 flex-shrink-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-outline">
            <Icon name="local_florist" size={12} />
            Carte signée La Niche
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center text-outline hover:text-on-background transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && !data ? (
            <CardSkeleton />
          ) : error && !data ? (
            <div className="p-6">
              <ErrorBubble
                detail={error}
                context="Carte parfum"
                variant="block"
              />
            </div>
          ) : !data ? (
            <CardNotFound
              brand={fallbackBrand}
              name={fallbackName}
              onAskConcierge={() => {
                openConcierge({
                  message: `Trouve-moi le parfum « ${fallbackBrand} — ${fallbackName} ». La carte est vide.`,
                });
                onClose();
              }}
            />
          ) : (
            <CardBody data={data} />
          )}
        </div>

        {/* Footer signature */}
        <footer className="px-5 py-3 border-t border-outline-variant/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-container-low border border-outline-variant flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-laniche.png"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[9px] uppercase tracking-[0.3em] text-outline font-mono">
              by La Niche
            </span>
          </div>
          {data?.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-widest font-bold text-outline hover:text-on-background flex items-center gap-1"
            >
              Source
              <Icon name="open_in_new" size={11} />
            </a>
          )}
        </footer>
      </article>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Body — title, hero, accords, pyramid, profile, day/night, seasons.
 * --------------------------------------------------------------------- */

function CardBody({ data }: { data: PerfumeCardData }) {
  return (
    <div className="flex flex-col">
      {/* HERO — image + title block */}
      <section className="card-section relative px-5 pt-6 pb-5 bg-gradient-to-b from-surface-container-low to-background">
        <div className="flex gap-5 items-start">
          <div className="w-28 sm:w-32 aspect-[3/4] flex-shrink-0">
            <PerfumeArtwork
              brand={data.brand}
              name={data.name}
              imageUrl={data.image_url}
              variant="thumb"
              showSoonCaption={false}
              className="w-full h-full"
            />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-outline mb-1">
              {data.brand}
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif italic font-light tracking-tight leading-[1.05]">
              {data.name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {data.gender && (
                <span className="text-[9px] uppercase tracking-widest font-bold border border-outline-variant px-2 py-0.5">
                  {data.gender}
                </span>
              )}
              {data.family && (
                <span className="text-[9px] uppercase tracking-widest font-bold bg-on-background text-background px-2 py-0.5">
                  {data.family}
                </span>
              )}
            </div>
            {data.rating !== null && (
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <RatingStars value={data.rating} />
                <span className="font-mono font-bold">
                  {data.rating.toFixed(1)}
                </span>
                {data.reviews_count !== null && (
                  <span className="text-outline">
                    ({data.reviews_count.toLocaleString("fr-FR")})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {data.description && (
        <section className="card-section px-5 py-4 border-t border-outline-variant/30">
          <p className="text-[12px] text-on-surface-variant leading-relaxed italic">
            « {data.description.length > 220
              ? `${data.description.slice(0, 217)}…`
              : data.description} »
          </p>
        </section>
      )}

      {/* ACCORDS — colored bars, fragrantica style but cleaner */}
      {data.accords.length > 0 && (
        <section className="card-section px-5 py-5 border-t border-outline-variant/30">
          <SectionLabel index="01" label="Accords dominants" />
          <ul className="flex flex-col gap-1.5">
            {data.accords.slice(0, 6).map((a, i) => (
              <AccordBar
                key={a.name}
                name={a.name}
                weight={a.weight ?? Math.max(40, 100 - i * 12)}
                index={i}
              />
            ))}
          </ul>
        </section>
      )}

      {/* PYRAMIDE — top / cœur / fond */}
      {(data.notes.top.length > 0 ||
        data.notes.middle.length > 0 ||
        data.notes.base.length > 0) && (
        <section className="card-section px-5 py-5 border-t border-outline-variant/30">
          <SectionLabel index="02" label="Pyramide olfactive" />
          <div className="flex flex-col gap-3">
            <NoteLayer
              tier="Tête"
              notes={data.notes.top}
              accent="from-amber-200/40 to-transparent"
            />
            <NoteLayer
              tier="Cœur"
              notes={data.notes.middle}
              accent="from-rose-200/40 to-transparent"
            />
            <NoteLayer
              tier="Fond"
              notes={data.notes.base}
              accent="from-stone-300/40 to-transparent"
            />
          </div>
        </section>
      )}

      {/* PROFIL — longévité + sillage */}
      {(data.longevity || data.sillage) && (
        <section className="card-section px-5 py-5 border-t border-outline-variant/30">
          <SectionLabel index="03" label="Profil" />
          <div className="grid grid-cols-2 gap-px bg-outline-variant/40 border border-outline-variant">
            {data.longevity && (
              <Stat
                icon="schedule"
                label="Tenue"
                value={data.longevity}
              />
            )}
            {data.sillage && (
              <Stat
                icon="graphic_eq"
                label="Sillage"
                value={data.sillage}
              />
            )}
          </div>
        </section>
      )}

      {/* DAY / NIGHT */}
      {data.day_time.length > 0 && (
        <section className="card-section px-5 py-5 border-t border-outline-variant/30">
          <SectionLabel index="04" label="Moment de port" />
          <div className="grid grid-cols-2 gap-px bg-outline-variant/40 border border-outline-variant">
            <DayNightCell
              icon="light_mode"
              label="Jour"
              active={data.day_time.includes("day")}
            />
            <DayNightCell
              icon="dark_mode"
              label="Nuit"
              active={data.day_time.includes("night")}
            />
          </div>
        </section>
      )}

      {/* SAISONS */}
      {data.seasons.length > 0 && (
        <section className="card-section px-5 py-5 pb-7 border-t border-outline-variant/30">
          <SectionLabel index="05" label="Saisons" />
          <div className="grid grid-cols-2 gap-px bg-outline-variant/40 border border-outline-variant">
            <SeasonCell
              label="Hiver"
              icon="ac_unit"
              active={data.seasons.includes("winter")}
            />
            <SeasonCell
              label="Printemps"
              icon="local_florist"
              active={data.seasons.includes("spring")}
            />
            <SeasonCell
              label="Été"
              icon="wb_sunny"
              active={data.seasons.includes("summer")}
            />
            <SeasonCell
              label="Automne"
              icon="park"
              active={data.seasons.includes("autumn")}
            />
          </div>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Sub-pieces
 * --------------------------------------------------------------------- */

function SectionLabel({
  index,
  label,
}: {
  index: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-primary font-mono text-[11px]">{index}</span>
      <div className="h-px flex-1 bg-outline-variant" />
      <h3 className="text-[10px] uppercase font-bold tracking-widest">
        {label}
      </h3>
    </div>
  );
}

const ACCORD_COLORS: Record<string, string> = {
  // Sweet / gourmand
  vanilla: "bg-amber-100 text-amber-950",
  sweet: "bg-rose-300 text-rose-950",
  caramel: "bg-amber-200 text-amber-950",
  gourmand: "bg-rose-200 text-rose-950",
  // Amber / oriental
  amber: "bg-amber-700 text-amber-50",
  oriental: "bg-orange-800 text-orange-50",
  warm: "bg-orange-700 text-orange-50",
  // Powder
  powdery: "bg-stone-200 text-stone-900",
  iris: "bg-stone-300 text-stone-900",
  // Musk / animal
  musky: "bg-stone-400 text-stone-50",
  leather: "bg-amber-900 text-amber-50",
  animal: "bg-stone-700 text-stone-50",
  // Woody
  woody: "bg-yellow-900 text-yellow-50",
  cedar: "bg-yellow-800 text-yellow-50",
  sandalwood: "bg-amber-300 text-amber-950",
  // Floral
  floral: "bg-pink-200 text-pink-950",
  rose: "bg-rose-400 text-rose-50",
  jasmine: "bg-pink-100 text-pink-950",
  // Citrus / fresh
  citrus: "bg-yellow-200 text-yellow-950",
  fresh: "bg-cyan-200 text-cyan-950",
  aquatic: "bg-sky-300 text-sky-950",
  green: "bg-emerald-300 text-emerald-950",
  // Spicy
  spicy: "bg-red-700 text-red-50",
  cinnamon: "bg-orange-700 text-orange-50",
  // Smoky
  smoky: "bg-zinc-700 text-zinc-50",
  tobacco: "bg-amber-950 text-amber-50",
  oud: "bg-stone-800 text-stone-50",
  // Fruity
  fruity: "bg-pink-300 text-pink-950",
};

function accordColorClass(name: string): string {
  const k = name.toLowerCase().split(/\s+/)[0];
  return (
    ACCORD_COLORS[k] ??
    ACCORD_COLORS[name.toLowerCase()] ??
    "bg-on-background text-background"
  );
}

function AccordBar({
  name,
  weight,
  index,
}: {
  name: string;
  weight: number;
  index: number;
}) {
  const w = Math.max(20, Math.min(100, weight));
  return (
    <li
      className="accord-bar-anim relative h-7 bg-surface-container-low overflow-hidden"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div
        className={clsx(
          "absolute inset-y-0 left-0 flex items-center px-3",
          accordColorClass(name),
        )}
        style={{
          width: `${w}%`,
          // Springy width-in animation via CSS var consumed by .accord-bar-anim
          ["--target-width" as string]: `${w}%`,
        }}
      >
        <span className="text-[11px] font-semibold tracking-tight uppercase">
          {name}
        </span>
      </div>
    </li>
  );
}

function NoteLayer({
  tier,
  notes,
  accent,
}: {
  tier: string;
  notes: string[];
  accent: string;
}) {
  if (notes.length === 0) return null;
  return (
    <div className="relative pl-4">
      <span
        className={`absolute left-0 top-1 bottom-1 w-1 bg-gradient-to-b ${accent}`}
        aria-hidden
      />
      <p className="text-[9px] uppercase tracking-widest text-outline mb-1.5 font-mono">
        {tier}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {notes.map((n) => (
          <span
            key={n}
            className="text-[10px] uppercase tracking-widest font-medium border border-outline-variant px-2 py-0.5 bg-background"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-background py-4 px-3 flex flex-col items-center text-center">
      <Icon name={icon} size={16} className="text-outline mb-1" />
      <p className="text-[9px] uppercase tracking-widest text-outline">
        {label}
      </p>
      <p className="text-sm font-bold tracking-tight mt-0.5">{value}</p>
    </div>
  );
}

function DayNightCell({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={clsx(
        "py-4 flex flex-col items-center transition-colors duration-300",
        active ? "bg-on-background text-background" : "bg-background opacity-40",
      )}
    >
      <Icon name={icon} size={18} filled={active} />
      <p className="text-[10px] uppercase tracking-widest font-bold mt-1">
        {label}
      </p>
    </div>
  );
}

function SeasonCell({
  label,
  icon,
  active,
}: {
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <div
      className={clsx(
        "py-3 flex items-center justify-center gap-2 transition-colors duration-300",
        active ? "bg-primary text-on-primary" : "bg-background opacity-40",
      )}
    >
      <Icon name={icon} size={14} />
      <span className="text-[10px] uppercase tracking-widest font-bold">
        {label}
      </span>
    </div>
  );
}

function RatingStars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="flex gap-0.5" aria-label={`Note ${value} sur 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const name =
          i < full ? "star" : i === full && half ? "star_half" : "star_outline";
        return (
          <Icon
            key={i}
            name={name}
            size={13}
            filled={i < full || (i === full && half)}
            className={i < full || (i === full && half) ? "text-primary" : "text-outline"}
          />
        );
      })}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Loading + empty states
 * --------------------------------------------------------------------- */

function CardSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex gap-4">
        <div className="w-28 aspect-[3/4] shimmer-bar" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 shimmer-bar" />
          <div className="h-6 w-3/4 shimmer-bar" />
          <div className="h-3 w-1/2 shimmer-bar mt-3" />
        </div>
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 shimmer-bar" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3 w-1/4 shimmer-bar" />
        <div className="h-12 shimmer-bar" />
      </div>
    </div>
  );
}

function CardNotFound({
  brand,
  name,
  onAskConcierge,
}: {
  brand: string;
  name: string;
  onAskConcierge: () => void;
}) {
  return (
    <div className="p-8 text-center flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container-low border border-outline-variant flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-laniche.png"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight">
          Aucune carte pour
        </p>
        <p className="text-base font-serif italic mt-0.5">
          {brand} — {name}
        </p>
      </div>
      <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
        Notre base ne connaît pas encore ce parfum. La conciergerie La Niche
        peut le rechercher pour toi.
      </p>
      <button
        type="button"
        onClick={onAskConcierge}
        className="px-5 py-2.5 bg-primary text-on-primary rounded-full text-[10px] uppercase tracking-widest font-bold active:scale-95 transition-transform flex items-center gap-2"
      >
        <Icon name="forum" size={14} />
        Demander à la conciergerie
      </button>
    </div>
  );
}
